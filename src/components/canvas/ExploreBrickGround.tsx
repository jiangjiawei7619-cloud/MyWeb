import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GROUND_HALF_EXTENT } from '@/physics/createPhysicsWorld';
import { EXPLORE_GROUND_REFLECTION } from '@/lib/explore-ground-reflection';
import { EXPLORE_LIGHTING } from '@/lib/explore-lighting';
import { createExploreGroundTextures } from '@/utils/groundTextures';
import { createWalledBeveledTileGeometry } from '@/utils/beveledTileGeometry';

const { bricks, grout } = EXPLORE_GROUND_REFLECTION;
const BRICK_EXTENT = GROUND_HALF_EXTENT;

let sharedBrickEnvMap: THREE.Texture | null = null;

function getSharedBrickEnvMap(gl: THREE.WebGLRenderer) {
  if (sharedBrickEnvMap) return sharedBrickEnvMap;
  const pmrem = new THREE.PMREMGenerator(gl);
  pmrem.compileEquirectangularShader();
  const probe = new THREE.Scene();
  probe.background = new THREE.Color(EXPLORE_LIGHTING.background);
  sharedBrickEnvMap = pmrem.fromScene(probe, 0, 0.1, 100).texture;
  pmrem.dispose();
  return sharedBrickEnvMap;
}

function hash2(tx: number, tz: number) {
  const n = Math.sin(tx * 127.1 + tz * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

type TileInstance = {
  x: number;
  z: number;
  yOffset: number;
  shade: number;
};

type GapInstance = {
  x: number;
  z: number;
  sx: number;
  sz: number;
};

function buildTileInstances(extent: number): TileInstance[] {
  const pitch = bricks.tileSize + bricks.gap;
  const tiles: TileInstance[] = [];

  for (let tz = -extent; tz < extent; tz += pitch) {
    for (let tx = -extent; tx < extent; tx += pitch) {
      const jitter = (hash2(tx, tz) - 0.5) * bricks.heightJitter;
      const shade = 0.9 + hash2(tx + 17, tz + 31) * 0.1;
      tiles.push({
        x: tx + bricks.tileSize * 0.5,
        z: tz + bricks.tileSize * 0.5,
        yOffset: jitter,
        shade,
      });
    }
  }

  return tiles;
}

function buildGapInstances(extent: number): GapInstance[] {
  const pitch = bricks.tileSize + bricks.gap;
  const gaps: GapInstance[] = [];

  for (let tz = -extent; tz < extent - bricks.tileSize; tz += pitch) {
    const z = tz + bricks.tileSize + bricks.gap * 0.5;
    for (let tx = -extent; tx < extent; tx += pitch) {
      gaps.push({
        x: tx + pitch * 0.5,
        z,
        sx: bricks.tileSize,
        sz: bricks.gap,
      });
    }
  }

  for (let tx = -extent; tx < extent - bricks.tileSize; tx += pitch) {
    const x = tx + bricks.tileSize + bricks.gap * 0.5;
    for (let tz = -extent; tz < extent; tz += pitch) {
      gaps.push({
        x,
        z: tz + pitch * 0.5,
        sx: bricks.gap,
        sz: bricks.tileSize,
      });
    }
  }

  return gaps;
}

function applyInstanceMatrices(
  mesh: THREE.InstancedMesh,
  items: { x: number; z: number; sx?: number; sz?: number; sy?: number; y?: number }[],
) {
  const dummy = new THREE.Object3D();
  items.forEach((item, i) => {
    dummy.position.set(item.x, item.y ?? 0, item.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

/** SASMy 风格砖块地面 — 砖块层 + 暗色砖缝层 */
export default function ExploreBrickGround() {
  const brickRef = useRef<THREE.InstancedMesh>(null);
  const groutRef = useRef<THREE.InstancedMesh>(null);
  const { gl } = useThree();

  const tiles = useMemo(() => buildTileInstances(BRICK_EXTENT), []);
  const gaps = useMemo(() => buildGapInstances(BRICK_EXTENT), []);

  const maps = useMemo(() => createExploreGroundTextures(BRICK_EXTENT), []);

  const envMap = useMemo(() => getSharedBrickEnvMap(gl), [gl]);

  const brickGeometry = useMemo(
    () =>
      createWalledBeveledTileGeometry(
        bricks.tileSize,
        bricks.tileSize,
        bricks.thickness,
        bricks.bevelRadius,
        bricks.wallSkirtHeight,
        bricks.wallSkirtThickness,
      ),
    [],
  );

  const groutGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const brickMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(bricks.color),
        emissive: new THREE.Color(bricks.emissive),
        emissiveIntensity: bricks.emissiveIntensity,
        metalness: bricks.metalness,
        roughness: bricks.roughness,
        clearcoat: bricks.clearcoat,
        clearcoatRoughness: bricks.clearcoatRoughness,
        map: maps.colorMap,
        normalMap: maps.normalMap,
        roughnessMap: maps.roughnessMap,
        metalnessMap: maps.metalnessMap,
        envMap,
        envMapIntensity: bricks.envMapIntensity,
        toneMapped: false,
      }),
    [envMap, maps],
  );

  const groutMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(grout.color),
        transparent: true,
        opacity: grout.opacity,
        toneMapped: true,
        depthWrite: true,
      }),
    [],
  );

  useEffect(() => {
    const mesh = brickRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    tiles.forEach((tile, i) => {
      dummy.position.set(tile.x, tile.yOffset, tile.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      color.setRGB(tile.shade, tile.shade * 0.98, tile.shade * 1.02);
      mesh.setColorAt(i, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tiles]);

  useEffect(() => {
    const groutMesh = groutRef.current;
    if (!groutMesh) return;

    applyInstanceMatrices(
      groutMesh,
      gaps.map((g) => ({
        x: g.x,
        z: g.z,
        sx: g.sx,
        sy: grout.height,
        sz: g.sz,
        y: grout.y,
      })),
    );
    groutMesh.computeBoundingSphere();
  }, [gaps]);

  if (tiles.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={groutRef}
        args={[groutGeometry, groutMaterial, gaps.length]}
        frustumCulled={false}
        renderOrder={1}
      />

      <instancedMesh
        ref={brickRef}
        args={[brickGeometry, brickMaterial, tiles.length]}
        frustumCulled={false}
        renderOrder={4}
        receiveShadow
      />
    </group>
  );
}

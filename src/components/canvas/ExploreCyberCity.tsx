import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EXPLORE_CITY_PALETTE } from '@/lib/explore-city-palette';
import {
  generateExploreCity,
  type ExploreBuilding,
  type ExploreDualPylon,
  type ExploreNeonSign,
  type ExplorePylon,
} from '@/lib/explore-city-layout';
import { EXPLORE_GROUND_REFLECTION, createBrickGridUniforms, createExploreMirrorUniforms } from '@/lib/explore-ground-reflection';
import FloorLightingAccents from '@/components/canvas/FloorLightingAccents';
import ExploreWorldLabels from '@/components/canvas/ExploreWorldLabels';
import { isWorldLabelsEnabled } from '@/lib/explore-world-labels';
import { POSTER_GLITCH_BURST } from '@/lib/explore-poster-glitch';
import {
  createBuildingTextureUniforms,
  getBuildingTextureUrls,
  mapLoadedBuildingTextures,
} from '@/lib/explore-building-textures';
import {
  createHybridNeonPosterAtlas,
  getPosterAtlasCellSize,
  GLITCH_POSTER_COLS,
} from '@/lib/explore-neon-atlas';
import {
  exploreCityAntennaFrag,
  exploreCityAntennaVert,
  exploreCityBuildingFrag,
  exploreCityBuildingVert,
  exploreCityPoolFrag,
  exploreCityPoolVert,
  exploreNeonSignFrag,
  exploreNeonSignVert,
} from '@/shaders/exploreCity.glsl';

const { mirrorLayer, groundMode, cyberTiles } = EXPLORE_GROUND_REFLECTION;
const mirrorUniforms = createExploreMirrorUniforms();
const brickGridUniforms = createBrickGridUniforms();
/** cyber 模式默认保留几何镜像，补足霓虹 emissive 倒影 */
const useGeometricMirrors =
  groundMode === 'legacy' || cyberTiles.hybridGeometricMirrors;

function buildSignGeometry(signs: ExploreNeonSign[]) {
  const count = signs.length;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const c = signs[i]!.color;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const g = new THREE.PlaneGeometry(1, 1);
  g.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(Float32Array.from(signs.map((s) => s.seed)), 1));
  g.setAttribute(
    'aPosterIndex',
    new THREE.InstancedBufferAttribute(Float32Array.from(signs.map((s) => s.posterIndex)), 1),
  );
  g.setAttribute(
    'aGlitchEnabled',
    new THREE.InstancedBufferAttribute(
      Float32Array.from(signs.map((s) => (s.glitchEnabled ? 1 : 0))),
      1,
    ),
  );
  g.setAttribute(
    'aGlitchMode',
    new THREE.InstancedBufferAttribute(Float32Array.from(signs.map((s) => s.glitchMode)), 1),
  );
  g.setAttribute(
    'aGlitchInterval',
    new THREE.InstancedBufferAttribute(Float32Array.from(signs.map((s) => s.glitchInterval)), 1),
  );
  g.setAttribute(
    'aGlitchPhase',
    new THREE.InstancedBufferAttribute(Float32Array.from(signs.map((s) => s.glitchPhase)), 1),
  );
  return g;
}

function buildSignMatrices(signs: ExploreNeonSign[], mirror = false) {
  const dummy = new THREE.Object3D();
  return signs.map((s) => {
    const y = mirror ? -s.y : s.y;
    const sy = mirror ? -s.h : s.h;
    dummy.position.set(s.x, y, s.z);
    dummy.rotation.set(0, s.rotationY, 0);
    dummy.scale.set(s.w, sy, 1);
    dummy.updateMatrix();
    return dummy.matrix.clone();
  });
}

function ExploreBuildings({
  buildings,
  uniforms,
}: {
  buildings: ExploreBuilding[];
  uniforms: Record<string, THREE.IUniform>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = buildings.length;

  const seeds = useMemo(() => Float32Array.from(buildings.map((b) => b.seed)), [buildings]);
  const heights = useMemo(() => Float32Array.from(buildings.map((b) => b.h)), [buildings]);
  const types = useMemo(() => Float32Array.from(buildings.map((b) => b.type)), [buildings]);
  const materials = useMemo(() => Float32Array.from(buildings.map((b) => b.material)), [buildings]);

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    g.setAttribute('aHeight', new THREE.InstancedBufferAttribute(heights, 1));
    g.setAttribute('aType', new THREE.InstancedBufferAttribute(types, 1));
    g.setAttribute('aMaterial', new THREE.InstancedBufferAttribute(materials, 1));
    return g;
  }, [seeds, heights, types, materials]);

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return buildings.map((b) => {
      dummy.position.set(b.x, b.yBase + b.h / 2, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [buildings]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: exploreCityBuildingVert,
        fragmentShader: exploreCityBuildingFrag,
        toneMapped: false,
      }),
    [uniforms],
  );

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} renderOrder={2} />;
}

/** 楼宇地面下翻转镜像 — 与 CyberGrid City reflectRef 相同 */
function ExploreBuildingReflect({
  buildings,
  uniforms,
  surfacePass = false,
}: {
  buildings: ExploreBuilding[];
  uniforms: Record<string, THREE.IUniform>;
  surfacePass?: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = buildings.length;

  const seeds = useMemo(() => Float32Array.from(buildings.map((b) => b.seed)), [buildings]);
  const heights = useMemo(() => Float32Array.from(buildings.map((b) => b.h)), [buildings]);
  const types = useMemo(() => Float32Array.from(buildings.map((b) => b.type)), [buildings]);
  const materials = useMemo(() => Float32Array.from(buildings.map((b) => b.material)), [buildings]);

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    g.setAttribute('aHeight', new THREE.InstancedBufferAttribute(heights, 1));
    g.setAttribute('aType', new THREE.InstancedBufferAttribute(types, 1));
    g.setAttribute('aMaterial', new THREE.InstancedBufferAttribute(materials, 1));
    return g;
  }, [seeds, heights, types, materials]);

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return buildings.map((b) => {
      const cy = b.yBase + b.h / 2;
      dummy.position.set(b.x, -cy, b.z);
      dummy.scale.set(b.w, -b.h, b.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [buildings]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  const reflectUniforms = useMemo(() => {
    const u = { ...uniforms };
    u.uReflect = { value: 1 };
    u.uReflectGain = { value: mirrorLayer.buildingReflectGain };
    u.uReflectBoost = { value: mirrorLayer.buildingReflectBoost };
    u.uNeonReflect = { value: mirrorLayer.buildingNeonReflect };
    u.uReflectSurfacePass = { value: surfacePass ? 1 : 0 };
    Object.assign(u, mirrorUniforms);
    return u;
  }, [uniforms, surfacePass]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: reflectUniforms,
        vertexShader: exploreCityBuildingVert,
        fragmentShader: exploreCityBuildingFrag,
        transparent: true,
        depthWrite: false,
        depthTest: !surfacePass,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [reflectUniforms, surfacePass],
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
      renderOrder={surfacePass ? 10 : 0}
    />
  );
}

function ExplorePylons({ pylons }: { pylons: ExplorePylon[] }) {
  const count = pylons.length;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return pylons.map((p) => {
      const size = p.poleRadius * 2;
      dummy.position.set(p.x, p.poleHeight / 2, p.z);
      dummy.scale.set(size, p.poleHeight, size);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [pylons]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x050508 }), []);

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} renderOrder={2} />
  );
}

/** 双细柱角落地标 — 每座两根立柱撑一块大广告牌 */
function ExploreDualPylons({ dualPylons }: { dualPylons: ExploreDualPylon[] }) {
  const count = dualPylons.length * 2;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const result: THREE.Matrix4[] = [];
    for (const p of dualPylons) {
      const size = p.poleRadius * 2;
      const halfSpacing = p.poleSpacing * 0.5;
      const widthX = Math.cos(p.rotationY);
      const widthZ = -Math.sin(p.rotationY);
      for (const side of [-1, 1] as const) {
        dummy.position.set(
          p.x + widthX * halfSpacing * side,
          p.poleHeight / 2,
          p.z + widthZ * halfSpacing * side,
        );
        dummy.scale.set(size, p.poleHeight, size);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        result.push(dummy.matrix.clone());
      }
    }
    return result;
  }, [dualPylons]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x050508 }), []);

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} renderOrder={2} />
  );
}

function ExploreAntennas({
  buildings,
  uniforms,
}: {
  buildings: ExploreBuilding[];
  uniforms: Record<string, THREE.IUniform>;
}) {
  const antennaBuildings = useMemo(() => buildings.filter((b) => b.antenna), [buildings]);
  const count = antennaBuildings.length;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const seeds = useMemo(() => Float32Array.from(antennaBuildings.map((b) => b.seed)), [antennaBuildings]);

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    return g;
  }, [seeds]);

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return antennaBuildings.map((b) => {
      dummy.position.set(b.x, b.yBase + b.h + 1.8, b.z);
      dummy.scale.set(0.35, 3.6, 0.35);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [antennaBuildings]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: exploreCityAntennaVert,
        fragmentShader: exploreCityAntennaFrag,
      }),
    [uniforms],
  );

  if (count === 0) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />;
}

function ExploreLightPools({
  buildings,
  uniforms,
}: {
  buildings: ExploreBuilding[];
  uniforms: Record<string, THREE.IUniform>;
}) {
  const poolBuildings = useMemo(() => buildings.filter((b) => !b.isTier && b.yBase === 0), [buildings]);
  const count = poolBuildings.length;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const heights = useMemo(() => Float32Array.from(poolBuildings.map((b) => b.h)), [poolBuildings]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.setAttribute('aHeight', new THREE.InstancedBufferAttribute(heights, 1));
    return g;
  }, [heights]);

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return poolBuildings.map((b) => {
      const poolSize = Math.max(b.w, b.d) * 1.15;
      dummy.position.set(b.x, 0.018, b.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(poolSize, poolSize, 1);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [poolBuildings]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: exploreCityPoolVert,
        fragmentShader: exploreCityPoolFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [uniforms],
  );

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} renderOrder={1} />
  );
}

/** 霓虹灯牌地面镜像 — 透明招牌 FBO 反射不可靠，用几何翻转 */
function ExploreNeonSignReflect({
  signs,
  uniforms,
  surfacePass = false,
}: {
  signs: ExploreNeonSign[];
  uniforms: Record<string, THREE.IUniform>;
  /** 砖面之上叠绘倒影（关闭深度测试，避免被不透明砖块挡住） */
  surfacePass?: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = signs.length;

  const geometry = useMemo(() => buildSignGeometry(signs), [signs]);
  const matrices = useMemo(() => buildSignMatrices(signs, true), [signs]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  const reflectUniforms = useMemo(() => {
    const u = { ...uniforms };
    u.uReflect = { value: 1 };
    u.uReflectGain = { value: mirrorLayer.signReflectGain };
    u.uReflectBoost = { value: mirrorLayer.signReflectBoost };
    u.uReflectSurfacePass = { value: surfacePass ? 1 : 0 };
    Object.assign(u, mirrorUniforms);
    return u;
  }, [uniforms, surfacePass]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: reflectUniforms,
        vertexShader: exploreNeonSignVert,
        fragmentShader: exploreNeonSignFrag,
        transparent: true,
        depthWrite: false,
        depthTest: !surfacePass,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [reflectUniforms, surfacePass],
  );

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
      renderOrder={surfacePass ? 10 : 0}
    />
  );
}

function ExploreNeonSigns({
  signs,
  uniforms,
}: {
  signs: ExploreNeonSign[];
  uniforms: Record<string, THREE.IUniform>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = signs.length;

  const geometry = useMemo(() => buildSignGeometry(signs), [signs]);
  const matrices = useMemo(() => buildSignMatrices(signs, false), [signs]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: exploreNeonSignVert,
        fragmentShader: exploreNeonSignFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [uniforms],
  );

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} renderOrder={3} />
  );
}

/** 带贴图的街区主体 — Suspense 边界内，贴图预热后几乎即时出现 */
function ExploreCyberCityTextured({
  buildings,
  signs,
  pylons,
  dualPylons,
  showWorldLabels,
  posterAtlas,
}: {
  buildings: ExploreBuilding[];
  signs: ExploreNeonSign[];
  pylons: ExplorePylon[];
  dualPylons: ExploreDualPylon[];
  showWorldLabels: boolean;
  posterAtlas: THREE.Texture | null;
}) {
  const { camera } = useThree();

  const loadedBuildingTextures = useLoader(THREE.TextureLoader, getBuildingTextureUrls());
  const buildingTextureUniforms = useMemo(() => {
    const set = mapLoadedBuildingTextures(loadedBuildingTextures);
    return createBuildingTextureUniforms(set);
  }, [loadedBuildingTextures]);

  const buildingUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEmber: { value: new THREE.Color(EXPLORE_CITY_PALETTE.ember) },
      uAmber: { value: new THREE.Color(EXPLORE_CITY_PALETTE.amber) },
      uAccent: { value: new THREE.Color(EXPLORE_CITY_PALETTE.accent) },
      uFog: { value: new THREE.Color(EXPLORE_CITY_PALETTE.fog) },
      uIntensity: { value: EXPLORE_CITY_PALETTE.intensity },
      uReflect: { value: 0 },
      uReflectBoost: { value: 1 },
      uReflectGain: { value: 1 },
      uNeonReflect: { value: 0 },
      ...mirrorUniforms,
      ...brickGridUniforms,
      ...buildingTextureUniforms,
    }),
    [buildingTextureUniforms],
  );

  const antennaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmber: { value: new THREE.Color(EXPLORE_CITY_PALETTE.amber) },
    }),
    [],
  );

  const poolUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(EXPLORE_CITY_PALETTE.amber) },
    }),
    [],
  );

  const atlasCell = useMemo(() => getPosterAtlasCellSize(), []);

  const signUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReflect: { value: 0 },
      uReflectBoost: { value: 1 },
      uReflectGain: { value: 1 },
      ...mirrorUniforms,
      ...brickGridUniforms,
      uGlitchDuration: { value: POSTER_GLITCH_BURST.duration },
      uGlitchSteps: { value: POSTER_GLITCH_BURST.steps },
      uGlitchEnableRatio: { value: POSTER_GLITCH_BURST.enableRatio },
      uGlitchIntervalMin: { value: POSTER_GLITCH_BURST.intervalMin },
      uGlitchIntervalSpan: { value: POSTER_GLITCH_BURST.intervalSpan },
      uParallaxStrength: { value: POSTER_GLITCH_BURST.parallaxStrength },
      uRgbLayerDepth: { value: POSTER_GLITCH_BURST.rgbLayerDepth },
      uScanlineLift: { value: POSTER_GLITCH_BURST.scanlineLift },
      uBlockPeelStrength: { value: POSTER_GLITCH_BURST.blockPeelStrength },
      uPosterAtlas: { value: posterAtlas ?? new THREE.Texture() },
      uAtlasCell: { value: atlasCell.clone() },
      uAtlasCols: { value: GLITCH_POSTER_COLS },
      uSignBloomBoost: { value: 0.82 },
      uSignOuterGlow: { value: 1.15 },
    }),
    [posterAtlas, atlasCell],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    buildingUniforms.uTime.value = t;
    antennaUniforms.uTime.value = t;
    poolUniforms.uTime.value = t;
    signUniforms.uTime.value = t;
    (buildingUniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
    (signUniforms.uCamPos.value as THREE.Vector3).copy(camera.position);

    const debugDistort =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('debugDistortedReflection') === '1';
    brickGridUniforms.uDebugDistortedReflection.value = debugDistort ? 1 : 0;
  });

  return (
    <group>
      {useGeometricMirrors && (
        <>
          <ExploreBuildingReflect buildings={buildings} uniforms={buildingUniforms} />
          {posterAtlas && <ExploreNeonSignReflect signs={signs} uniforms={signUniforms} />}
        </>
      )}
      <FloorLightingAccents buildings={buildings} signs={signs} pylons={pylons} dualPylons={dualPylons} />
      <ExploreLightPools buildings={buildings} uniforms={poolUniforms} />
      <ExploreBuildings buildings={buildings} uniforms={buildingUniforms} />
      <ExplorePylons pylons={pylons} />
      <ExploreDualPylons dualPylons={dualPylons} />
      <ExploreAntennas buildings={buildings} uniforms={antennaUniforms} />
      {posterAtlas && <ExploreNeonSigns signs={signs} uniforms={signUniforms} />}
      {showWorldLabels && <ExploreWorldLabels buildings={buildings} signs={signs} />}
      {posterAtlas && useGeometricMirrors && (
        <>
          <ExploreBuildingReflect buildings={buildings} uniforms={buildingUniforms} surfacePass />
          <ExploreNeonSignReflect signs={signs} uniforms={signUniforms} surfacePass />
        </>
      )}
    </group>
  );
}

function ExploreCyberCityContent() {
  const { buildings, signs, pylons, dualPylons } = useMemo(() => generateExploreCity(), []);
  const showWorldLabels = useMemo(() => isWorldLabelsEnabled(), []);
  const [posterAtlas, setPosterAtlas] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let alive = true;
    createHybridNeonPosterAtlas().then((tex) => {
      if (alive) setPosterAtlas(tex);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Suspense fallback={null}>
      <ExploreCyberCityTextured
        buildings={buildings}
        signs={signs}
        pylons={pylons}
        dualPylons={dualPylons}
        showWorldLabels={showWorldLabels}
        posterAtlas={posterAtlas}
      />
    </Suspense>
  );
}

export default function ExploreCyberCity() {
  return <ExploreCyberCityContent />;
}

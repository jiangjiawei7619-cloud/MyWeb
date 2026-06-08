import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toCreasedNormals } from 'three-stdlib';

const EPS = 0.00001;

function createTileShape(width: number, depth: number, radius0: number) {
  const shape = new THREE.Shape();
  const radius = radius0 - EPS;
  shape.absarc(EPS, EPS, EPS, -Math.PI / 2, -Math.PI, true);
  shape.absarc(EPS, depth - radius * 2, EPS, Math.PI, Math.PI / 2, true);
  shape.absarc(width - radius * 2, depth - radius * 2, EPS, Math.PI / 2, 0, true);
  shape.absarc(width - radius * 2, EPS, EPS, 0, -Math.PI / 2, true);
  return shape;
}

/** 厚地砖：顶面在 y=0，带倒角/圆角边（drei RoundedBox 同款挤出逻辑） */
export function createBeveledTileGeometry(
  width: number,
  depth: number,
  thickness: number,
  radius = 0.055,
  bevelSegments = 4,
  smoothness = 4,
  creaseAngle = 0.35,
) {
  const shape = createTileShape(width, depth, radius);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness - radius * 2,
    bevelEnabled: true,
    bevelSegments: bevelSegments * 2,
    steps: 1,
    bevelSize: radius - EPS,
    bevelThickness: radius,
    curveSegments: smoothness,
  });

  geometry.center();
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -thickness / 2, 0);
  toCreasedNormals(geometry, creaseAngle);
  geometry.computeVertexNormals();
  return geometry;
}

/** 带四向薄壁围挡的地砖 — 阻挡砖缝光侧向漏光 */
export function createWalledBeveledTileGeometry(
  width: number,
  depth: number,
  thickness: number,
  radius = 0.055,
  skirtHeight = 0.06,
  skirtThickness = 0.012,
) {
  const tile = createBeveledTileGeometry(width, depth, thickness, radius);
  const wallGeos: THREE.BufferGeometry[] = [tile];

  const addWall = (sx: number, sy: number, sz: number, px: number, py: number, pz: number) => {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate(px, py, pz);
    wallGeos.push(g);
  };

  const wallY = -skirtHeight * 0.5;
  const inset = skirtThickness * 0.5;
  addWall(width + skirtThickness * 2, skirtHeight, skirtThickness, 0, wallY, depth * 0.5 + inset);
  addWall(width + skirtThickness * 2, skirtHeight, skirtThickness, 0, wallY, -depth * 0.5 - inset);
  addWall(skirtThickness, skirtHeight, depth, width * 0.5 + inset, wallY, 0);
  addWall(skirtThickness, skirtHeight, depth, -width * 0.5 - inset, wallY, 0);

  const merged = mergeGeometries(wallGeos, false);
  wallGeos.forEach((g, i) => {
    if (i > 0) g.dispose();
  });
  if (!merged) return tile;
  merged.computeVertexNormals();
  return merged;
}

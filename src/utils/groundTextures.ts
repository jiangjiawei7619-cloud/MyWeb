import * as THREE from 'three';

const TEX_SIZE = 512;

/** 世界空间中每块地砖边长（米）— 与 ExploreBrickGround 砖缝对齐 */
export const GROUND_TILE_SIZE = 3.2;

export function getGroundTextureRepeat(halfExtent: number): number {
  return (halfExtent * 2) / GROUND_TILE_SIZE;
}

const TEX_TILES = 8;

function eachTile(
  ctx: CanvasRenderingContext2D,
  size: number,
  tiles: number,
  fn: (x: number, y: number, w: number, h: number, tx: number, ty: number) => void,
) {
  const cell = size / tiles;
  const pad = Math.max(2, Math.floor(cell * 0.04));
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      fn(tx * cell + pad, ty * cell + pad, cell - pad * 2, cell - pad * 2, tx, ty);
    }
  }
}

function paintGrout(ctx: CanvasRenderingContext2D, size: number, tiles: number) {
  const cell = size / tiles;
  const gap = Math.max(3, cell * 0.08);
  ctx.fillStyle = 'rgba(14, 12, 18, 0.95)';
  for (let i = 0; i < tiles; i++) {
    for (let j = 0; j < tiles; j++) {
      const x = i * cell;
      const y = j * cell;
      ctx.fillRect(x, y, cell, gap);
      ctx.fillRect(x, y, gap, cell);
    }
  }
}

function paintBeveledFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tx: number,
  ty: number,
) {
  const hash = Math.sin(tx * 127.1 + ty * 311.7) * 43758.5453;
  const n = hash - Math.floor(hash);
  const base = 30 + Math.floor(n * 8);
  const inset = Math.max(4, w * 0.07);

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, `rgb(${base + 4},${base},${base + 6})`);
  grad.addColorStop(0.42, `rgb(${base},${base - 2},${base + 2})`);
  grad.addColorStop(1, `rgb(${base - 3},${base - 4},${base - 1})`);
  ctx.fillStyle = grad;
  ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);

  const chamfer = ctx.createRadialGradient(x + w * 0.5, y + h * 0.5, w * 0.2, x + w * 0.5, y + h * 0.5, w * 0.56);
  chamfer.addColorStop(0, 'rgba(255,255,255,0.0)');
  chamfer.addColorStop(0.78, 'rgba(255,255,255,0.0)');
  chamfer.addColorStop(0.92, 'rgba(210,200,230,0.08)');
  chamfer.addColorStop(1, 'rgba(120,110,150,0.22)');
  ctx.fillStyle = chamfer;
  ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
}

/**
 * 颜色贴图：极低对比，只做轻微色调变化，避免像蒙版盖住反射。
 */
export function createGroundColorMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#222028';
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  eachTile(ctx, TEX_SIZE, TEX_TILES, (x, y, w, h, tx, ty) => {
    paintBeveledFace(ctx, x, y, w, h, tx, ty);
  });

  paintGrout(ctx, TEX_SIZE, TEX_TILES);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** 粗糙度：砖面更光滑（更暗）→ 镜面更清晰；砖缝更糙（更亮） */
export function createGroundRoughnessMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  eachTile(ctx, TEX_SIZE, TEX_TILES, (x, y, w, h) => {
    const inset = Math.max(4, w * 0.07);
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 0.58);
    g.addColorStop(0, '#0a0a0a');
    g.addColorStop(0.72, '#121212');
    g.addColorStop(0.9, '#3a3a3a');
    g.addColorStop(1, '#8a8a8a');
    ctx.fillStyle = g;
    ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  });

  paintGrout(ctx, TEX_SIZE, TEX_TILES);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** 金属度：砖面高金属 → 湿地反射更强 */
export function createGroundMetalnessMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#555555';
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  eachTile(ctx, TEX_SIZE, TEX_TILES, (x, y, w, h) => {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(x, y, w, h);
  });

  paintGrout(ctx, TEX_SIZE, TEX_TILES);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** 砖面倒角法线 — 边缘略抬升，过渡更丝滑 */
export function createGroundNormalMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;
  const cell = TEX_SIZE / TEX_TILES;

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  eachTile(ctx, TEX_SIZE, TEX_TILES, (x, y, w, h) => {
    const inset = Math.max(4, w * 0.07);
    const chamfer = ctx.createRadialGradient(x + w / 2, y + h / 2, w * 0.18, x + w / 2, y + h / 2, w * 0.56);
    chamfer.addColorStop(0, '#8080ff');
    chamfer.addColorStop(0.82, '#8080ff');
    chamfer.addColorStop(0.94, '#9aa0e8');
    chamfer.addColorStop(1, '#b8c0f0');
    ctx.fillStyle = chamfer;
    ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  });

  const gap = Math.max(3, cell * 0.08);
  ctx.fillStyle = 'rgba(96, 104, 180, 0.55)';
  for (let i = 0; i < TEX_TILES; i++) {
    for (let j = 0; j < TEX_TILES; j++) {
      const px = i * cell;
      const py = j * cell;
      ctx.fillRect(px, py, cell, gap);
      ctx.fillRect(px, py, gap, cell);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function configureRepeat(texture: THREE.Texture, halfExtent: number) {
  texture.repeat.set(getGroundTextureRepeat(halfExtent), getGroundTextureRepeat(halfExtent));
  return texture;
}

export function createExploreGroundTextures(halfExtent: number) {
  const colorMap = createGroundColorMap();
  const normalMap = createGroundNormalMap();
  const roughnessMap = createGroundRoughnessMap();
  const metalnessMap = createGroundMetalnessMap();

  for (const tex of [colorMap, normalMap, roughnessMap, metalnessMap]) {
    configureRepeat(tex, halfExtent);
  }

  return {
    colorMap,
    normalMap,
    roughnessMap,
    metalnessMap,
    tileRepeat: getGroundTextureRepeat(halfExtent),
  };
}

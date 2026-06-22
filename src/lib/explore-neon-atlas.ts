import * as THREE from 'three';
import {
  createGlitchPosterAtlas,
  getPosterAtlasCellSize,
  GLITCH_POSTER_COLS,
  GLITCH_POSTER_COUNT,
  GLITCH_POSTER_ROWS,
} from '@/utils/glitchPosterAtlas';

const CELL_W = 384;
const CELL_H = 512;
const NEON_POSTER_DIR = '/textures/neon-posters';

/** 霓虹图集槽位覆盖 — poster_09 换为 building01-b 实拍 */
const NEON_POSTER_OVERRIDES: Record<number, string> = {
  9: '/textures/neon-posters/poster_09.png',
};

let hybridAtlasCache: THREE.Texture | null = null;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const imageAspect = img.width / img.height;
  const cellAspect = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imageAspect > cellAspect) {
    sw = img.height * cellAspect;
    sx = (img.width - sw) * 0.5;
  } else {
    sh = img.width / cellAspect;
    sy = (img.height - sh) * 0.5;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/** Try loading real neon PNGs; fall back to procedural canvas cells */
export async function createHybridNeonPosterAtlas(): Promise<THREE.Texture> {
  if (hybridAtlasCache) return hybridAtlasCache;

  const procedural = createGlitchPosterAtlas();
  const atlasW = CELL_W * GLITCH_POSTER_COLS;
  const atlasH = CELL_H * GLITCH_POSTER_ROWS;
  const canvas = document.createElement('canvas');
  canvas.width = atlasW;
  canvas.height = atlasH;
  const ctx = canvas.getContext('2d')!;

  const procImg = procedural.image as HTMLCanvasElement;
  ctx.drawImage(procImg, 0, 0);

  let loadedCount = 0;
  const loads = Array.from({ length: GLITCH_POSTER_COUNT }, async (_, i) => {
    const padded = String(i).padStart(2, '0');
    const url = NEON_POSTER_OVERRIDES[i] ?? `${NEON_POSTER_DIR}/poster_${padded}.png`;
    const img = await loadImage(url);
    if (!img) return;
    const col = i % GLITCH_POSTER_COLS;
    const row = Math.floor(i / GLITCH_POSTER_COLS);
    drawImageCover(ctx, img, col * CELL_W, row * CELL_H, CELL_W, CELL_H);
    loadedCount += 1;
  });
  await Promise.all(loads);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  hybridAtlasCache = texture;

  if (loadedCount > 0) {
    console.info(`[EXPLORE] Neon atlas: ${loadedCount}/${GLITCH_POSTER_COUNT} real posters loaded`);
  }

  return texture;
}

export { getPosterAtlasCellSize, GLITCH_POSTER_COLS, GLITCH_POSTER_ROWS, GLITCH_POSTER_COUNT };

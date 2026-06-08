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
    const img = await loadImage(`${NEON_POSTER_DIR}/poster_${padded}.png`);
    if (!img) return;
    const col = i % GLITCH_POSTER_COLS;
    const row = Math.floor(i / GLITCH_POSTER_COLS);
    ctx.drawImage(img, col * CELL_W, row * CELL_H, CELL_W, CELL_H);
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
    console.info(`[EXPLORE] Neon atlas: ${loadedCount}/${GLITCH_POSTER_COUNT} real PNG posters loaded`);
  }

  return texture;
}

export { getPosterAtlasCellSize, GLITCH_POSTER_COLS, GLITCH_POSTER_ROWS, GLITCH_POSTER_COUNT };

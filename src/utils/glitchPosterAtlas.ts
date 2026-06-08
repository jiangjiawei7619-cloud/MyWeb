import * as THREE from 'three';

export const GLITCH_POSTER_COLS = 4;
export const GLITCH_POSTER_ROWS = 3;
export const GLITCH_POSTER_COUNT = GLITCH_POSTER_COLS * GLITCH_POSTER_ROWS;
const CELL_W = 384;
const CELL_H = 512;

type Rng = () => number;

function mulberry32(seed: number): Rng {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fillBase(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.38, 0, w * 0.5, h * 0.5, w * 0.72);
  g.addColorStop(0, `hsl(${hue}, 38%, 6%)`);
  g.addColorStop(0.45, `hsl(${hue + 10}, 32%, 3%)`);
  g.addColorStop(1, `hsl(${hue - 6}, 40%, 1.5%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function neonStroke(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  hue: number,
  rng: Rng,
) {
  ctx.font = `800 ${size | 0}px "Arial Black", "Impact", sans-serif`;
  const layers = [
    { blur: 28, alpha: 0.22, hueOff: -18, light: 58 },
    { blur: 14, alpha: 0.38, hueOff: -8, light: 62 },
    { blur: 6, alpha: 0.72, hueOff: 0, light: 68 },
    { blur: 0, alpha: 0.95, hueOff: 6, light: 88 },
  ];
  for (const layer of layers) {
    ctx.save();
    ctx.shadowBlur = layer.blur;
    ctx.shadowColor = `hsla(${hue + layer.hueOff}, 95%, ${layer.light}%, ${layer.alpha})`;
    ctx.fillStyle = `hsla(${hue + layer.hueOff + rng() * 4}, 92%, ${layer.light}%, ${layer.alpha})`;
    ctx.fillText(text, x + rng() * 2, y);
    ctx.restore();
  }
  ctx.fillStyle = `hsl(${hue + 4}, 18%, 96%)`;
  ctx.fillText(text, x, y - 1);
}

function scanlines(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.14) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
}

function noiseRects(ctx: CanvasRenderingContext2D, rng: Rng, w: number, h: number, count: number) {
  for (let i = 0; i < count; i++) {
    const rw = w * (0.08 + rng() * 0.45);
    const rh = h * (0.015 + rng() * 0.08);
    ctx.fillStyle = `rgba(${180 + rng() * 75 | 0},${20 + rng() * 40 | 0},${30 + rng() * 50 | 0},${0.25 + rng() * 0.55})`;
    ctx.fillRect(rng() * w, rng() * h, rw, rh);
  }
}

function paintTypography(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, lines: string[], baseHue = 355) {
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    const size = h * (0.11 + (i === 0 ? 0.06 : 0));
    const y = h * (0.22 + i * 0.19);
    neonStroke(ctx, line, w * 0.08, y, size, baseHue + i * 14, rng);
    if (rng() > 0.35) {
      neonStroke(ctx, line, w * 0.08 - 5, y - 3, size * 0.98, 195 + i * 8, rng);
    }
  });
}

function paintPoster0(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 350);
  paintTypography(ctx, w, h, rng, ['NEON', 'DRIFT', 'SYS//']);
  noiseRects(ctx, rng, w, h, 28);
  scanlines(ctx, w, h);
}

function paintPoster1(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 0);
  ctx.strokeStyle = 'rgba(255, 70, 60, 0.75)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(w * rng(), h * rng());
    ctx.lineTo(w * rng(), h * rng());
    ctx.stroke();
  }
  ctx.font = `700 ${h * 0.18 | 0}px monospace`;
  ctx.fillStyle = 'rgba(255, 180, 120, 0.9)';
  ctx.fillText('404', w * 0.12, h * 0.55);
  ctx.font = `${h * 0.045 | 0}px monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('REALITY NOT FOUND', w * 0.1, h * 0.64);
  noiseRects(ctx, rng, w, h, 22);
  scanlines(ctx, w, h, 0.18);
}

function paintPoster2(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 320);
  ctx.fillStyle = 'rgba(255, 45, 70, 0.35)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.42, w * 0.22, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(10, 8, 12, 0.92)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.4, w * 0.16, h * 0.21, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 120, 90, 0.8)';
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  paintTypography(ctx, w, h, rng, ['VOID', 'FACE']);
  scanlines(ctx, w, h);
}

function paintPoster3(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 10);
  for (let y = 0; y < 12; y++) {
    ctx.fillStyle = `rgba(${200 + rng() * 55 | 0},${40 + rng() * 30 | 0},${50 + rng() * 40 | 0},0.55)`;
    ctx.fillRect(w * rng() * 0.3, h * (0.1 + y * 0.07), w * (0.5 + rng() * 0.5), h * 0.035);
  }
  ctx.font = `600 ${h * 0.09 | 0}px monospace`;
  ctx.fillStyle = 'rgba(255, 230, 200, 0.88)';
  ctx.fillText('信号 LOST', w * 0.1, h * 0.88);
  noiseRects(ctx, rng, w, h, 35);
  scanlines(ctx, w, h, 0.16);
}

function paintPoster4(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 340);
  ctx.strokeStyle = 'rgba(90, 210, 255, 0.55)';
  ctx.lineWidth = 1.5;
  const grid = 8;
  for (let i = 0; i <= grid; i++) {
    const t = i / grid;
    ctx.beginPath();
    ctx.moveTo(w * t, 0);
    ctx.lineTo(w * t, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, h * t);
    ctx.lineTo(w, h * t);
    ctx.stroke();
  }
  paintTypography(ctx, w, h, rng, ['GRID', 'BREAK']);
  ctx.fillStyle = 'rgba(255, 60, 50, 0.65)';
  ctx.fillRect(w * 0.55, h * 0.35, w * 0.35, h * 0.04);
  scanlines(ctx, w, h);
}

function paintPoster5(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 355);
  for (let i = 0; i < 40; i++) {
    const x = rng() * w;
    ctx.fillStyle = `rgba(255,${80 + rng() * 120 | 0},${40 + rng() * 60 | 0},${0.15 + rng() * 0.5})`;
    ctx.fillRect(x, 0, 1 + rng() * 3, h);
  }
  ctx.font = `900 ${h * 0.14 | 0}px sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillText('GLITCH', w * 0.1, h * 0.48);
  ctx.fillStyle = 'rgba(255, 80, 60, 0.95)';
  ctx.fillText('GLITCH', w * 0.1 + 5, h * 0.48 + 4);
  scanlines(ctx, w, h, 0.2);
}

function paintPoster6(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 20);
  ctx.fillStyle = 'rgba(180, 30, 45, 0.25)';
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.font = `${h * 0.065 | 0}px monospace`;
  ctx.fillStyle = 'rgba(255, 200, 170, 0.85)';
  const chars = 'アイウエオカキクケコサシスセソ';
  for (let i = 0; i < 8; i++) {
    ctx.fillText(chars[i % chars.length]!, w * (0.06 + i * 0.11), h * (0.72 + (i % 3) * 0.06));
  }
  paintTypography(ctx, w, h, rng, ['電脳']);
  noiseRects(ctx, rng, w, h, 18);
  scanlines(ctx, w, h);
}

function paintPoster7(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 330);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(${255},${60 + rng() * 80 | 0},${50 + rng() * 40 | 0},0.35)`;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.15);
    ctx.lineTo(w * (0.15 + rng() * 0.7), h * (0.85 + rng() * 0.1));
    ctx.lineTo(w * (0.15 + rng() * 0.7), h * (0.85 + rng() * 0.1));
    ctx.closePath();
    ctx.fill();
  }
  ctx.font = `800 ${h * 0.1 | 0}px sans-serif`;
  ctx.fillStyle = 'rgba(255, 240, 220, 0.9)';
  ctx.fillText('PULSE', w * 0.14, h * 0.52);
  scanlines(ctx, w, h);
}

function paintPoster8(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 0);
  for (let band = 0; band < 5; band++) {
    ctx.fillStyle = `rgba(${220 + band * 7},${40 + band * 12},${50},${0.35 + rng() * 0.3})`;
    ctx.fillRect(0, h * (0.12 + band * 0.16), w, h * 0.07);
  }
  ctx.font = `700 ${h * 0.075 | 0}px monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('[ DATA CORRUPT ]', w * 0.08, h * 0.9);
  noiseRects(ctx, rng, w, h, 30);
  scanlines(ctx, w, h, 0.22);
}

function paintPoster9(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 345);
  ctx.strokeStyle = 'rgba(255, 100, 80, 0.9)';
  ctx.lineWidth = 4;
  ctx.strokeRect(w * 0.1, h * 0.12, w * 0.8, h * 0.76);
  ctx.strokeStyle = 'rgba(80, 200, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.14, h * 0.16, w * 0.72, h * 0.68);
  paintTypography(ctx, w, h, rng, ['NIGHT', 'CITY']);
  scanlines(ctx, w, h);
}

function paintPoster10(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 15);
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(255,${50 + rng() * 100 | 0},${40 + rng() * 50 | 0},${rng() * 0.8})`;
    ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 8, 2 + rng() * 4);
  }
  ctx.font = `900 ${h * 0.16 | 0}px "Arial Black", sans-serif`;
  ctx.fillStyle = 'rgba(255, 60, 55, 0.92)';
  ctx.fillText('RAW', w * 0.15, h * 0.58);
  scanlines(ctx, w, h);
}

function paintPoster11(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = mulberry32(seed);
  fillBase(ctx, w, h, 360);
  ctx.fillStyle = 'rgba(255, 50, 60, 0.18)';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(0, h * rng(), w, h * (0.02 + rng() * 0.04));
  }
  paintTypography(ctx, w, h, rng, ['STATIC', 'DREAM']);
  ctx.strokeStyle = 'rgba(255, 180, 120, 0.65)';
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.78);
  for (let x = 0; x < w * 0.8; x += 8) {
    ctx.lineTo(w * 0.1 + x, h * 0.78 + Math.sin(x * 0.08 + seed) * h * 0.06);
  }
  ctx.stroke();
  scanlines(ctx, w, h);
}

const PAINTERS = [
  paintPoster0,
  paintPoster1,
  paintPoster2,
  paintPoster3,
  paintPoster4,
  paintPoster5,
  paintPoster6,
  paintPoster7,
  paintPoster8,
  paintPoster9,
  paintPoster10,
  paintPoster11,
];

let atlasCache: THREE.Texture | null = null;

/** 程序生成的霓虹 Glitch 海报图集 — 12 张高对比赛博灯牌（bloom 友好） */
export function createGlitchPosterAtlas(): THREE.Texture {
  if (atlasCache) return atlasCache;

  const atlasW = CELL_W * GLITCH_POSTER_COLS;
  const atlasH = CELL_H * GLITCH_POSTER_ROWS;
  const canvas = document.createElement('canvas');
  canvas.width = atlasW;
  canvas.height = atlasH;
  const ctx = canvas.getContext('2d')!;

  PAINTERS.forEach((paint, i) => {
    const col = i % GLITCH_POSTER_COLS;
    const row = Math.floor(i / GLITCH_POSTER_COLS);
    ctx.save();
    ctx.translate(col * CELL_W, row * CELL_H);
    paint(ctx, CELL_W, CELL_H, 9000 + i * 137);
    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  atlasCache = texture;
  return texture;
}

export function getPosterAtlasCellSize(): THREE.Vector2 {
  return new THREE.Vector2(1 / GLITCH_POSTER_COLS, 1 / GLITCH_POSTER_ROWS);
}

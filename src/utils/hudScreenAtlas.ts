import * as THREE from 'three';

export const HUD_SCREEN_COLS = 3;
export const HUD_SCREEN_ROWS = 3;
export const HUD_SCREEN_COUNT = HUD_SCREEN_COLS * HUD_SCREEN_ROWS;

// Keep cell size reasonably small for a single shared atlas.
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

function scanlines(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.12) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
}

function drawCircuit(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, hue: number) {
  // Circuit glow base.
  ctx.save();
  ctx.lineWidth = 1;
  const glowLayers = [
    { blur: 10, a: 0.12 },
    { blur: 4, a: 0.22 },
    { blur: 0, a: 0.35 },
  ];

  for (const layer of glowLayers) {
    ctx.save();
    ctx.shadowBlur = layer.blur;
    ctx.shadowColor = `hsla(${hue}, 92%, 60%, ${layer.a})`;
    ctx.strokeStyle = `hsla(${hue}, 95%, 62%, ${layer.a})`;

    const grid = 10 + (rng() * 6) | 0;
    for (let i = 0; i < grid; i++) {
      const x = (w * i) / grid;
      if (rng() < 0.35) {
        ctx.beginPath();
        ctx.moveTo(x, h * (rng() * 0.2 + 0.15));
        ctx.lineTo(x + (rng() - 0.5) * 8, h * (rng() * 0.6 + 0.2));
        ctx.stroke();
      }
    }

    for (let i = 0; i < 22; i++) {
      const x = w * rng();
      const y = h * rng();
      const rw = w * (0.03 + rng() * 0.22);
      const rh = h * (0.01 + rng() * 0.08);
      ctx.strokeRect(x, y, rw, rh);
    }

    // A couple of polyline paths.
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w * rng(), h * rng());
      for (let k = 0; k < 6; k++) ctx.lineTo(w * rng(), h * rng());
      ctx.stroke();
    }

    ctx.restore();
  }

  // Small "rect nodes"
  ctx.fillStyle = `hsla(${hue + 20}, 90%, 70%, 0.18)`;
  for (let i = 0; i < 70; i++) {
    const rw = 1 + rng() * 2.5;
    const rh = 1 + rng() * 2.5;
    ctx.fillRect(w * rng(), h * rng(), rw, rh);
  }

  ctx.restore();
}

function drawCenterMark(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, hue: number, variant: number) {
  const cx = w * (0.5 + (rng() - 0.5) * 0.03);
  const cy = h * (0.45 + (rng() - 0.5) * 0.04);

  ctx.save();
  // Outer ring
  ctx.strokeStyle = `hsla(${hue}, 95%, 68%, 0.65)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.18, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.strokeStyle = `hsla(${hue + 18}, 95%, 68%, 0.42)`;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.11, 0, Math.PI * 2);
  ctx.stroke();

  // Polygon / "core"
  ctx.fillStyle = `hsla(${hue + 10 + variant * 3}, 95%, 80%, 0.24)`;
  ctx.beginPath();
  const sides = 3 + (variant % 3);
  const r = Math.min(w, h) * (0.055 + rng() * 0.03);
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

const JAP_GLYPHS = [
  '電脳',
  '信号',
  '破敗',
  '回路',
  '監視',
  '幻影',
  '層裂',
  '故障',
  'ノイズ',
  '復旧',
  '零点',
  '接続',
  '屈折',
  '破断',
  '分岐',
  '同期',
];

function drawLabels(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, hue: number, variant: number) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = 2 + (variant % 2);
  for (let i = 0; i < lines; i++) {
    const pickA = JAP_GLYPHS[(rng() * JAP_GLYPHS.length) | 0]!;
    const pickB = JAP_GLYPHS[(rng() * JAP_GLYPHS.length) | 0]!;
    const text = i === 0 ? pickA : i === 1 ? pickB : rng() > 0.5 ? pickA : pickB;
    const size = h * (0.10 + i * 0.035);
    const y = h * (0.63 + i * 0.085);
    ctx.font = `900 ${size | 0}px monospace`;

    // Neon-ish stroke.
    const base = i === 0 ? hue : hue + 20 + i * 12;
    ctx.shadowBlur = 12;
    ctx.shadowColor = `hsla(${base}, 95%, 65%, 0.55)`;
    ctx.fillStyle = `hsla(${base}, 95%, 70%, 0.7)`;
    ctx.fillText(text, w * 0.5 + (rng() - 0.5) * 6, y + (rng() - 0.5) * 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = `hsla(${base + 8}, 95%, 92%, 0.25)`;
    ctx.fillText(text, w * 0.5 + (rng() - 0.5) * 4, y);
  }
  ctx.restore();
}

function paintHudVariant(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, variant: number) {
  const rng = mulberry32(seed);

  // Dark LCD base with faint vignette.
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.55, w * 0.7);
  g.addColorStop(0, `hsl(${190 + variant * 18}, 28%, 6%)`);
  g.addColorStop(0.45, `hsl(${195 + variant * 9}, 22%, 3%)`);
  g.addColorStop(1, `hsl(${210 + variant * 7}, 30%, 1.5%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Circuit layers.
  const hue = 170 + variant * 18;
  drawCircuit(ctx, w, h, rng, hue);
  drawCenterMark(ctx, w, h, rng, hue, variant);

  // HUD border ticks.
  ctx.save();
  ctx.strokeStyle = `rgba(160, 240, 255, 0.22)`;
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.055, h * 0.065, w * 0.89, h * 0.87);
  ctx.restore();

  // Labels (Japanese-like glyphs).
  drawLabels(ctx, w, h, rng, hue, variant);

  // Static rectangles (grime)
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const rw = w * (0.03 + rng() * 0.16);
    const rh = h * (0.008 + rng() * 0.05);
    ctx.fillStyle = `rgba(${80 + rng() * 140 | 0},${110 + rng() * 120 | 0},${120 + rng() * 160 | 0},${
      0.05 + rng() * 0.18
    })`;
    ctx.fillRect(w * rng(), h * rng(), rw, rh);
  }
  ctx.restore();

  scanlines(ctx, w, h, 0.14);
}

let atlasCache: THREE.Texture | null = null;

/** HUD / 破败全息屏图集（3x3=9 张） */
export function createHudScreenAtlas(): THREE.Texture {
  if (atlasCache) return atlasCache;

  const atlasW = CELL_W * HUD_SCREEN_COLS;
  const atlasH = CELL_H * HUD_SCREEN_ROWS;

  const canvas = document.createElement('canvas');
  canvas.width = atlasW;
  canvas.height = atlasH;

  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < HUD_SCREEN_COUNT; i++) {
    const col = i % HUD_SCREEN_COLS;
    const row = Math.floor(i / HUD_SCREEN_COLS);

    ctx.save();
    ctx.translate(col * CELL_W, row * CELL_H);
    paintHudVariant(ctx, CELL_W, CELL_H, 9100 + i * 777, i);
    ctx.restore();
  }

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

export function getHudScreenAtlasCellSize(): THREE.Vector2 {
  return new THREE.Vector2(1 / HUD_SCREEN_COLS, 1 / HUD_SCREEN_ROWS);
}


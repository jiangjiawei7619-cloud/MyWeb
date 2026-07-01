/** 加载页面部视觉 — 供 SVG、VRM 叠层共用（无动画） */

export const LOADING_FACE_MOUTH_POINTS = [
  [68, 120],
  [80, 136],
  [100, 120],
  [120, 136],
  [132, 120],
] as const;

const MOUTH_REF_CX = 100;
const MOUTH_REF_CY = 128;
const MOUTH_REF_WIDTH = 64;

export function getLoadingFaceMouthPathD() {
  const [first, ...rest] = LOADING_FACE_MOUTH_POINTS;
  const tail = rest.map(([x, y]) => `L ${x} ${y}`).join(' ');
  return `M ${first[0]} ${first[1]} ${tail}`;
}

export type LoadingFaceFeatureBounds = {
  cx: number;
  cy: number;
  radius: number;
  pixels: number[];
};

export type LoadingFaceMouthBounds = {
  cx: number;
  cy: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function deriveMouthBoundsFromEyes(eyes: LoadingFaceFeatureBounds[]): LoadingFaceMouthBounds | null {
  if (eyes.length === 0) return null;

  const sorted = [...eyes].sort((a, b) => a.cx - b.cx);
  const left = sorted[0]!;
  const right = sorted[sorted.length - 1]!;
  const cx = (left.cx + right.cx) * 0.5;
  const eyeCy = (left.cy + right.cy) * 0.5;
  const eyeSpacing = Math.max(Math.abs(right.cx - left.cx), left.radius * 1.5);
  const avgRadius = eyes.reduce((sum, eye) => sum + eye.radius, 0) / eyes.length;

  return {
    cx,
    cy: eyeCy + avgRadius * 1.9,
    width: eyeSpacing * 0.82,
    height: eyeSpacing * 0.24,
  };
}

export function clearFeaturePixels(
  data: Uint8ClampedArray,
  pixels: number[],
  fill: [number, number, number],
) {
  for (const pixel of pixels) {
    const i = pixel * 4;
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = 255;
  }
}

function isDarkFacePixel(data: Uint8ClampedArray, pixelIndex: number) {
  const i = pixelIndex * 4;
  const r = data[i] ?? 255;
  const g = data[i + 1] ?? 255;
  const b = data[i + 2] ?? 255;
  const a = data[i + 3] ?? 0;
  return a > 160 && r < 92 && g < 92 && b < 92;
}

export function sampleBodyColorNearEyes(
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  eyes: LoadingFaceFeatureBounds[],
): [number, number, number] {
  if (eyes.length === 0) return [248, 248, 248];

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (const eye of eyes) {
    const inner = eye.radius * 1.05;
    const outer = eye.radius * 1.55;
    const minX = Math.max(0, Math.floor(eye.cx - outer));
    const maxX = Math.min(imageWidth - 1, Math.ceil(eye.cx + outer));
    const minY = Math.max(0, Math.floor(eye.cy - outer));
    const maxY = Math.min(imageHeight - 1, Math.ceil(eye.cy + outer));

    for (let py = minY; py <= maxY; py += 1) {
      for (let px = minX; px <= maxX; px += 1) {
        const dx = px - eye.cx;
        const dy = py - eye.cy;
        const dist = Math.hypot(dx, dy);
        if (dist < inner || dist > outer) continue;

        const pixel = py * imageWidth + px;
        if (isDarkFacePixel(data, pixel)) continue;

        const i = pixel * 4;
        sumR += data[i] ?? 0;
        sumG += data[i + 1] ?? 0;
        sumB += data[i + 2] ?? 0;
        count += 1;
      }
    }
  }

  if (count === 0) return [248, 248, 248];
  return [
    Math.round(sumR / count),
    Math.round(sumG / count),
    Math.round(sumB / count),
  ];
}

/** 仅擦除贴图上的旧五官暗色像素，保留体表底色 */
export function eraseLegacyFaceFeatures(
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  eyes: LoadingFaceFeatureBounds[],
  legacyMouths: LoadingFaceFeatureBounds[],
) {
  const fill = sampleBodyColorNearEyes(data, imageWidth, imageHeight, eyes);

  for (const eye of eyes) {
    clearFeaturePixels(data, eye.pixels, fill);
  }

  for (const mouth of legacyMouths) {
    clearFeaturePixels(data, mouth.pixels, fill);
  }

  if (eyes.length < 2) return;

  const sorted = [...eyes].sort((a, b) => a.cx - b.cx);
  const left = sorted[0]!;
  const right = sorted[sorted.length - 1]!;
  const mouthHint = deriveMouthBoundsFromEyes(eyes);
  if (!mouthHint) return;

  const minX = Math.max(0, Math.floor(left.cx - left.radius * 0.45));
  const maxX = Math.min(imageWidth - 1, Math.ceil(right.cx + right.radius * 0.45));
  const minY = Math.max(0, Math.floor(Math.min(left.cy, right.cy) - left.radius * 0.15));
  const maxY = Math.min(imageHeight - 1, Math.ceil(mouthHint.cy + mouthHint.height * 0.65));

  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) {
      const pixel = py * imageWidth + px;
      if (!isDarkFacePixel(data, pixel)) continue;
      const i = pixel * 4;
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
      data[i + 3] = 255;
    }
  }
}

export function paintLoadingStyleEye(
  ctx: CanvasRenderingContext2D,
  feature: LoadingFaceFeatureBounds,
  intensity = 1,
) {
  const { cx, cy, radius } = feature;
  const k = clamp(intensity, 0.45, 2.2);

  const outerGrad = ctx.createRadialGradient(cx, cy, radius * 0.55, cx, cy, radius * 2.15);
  outerGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  outerGrad.addColorStop(0.35, `rgba(255, 150, 170, ${0.1 * k})`);
  outerGrad.addColorStop(0.72, `rgba(255, 90, 120, ${0.14 * k})`);
  outerGrad.addColorStop(1, 'rgba(255, 30, 74, 0)');
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 2.15, radius * 2.1, 0, 0, Math.PI * 2);
  ctx.fill();

  const midGrad = ctx.createRadialGradient(cx, cy, radius * 0.42, cx, cy, radius * 1.55);
  midGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  midGrad.addColorStop(0.5, `rgba(255, 180, 195, ${0.08 * k})`);
  midGrad.addColorStop(1, 'rgba(255, 30, 74, 0)');
  ctx.fillStyle = midGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 1.55, radius * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.95);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  coreGrad.addColorStop(0.72, 'rgba(255, 252, 253, 0.98)');
  coreGrad.addColorStop(1, 'rgba(255, 246, 248, 0.92)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.95, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.72, 0, Math.PI * 2);
  ctx.fill();
}

export function paintLoadingStyleMouth(
  ctx: CanvasRenderingContext2D,
  mouth: LoadingFaceMouthBounds,
) {
  const scale = mouth.width / MOUTH_REF_WIDTH;
  const lineScale = Math.max(scale, 0.5);
  const toX = (x: number) => mouth.cx + (x - MOUTH_REF_CX) * scale;
  const toY = (y: number) => mouth.cy + (y - MOUTH_REF_CY) * scale;

  const traceMouth = () => {
    const [first, ...rest] = LOADING_FACE_MOUTH_POINTS;
    ctx.moveTo(toX(first[0]), toY(first[1]));
    for (const [x, y] of rest) {
      ctx.lineTo(toX(x), toY(y));
    }
  };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = 'rgba(255, 90, 120, 0.16)';
  ctx.lineWidth = 10 * lineScale;
  ctx.shadowColor = 'rgba(255, 90, 120, 0.2)';
  ctx.shadowBlur = 8 * lineScale;
  ctx.beginPath();
  traceMouth();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 106, 136, 0.12)';
  ctx.lineWidth = 7 * lineScale;
  ctx.beginPath();
  traceMouth();
  ctx.stroke();

  const bodyGrad = ctx.createLinearGradient(toX(68), toY(128), toX(132), toY(128));
  bodyGrad.addColorStop(0, 'rgba(255, 107, 136, 0.62)');
  bodyGrad.addColorStop(0.32, 'rgba(255, 240, 243, 0.88)');
  bodyGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.96)');
  bodyGrad.addColorStop(0.68, 'rgba(255, 240, 243, 0.88)');
  bodyGrad.addColorStop(1, 'rgba(255, 107, 136, 0.62)');
  ctx.strokeStyle = bodyGrad;
  ctx.lineWidth = 4.5 * lineScale;
  ctx.beginPath();
  traceMouth();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.lineWidth = 0.9 * lineScale;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  traceMouth();
  ctx.stroke();

  ctx.restore();
}

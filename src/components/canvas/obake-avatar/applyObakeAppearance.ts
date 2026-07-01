import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { getObakeAvatarConfig, OBAKE_AVATAR_LAYER } from '@/lib/obake-avatar-config';
import {
  eraseLegacyFaceFeatures,
  type LoadingFaceFeatureBounds,
} from '@/lib/loading-face-visual';

export function applyObakeRenderLayer(root: THREE.Object3D) {
  root.traverse((obj) => {
    obj.layers.set(OBAKE_AVATAR_LAYER);
    obj.layers.enable(0);
  });
}

function extractColorMap(material: THREE.Material): THREE.Texture | null {
  const mat = material as THREE.MeshStandardMaterial & {
    uniforms?: Record<string, { value?: unknown }>;
  };
  if (mat.map) return mat.map;
  const lit = mat.uniforms?.litTexture?.value;
  if (lit instanceof THREE.Texture) return lit;
  const shade = mat.uniforms?.shadeTexture?.value;
  if (shade instanceof THREE.Texture) return shade;
  return null;
}

function isCanvasImageSource(image: unknown): image is CanvasImageSource {
  return (
    (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) ||
    (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) ||
    (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) ||
    (typeof OffscreenCanvas !== 'undefined' && image instanceof OffscreenCanvas)
  );
}

type FaceFeatureComponent = LoadingFaceFeatureBounds & { area: number };

function isDarkFeaturePixel(data: Uint8ClampedArray, pixelIndex: number) {
  const i = pixelIndex * 4;
  const r = data[i] ?? 255;
  const g = data[i + 1] ?? 255;
  const b = data[i + 2] ?? 255;
  const a = data[i + 3] ?? 0;
  return a > 180 && r < 58 && g < 58 && b < 58;
}

function collectFaceFeatures(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { eyes: FaceFeatureComponent[]; legacyMouths: FaceFeatureComponent[] } {
  const minX = Math.floor(width * 0.58);
  const maxX = Math.floor(width * 0.88);
  const minY = Math.floor(height * 0.12);
  const maxY = Math.floor(height * 0.44);
  const visited = new Uint8Array(width * height);
  const components: FaceFeatureComponent[] = [];

  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const start = y * width + x;
      if (visited[start] || !isDarkFeaturePixel(data, start)) continue;

      let area = 0;
      let sumX = 0;
      let sumY = 0;
      let cMinX = x;
      let cMaxX = x;
      let cMinY = y;
      let cMaxY = y;
      const pixels: number[] = [];
      const stack = [start];
      visited[start] = 1;

      while (stack.length > 0) {
        const next = stack.pop()!;
        const px = next % width;
        const py = Math.floor(next / width);

        area += 1;
        sumX += px;
        sumY += py;
        cMinX = Math.min(cMinX, px);
        cMaxX = Math.max(cMaxX, px);
        cMinY = Math.min(cMinY, py);
        cMaxY = Math.max(cMaxY, py);
        pixels.push(next);

        const neighbors = [next - 1, next + 1, next - width, next + width];
        for (const n of neighbors) {
          if (n < 0 || n >= visited.length || visited[n]) continue;
          const nx = n % width;
          const ny = Math.floor(n / width);
          if (nx < minX || nx >= maxX || ny < minY || ny >= maxY) continue;
          if (!isDarkFeaturePixel(data, n)) continue;
          visited[n] = 1;
          stack.push(n);
        }
      }

      const boxW = cMaxX - cMinX + 1;
      const boxH = cMaxY - cMinY + 1;
      const isFeatureSized =
        area > width * height * 0.00001 &&
        boxW > width * 0.0035 &&
        boxH > height * 0.0035 &&
        boxW < width * 0.09 &&
        boxH < height * 0.12;
      if (!isFeatureSized) continue;

      components.push({
        area,
        cx: sumX / area,
        cy: sumY / area,
        radius: Math.max(boxW, boxH) * 0.5,
        pixels,
      });
    }
  }

  const eyes = components
    .sort((a, b) => b.area - a.area)
    .slice(0, 2)
    .sort((a, b) => a.cx - b.cx);
  const eyeSet = new Set(eyes);
  const legacyMouths = components.filter((feature) => !eyeSet.has(feature));

  return { eyes, legacyMouths };
}

function createThemeFaceTexture(map: THREE.Texture) {
  const image = map.image;
  if (!isCanvasImageSource(image) || !('width' in image) || !('height' in image)) return map;

  const width = Number(image.width);
  const height = Number(image.height);
  if (!width || !height || typeof document === 'undefined') return map;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return map;

  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const { eyes, legacyMouths } = collectFaceFeatures(imageData.data, width, height);

  if (eyes.length > 0 || legacyMouths.length > 0) {
    eraseLegacyFaceFeatures(imageData.data, width, height, eyes, legacyMouths);
    ctx.putImageData(imageData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `${map.name || 'obake'}-body-faceless`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = map.flipY;
  texture.wrapS = map.wrapS;
  texture.wrapT = map.wrapT;
  texture.repeat.copy(map.repeat);
  texture.offset.copy(map.offset);
  texture.center.copy(map.center);
  texture.rotation = map.rotation;
  texture.minFilter = map.minFilter;
  texture.magFilter = map.magFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function applyObakeAppearance(vrm: VRM) {
  const cfg = getObakeAvatarConfig();

  applyObakeRenderLayer(vrm.scene);

  vrm.scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.frustumCulled = false;

    const sources = Array.isArray(obj.material) ? obj.material : [obj.material];
    const materials = sources.map((src) => {
      const map = src ? extractColorMap(src) : null;
      const themedMap = map && cfg.useEmissiveGlow ? createThemeFaceTexture(map) : map;
      if (themedMap) {
        themedMap.colorSpace = THREE.SRGBColorSpace;
      }

      return new THREE.MeshBasicMaterial({
        map: themedMap ?? undefined,
        color: themedMap ? 0xffffff : new THREE.Color(cfg.bodyColor),
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: src?.transparent ?? false,
        alphaTest: (src as THREE.Material | undefined)?.alphaTest ?? 0,
        depthWrite: true,
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      });
    });

    obj.material = materials.length === 1 ? materials[0]! : materials;
    obj.renderOrder = 50;
  });

  const expr = vrm.expressionManager;
  if (expr) {
    for (const e of expr.expressions) {
      expr.setValue(e.expressionName, 0);
    }
    expr.update();
  }
}

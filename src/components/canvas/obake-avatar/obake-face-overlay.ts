import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { applyObakeRenderLayer } from '@/components/canvas/obake-avatar/applyObakeAppearance';
import {
  deriveMouthBoundsFromEyes,
  paintLoadingStyleEye,
  paintLoadingStyleMouth,
  type LoadingFaceFeatureBounds,
} from '@/lib/loading-face-visual';

const FACE_CANVAS_SIZE = 256;
const FACE_VIEW_SIZE = 200;

const STATIC_LEFT_EYE: LoadingFaceFeatureBounds = {
  cx: 59,
  cy: 78,
  radius: 24,
  pixels: [],
};

const STATIC_RIGHT_EYE: LoadingFaceFeatureBounds = {
  cx: 141,
  cy: 78,
  radius: 24,
  pixels: [],
};

export function paintStaticLoadingFace(ctx: CanvasRenderingContext2D, size = FACE_CANVAS_SIZE) {
  ctx.clearRect(0, 0, size, size);
  const scale = size / FACE_VIEW_SIZE;
  ctx.save();
  ctx.scale(scale, scale);

  paintLoadingStyleEye(ctx, STATIC_LEFT_EYE, 1);
  paintLoadingStyleEye(ctx, STATIC_RIGHT_EYE, 1);

  const mouth = deriveMouthBoundsFromEyes([STATIC_LEFT_EYE, STATIC_RIGHT_EYE]);
  if (mouth) {
    paintLoadingStyleMouth(ctx, mouth);
  }

  ctx.restore();
}

export function createObakeFaceOverlay(vrm: VRM): THREE.Object3D | null {
  const head = vrm.humanoid?.getNormalizedBoneNode('head');
  if (!head) return null;

  const canvas = document.createElement('canvas');
  canvas.width = FACE_CANVAS_SIZE;
  canvas.height = FACE_CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  paintStaticLoadingFace(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  plane.renderOrder = 80;
  plane.position.set(0, 0.045, 0.105);
  plane.scale.set(0.34, 0.34, 1);
  applyObakeRenderLayer(plane);

  const group = new THREE.Group();
  group.name = 'ObakeFaceOverlay';
  group.add(plane);
  head.add(group);

  return group;
}

export function disposeObakeFaceOverlay(overlay: THREE.Object3D | null) {
  if (!overlay) return;
  overlay.parent?.remove(overlay);
  overlay.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry.dispose();
    const { map } = obj.material as THREE.MeshBasicMaterial;
    map?.dispose();
    obj.material.dispose();
  });
}

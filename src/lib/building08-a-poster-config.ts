import * as THREE from 'three';
import { getBuildingFaceSize } from '@/lib/building-face-size';
import { REBECCA_GLITCH_BURST } from '@/lib/rebecca-hologram-config';

export const BUILDING08_A_POSTER_TEXTURE = '/textures/building08-a-poster.png';

/** Source image 1024×682 */
const IMAGE_ASPECT = 1024 / 682;
const FACE_MARGIN = 0.9;
const POSTER_SCALE = 1.2;
const SURFACE_OFFSET = 0.06;

export function getBuilding08APosterPlacement() {
  const face = getBuildingFaceSize('building08', 'A');
  const availW = face.width * FACE_MARGIN;
  const availH = face.height * FACE_MARGIN;
  const width = Math.min(availW, availH * IMAGE_ASPECT) * POSTER_SCALE;
  const height = (width / IMAGE_ASPECT);

  const outwardNormal = face.normal.clone();
  if (Math.abs(outwardNormal.x) > 0.9) outwardNormal.negate();
  const pos = face.center.clone().addScaledVector(outwardNormal, SURFACE_OFFSET);

  return {
    x: pos.x,
    y: pos.y,
    z: pos.z,
    rotationY: -face.rotation.y,
    width,
    height,
  };
}

export const BUILDING08_A_FACE_SIZE = (() => {
  const face = getBuildingFaceSize('building08', 'A');
  return { width: face.width, height: face.height };
})();

export const BUILDING08_A_POSTER_BURST = {
  ...REBECCA_GLITCH_BURST,
  phase: 2.2,
  intervalMin: 8,
  intervalSpan: 6,
  duration: 0.35,
  bodyBrightness: 2.4,
  bloomBoost: 0.18,
  neonSpill: 0.38,
} as const;

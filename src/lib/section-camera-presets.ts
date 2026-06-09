import type { ActivePage } from '@/lib/types';

export type SectionCameraPreset = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export const DEBUG_BUILDING_ANCHORS = false;

export const BUILDING08_C_ANCHOR = {
  id: 'building08:C',
  face: '+Z',
  center: [-45.76092846846935, 8.71308950020466, -37.16607902236311] as [number, number, number],
  normal: [0, 0, 1] as [number, number, number],
  panelPosition: [-45.76092846846935, 8.71308950020466, -36.98607902236311] as [number, number, number],
  panelRotation: [0, 0, 0] as [number, number, number],
  panelScale: 0.0062,
  cameraPosition: [-45.76092846846935, 9.15308950020466, -29.96607902236311] as [number, number, number],
  cameraTarget: [-45.76092846846935, 8.91308950020466, -37.16607902236311] as [number, number, number],
} as const;

export const SECTION_CAMERA_PRESETS: Record<ActivePage, SectionCameraPreset> = {
  EXPLORE: {
    position: [0, 2.5, 8],
    target: [0, 1.5, 0],
    fov: 45,
  },
  WORKS: {
    position: [...BUILDING08_C_ANCHOR.cameraPosition],
    target: [...BUILDING08_C_ANCHOR.cameraTarget],
    fov: 38,
  },
  LOGS: {
    position: [-10, 3, -6],
    target: [-10, 1.4, -12],
    fov: 42,
  },
  ABOUT: {
    position: [0, 4, -18],
    target: [0, 1.5, -24],
    fov: 45,
  },
};

export const SECTION_CAMERA_TRANSITION = {
  duration: 0.001,
  idleAmplitude: {
    x: 0.05,
    y: 0.03,
    z: 0.04,
  },
  mouseTargetAmplitude: {
    x: 0.12,
    y: 0.06,
  },
} as const;

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

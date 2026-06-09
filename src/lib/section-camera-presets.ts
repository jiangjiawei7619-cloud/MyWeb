import type { ActivePage } from '@/lib/types';
import { computeWorksSurfaceLayout } from '@/lib/works-surface-config';

export type SectionCameraPreset = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export const DEBUG_BUILDING_ANCHORS = false;

const _worksLayout = computeWorksSurfaceLayout();

export const BUILDING08_C_ANCHOR = {
  id: 'building08:C',
  face: '+Z' as const,
  faceSize: _worksLayout.faceSize,
  center: _worksLayout.faceCenter,
  normal: _worksLayout.normal,
  panelPosition: _worksLayout.panelPosition,
  panelRotation: _worksLayout.panelRotation,
  panelWidth: _worksLayout.panelWidth,
  panelHeight: _worksLayout.panelHeight,
  panelPxWidth: _worksLayout.panelPxWidth,
  panelPxHeight: _worksLayout.panelPxHeight,
  htmlScale: _worksLayout.htmlScale,
  designWidth: _worksLayout.designWidth,
  designHeight: _worksLayout.designHeight,
  faceMargin: _worksLayout.faceMargin,
  surfaceOffset: _worksLayout.surfaceOffset,
  cameraPosition: _worksLayout.cameraPosition,
  cameraTarget: _worksLayout.cameraTarget,
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

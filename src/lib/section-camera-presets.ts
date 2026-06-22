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
  faceCenter: _worksLayout.faceCenter,
  normal: _worksLayout.normal,
  panelPosition: _worksLayout.panelPosition,
  panelRotation: _worksLayout.panelRotation,
  panelWidth: _worksLayout.panelWidth,
  panelHeight: _worksLayout.panelHeight,
  panelPxWidth: _worksLayout.panelPxWidth,
  panelPxHeight: _worksLayout.panelPxHeight,
  htmlScale: _worksLayout.htmlScale,
  htmlDistanceFactor: _worksLayout.htmlDistanceFactor,
  contentCoverScale: _worksLayout.contentCoverScale,
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

/**
 * WORKS 立面镜头 — 绕面板 pivot 的角度轨道（弧度），不是相机位置平移。
 * idleYaw / idlePitch：鼠标静止时的自动摆动幅度（越大越明显）。
 * idleYawSpeed / idlePitchSpeed：自动摆动频率（越大越快）。
 * mouseYaw / mousePitch：鼠标跟随角度偏移。
 * mouseIdleMs / mouseReturnSpeed：鼠标停止后回到中心 orbit 的延迟与速度。
 */
export const WORKS_CAMERA_SWAY = {
  idleYaw: 0.032,
  idlePitch: 0.018,
  idleYawSpeed: 0.42,
  idlePitchSpeed: 0.55,
  mouseYaw: 0.065,
  mousePitch: 0.038,
  mouseIdleMs: 140,
  mouseReturnSpeed: 5,
} as const;

/** WORKS 进入时视野渐展开：从略窄 FOV 平滑过渡到目标 FOV */
export const WORKS_FOV_ENTRY = {
  startFov: 34,
  duration: 1.0,
} as const;

/**
 * EXPLORE 从其它分区切入 — 沿上次 EXPLORE 视线轴直线推进（无保存位时回退 preset）。
 * 终点 = 上次眼位 + 朝向；起点 = 终点沿视线后撤 pullBackDistance。
 * FOV 从略窄展开到 CAMERA_BASE_FOV；结束后交棒第一人称控制器（无跳变）。
 */
export const EXPLORE_ENTRY_TRANSITION = {
  duration: 0.48,
  pullBackDistance: 1.35,
  startFov: 68,
} as const;

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** 前快后慢 — 适合 push-in 镜头 */
export function easeOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - c, 3);
}

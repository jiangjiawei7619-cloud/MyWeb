import * as THREE from 'three';
import {
  getBuildingFaceSize,
  getCameraDistanceToFitPanel,
} from '@/lib/building-face-size';
import type { BuildingFaceLetter } from '@/lib/explore-world-labels';

/** 开启后在 C 面显示 face / panel 线框与尺寸标注 */
export const DEBUG_WORKS_SURFACE_FIT = false;

/**
 * Works 面板在 3D 世界中的集中配置 — 调尺寸优先改这里。
 * - faceMargin: C 面占用比例（0.92 = 92%）
 * - surfaceOffset: 沿法线外推，防 z-fighting
 * - designWidth / designHeight: Html 内 Works 内容设计分辨率
 * - cameraFitMargin: 切入 WORKS 时相机距离倍率（越大越远）
 */
export const WORKS_SURFACE_CONFIG = {
  buildingId: 'building08',
  face: 'C' as BuildingFaceLetter,
  faceMargin: 0.92,
  surfaceOffset: 0.06,
  designWidth: 1200,
  designHeight: 760,
  /**
   * drei Html transform 默认 distanceFactor=10 → CSS 矩阵再除 (10/400)，
   * 会把面板缩小约 40×。设为 400 后 scale 与 world unit 1:1 对齐。
   */
  htmlDistanceFactor: 400,
  /** 内容在面板内 contain 缩放（0.98 = 留 2% 内边距） */
  contentFill: 0.98,
  worksFov: 38,
  cameraFitMargin: 1.15,
  cameraVerticalOffset: 0.4,
} as const;

export type WorksSurfaceLayout = {
  faceSize: { width: number; height: number };
  panelWidth: number;
  panelHeight: number;
  panelPxWidth: number;
  panelPxHeight: number;
  htmlScale: number;
  htmlDistanceFactor: number;
  /** Uniform CSS scale — contain 时贴满面宽，竖长 C 面上下留 cyber 边 */
  contentCoverScale: number;
  designWidth: number;
  designHeight: number;
  faceMargin: number;
  surfaceOffset: number;
  panelPosition: [number, number, number];
  panelRotation: [number, number, number];
  normal: [number, number, number];
  faceCenter: [number, number, number];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
};

export function computeWorksSurfaceLayout(
  config: typeof WORKS_SURFACE_CONFIG = WORKS_SURFACE_CONFIG,
): WorksSurfaceLayout {
  const face = getBuildingFaceSize(config.buildingId, config.face);

  const panelWidth = face.width * config.faceMargin;
  const panelHeight = face.height * config.faceMargin;

  /** Html transform：world = px × group.scale（需配合 htmlDistanceFactor=400） */
  const panelPxWidth = config.designWidth;
  const htmlScale = panelWidth / panelPxWidth;
  const panelPxHeight = panelHeight / htmlScale;
  const contentCoverScale = Math.min(
    (panelPxWidth * config.contentFill) / config.designWidth,
    (panelPxHeight * config.contentFill) / config.designHeight,
  );

  const panelPositionVec = face.center
    .clone()
    .addScaledVector(face.normal, config.surfaceOffset);
  const panelRotation: [number, number, number] = [
    face.rotation.x,
    face.rotation.y,
    face.rotation.z,
  ];

  const distance = getCameraDistanceToFitPanel(
    panelWidth,
    panelHeight,
    config.worksFov,
    config.cameraFitMargin,
  );
  const cameraPositionVec = face.center
    .clone()
    .addScaledVector(face.normal, distance)
    .add(new THREE.Vector3(0, config.cameraVerticalOffset, 0));
  const cameraTargetVec = face.center
    .clone()
    .add(new THREE.Vector3(0, config.cameraVerticalOffset * 0.5, 0));

  return {
    faceSize: { width: face.width, height: face.height },
    panelWidth,
    panelHeight,
    panelPxWidth,
    panelPxHeight,
    htmlScale,
    htmlDistanceFactor: config.htmlDistanceFactor,
    contentCoverScale,
    designWidth: config.designWidth,
    designHeight: config.designHeight,
    faceMargin: config.faceMargin,
    surfaceOffset: config.surfaceOffset,
    panelPosition: [
      panelPositionVec.x,
      panelPositionVec.y,
      panelPositionVec.z,
    ],
    panelRotation,
    normal: [face.normal.x, face.normal.y, face.normal.z],
    faceCenter: [face.center.x, face.center.y, face.center.z],
    cameraPosition: [
      cameraPositionVec.x,
      cameraPositionVec.y,
      cameraPositionVec.z,
    ],
    cameraTarget: [
      cameraTargetVec.x,
      cameraTargetVec.y,
      cameraTargetVec.z,
    ],
  };
}

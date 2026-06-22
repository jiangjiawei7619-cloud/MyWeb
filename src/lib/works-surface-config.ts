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
  /** 相对 faceMargin 基准面板的水平放大（1.2 = +20% 宽） */
  panelWidthScale: 1.2,
  /** 相对 faceMargin 基准面板的垂直放大（1.25 = +25% 高） */
  panelHeightScale: 1.25,
  /** 世界 Y 偏移（负值 = 沿建筑立面略向下） */
  panelVerticalOffset: -0.4,
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

/** Works 湿地面几何镜像 — 对齐全息海报浅层湿面衰减（非楼宇深 fade） */
export const WORKS_SURFACE_REFLECT = {
  reflectGain: 0.58,
  reflectBoost: 1.12,
  reflectDimmer: 0.72,
  reflectAlphaFloor: 0.018,
  reflectBlurScale: 0.28,
  /** 沿立面法线外推，避免与 building08 盒体镜像暗面 z-fight */
  reflectForwardOffset: 0.04,
  /** 倒影基色 — 暗 UI 块，非红色扫描条 */
  panelColor: '#06060c',
  /** 标题区轻微冷色点缀（湿面倒影，非面板本体） */
  accentColor: '#4a8a96',
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

  const panelWidth = face.width * config.faceMargin * config.panelWidthScale;
  const panelHeight = face.height * config.faceMargin * config.panelHeightScale;

  /** 面板 DOM 固定为设计稿单屏尺寸；整体 scale 贴入 C 面（contain，无滚动） */
  const panelPxWidth = config.designWidth;
  const panelPxHeight = config.designHeight;
  const htmlScale =
    Math.min(panelWidth / panelPxWidth, panelHeight / panelPxHeight) * config.contentFill;
  const contentCoverScale = 1;

  const panelPositionVec = face.center
    .clone()
    .add(new THREE.Vector3(0, config.panelVerticalOffset, 0))
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
    .add(new THREE.Vector3(0, config.panelVerticalOffset, 0))
    .addScaledVector(face.normal, distance)
    .add(new THREE.Vector3(0, config.cameraVerticalOffset, 0));
  const cameraTargetVec = face.center
    .clone()
    .add(new THREE.Vector3(0, config.panelVerticalOffset, 0))
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

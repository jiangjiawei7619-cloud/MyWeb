/** Rebecca 全息 �?地标墙、burst 时序、亮�?*/
import { EXPLORE_WORLD_SCALE } from '@/physics/rapier-config';

export const REBECCA_LANDMARK = {
  building: {
    x: -21,
    z: -38,
    w: 11,
    d: 9,
    h: 16,
  },
  aspect: 1,
  texturePath: '/textures/rebecca-hologram.png',
} as const;

export const REBECCA_GLITCH_BURST = {
  /** burst 间隔（秒�?*/
  intervalMin: 5.5,
  intervalSpan: 4.0,
  phase: 1.7,
  duration: 0.52,
  steps: 12,
  /** 三层物理 Z 间距（米，朝相机方向�?*/
  layerSpread: 0.28,
  /** 常态亮�?�?倒影链路使用 */
  baseBrightness: 2.76,
  /** 本体基色 �?配合 lumaCap 防过�?*/
  bodyBrightness: 2.95,
  baseOpacity: 0.98,
  /** 本体 shader bloom 叠层 */
  bloomBoost: 0.24,
  /** 霓虹溢光 / 边缘光晕强度 */
  neonSpill: 0.52,
  /** 本体亮部 roll-off */
  bodyHighlightKnee: 0.72,
  /** 本体输出亮度上限 */
  bodyLumaCap: 1.02,
  /** Body distance falloff */
  bodyDistFalloff: { near: 26, far: 72, minGain: 0.82 },
  /** burst 时单层通道增益 */
  layerGain: 2.35,
} as const;


export function getRebeccaHologramPlacement() {
  const b = REBECCA_LANDMARK.building;
  const x = b.x * EXPLORE_WORLD_SCALE;
  const z = b.z * EXPLORE_WORLD_SCALE;
  const faceSpan = Math.min(b.d * 0.9, b.h * 0.82);
  const width = faceSpan * 0.92;
  const height = width / REBECCA_LANDMARK.aspect;

  return {
    x: x + b.w * 0.5 + 0.22,
    y: b.h * 0.5,
    z,
    rotationY: Math.PI / 2,
    width,
    height,
  };
}

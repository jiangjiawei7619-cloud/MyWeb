/** 小幽灵 VRM 可视角色 — 仅开发环境可覆盖的调试参数 */

import { CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS } from '@/physics/rapier-config';

/** 刚体中心 → 脚底（胶囊体落地时） */
export const AVATAR_FOOT_Y_OFFSET = -(CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS);

/** Dedicated render layer for the avatar. */
export const OBAKE_AVATAR_LAYER = 1;

export type ObakeAvatarDebugConfig = {
  modelPath: string;
  scale: number;
  yOffset: number;
  rotationOffset: number;
  positionOffset: [number, number, number];
  enableMoveTilt: boolean;
  enableJumpSquash: boolean;
  enableDoubleJumpAction: boolean;
  enableDebugSkeleton: boolean;
  /** 无贴图时的兜底色（深红幽灵） */
  bodyColor: string;
  /** 用 emissiveMap 让脸部白高光参与 Bloom */
  useEmissiveGlow: boolean;
  emissiveTint: string;
  emissiveIntensity: number;
};

const DEFAULT_CONFIG: ObakeAvatarDebugConfig = {
  modelPath: '/models/obake_white_ovo.vrm',
  scale: 0.78,
  yOffset: AVATAR_FOOT_Y_OFFSET,
  /** VRM 绑定姿势朝 +Z，需 π 与移动方向对齐 */
  rotationOffset: Math.PI,
  positionOffset: [0, 0, 0],
  enableMoveTilt: true,
  enableJumpSquash: true,
  enableDoubleJumpAction: true,
  enableDebugSkeleton: false,
  bodyColor: '#5a1020',
  useEmissiveGlow: true,
  emissiveTint: '#ff8d8f',
  emissiveIntensity: 0.7,
};

function readDevOverride(): Partial<ObakeAvatarDebugConfig> {
  if (!import.meta.env.DEV || typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const override: Partial<ObakeAvatarDebugConfig> = {};

  const scale = params.get('obakeScale');
  if (scale) override.scale = Number(scale);

  const yOffset = params.get('obakeYOffset');
  if (yOffset) override.yOffset = Number(yOffset);

  if (params.get('obakeDebugSkeleton') === '1') override.enableDebugSkeleton = true;
  if (params.get('obakeNoMoveTilt') === '1') override.enableMoveTilt = false;
  if (params.get('obakeNoJumpSquash') === '1') override.enableJumpSquash = false;
  if (params.get('obakeNoDoubleJump') === '1') override.enableDoubleJumpAction = false;
  if (params.get('obakeNoGlow') === '1') override.useEmissiveGlow = false;

  const emissiveIntensity = params.get('obakeEmissive');
  if (emissiveIntensity) override.emissiveIntensity = Number(emissiveIntensity);

  return override;
}

export function getObakeAvatarConfig(): ObakeAvatarDebugConfig {
  return { ...DEFAULT_CONFIG, ...readDevOverride() };
}

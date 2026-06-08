import * as THREE from 'three';

/** EXPLORE 城市 — 深紫 + 电蓝 + 霓虹品红迷幻科技基调 */
export const EXPLORE_CITY_PALETTE = {
  /** 霓虹边缘微光 — 深紫 */
  ember: new THREE.Color('#7b2cbf'),
  /** 主霓虹高光 — 电蓝 */
  amber: new THREE.Color('#00d4ff'),
  /** 立面微光 — 极暗紫（建筑体近纯黑，仅边缘用） */
  accent: new THREE.Color('#1a0a2e'),
  /** 远景雾 — 深紫黑 */
  fog: new THREE.Color('#0c0818'),
  intensity: 0.78,
};

/** 建筑立面旋钮 — 纯黑剪影，关闭窗光与纹理贡献 */
export const EXPLORE_BUILDING_FACADE = {
  intensity: 0.04,
  windowGlow: 0.0,
  triplanarScale: 0.42,
} as const;

/** 楼体环绕光带 — 部分随机楼、浅浅呼吸脉冲 */
export const EXPLORE_BUILDING_BANDS = {
  /** 拥有光带的楼宇占比 (~35%) */
  coverage: 0.35,
  /** 主场景光带强度 */
  intensity: 0.12,
  /** 地面镜像光带强度（减弱） */
  reflectIntensity: 0.042,
  /** 呼吸角速度 rad/s → 周期 ≈ 2π/speed ≈ 3s */
  breatheSpeed: 2.1,
  /** 呼吸深度：最暗 = 1-depth，最亮 = 1.0 */
  breatheDepth: 0.45,
  /** 光带半宽（单位盒 local Y，0.5=整楼高） */
  bandWidth: 0.016,
  /** 光带高度区间（楼高比例 0=底 1=顶） */
  heightMin: 0.2,
  heightMax: 0.85,
  /** hash < 此值 → 双光带，否则单光带 */
  twoBandChance: 0.5,
  purple: new THREE.Color('#7b2cbf'),
  cyan: new THREE.Color('#00d4ff'),
  magenta: new THREE.Color('#ff2d95'),
} as const;

import * as THREE from 'three';
import { EXPLORE_WORLD_SCALE } from '@/physics/rapier-config';

const s = EXPLORE_WORLD_SCALE;

/** 天空冷色补光方向（无可见月亮，仅用于 IBL / 平行光） */
const SKY_FILL_POSITION = [-48 * s, 82, -112 * s] as const;

/** 色温 (K) → sRGB 十六进制（近似黑体辐射） */
export function kelvinToHex(kelvin: number): string {
  const t = kelvin / 100;
  let r: number;
  let g: number;
  let b: number;

  if (t <= 66) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(t) - 161.1195681661));
    b = t <= 19 ? 0 : Math.min(255, Math.max(0, 138.5177312231 * Math.log(t - 10) - 305.0447927307));
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(t - 60, -0.1332047592)));
    g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(t - 60, -0.0755148492)));
    b = 255;
  }

  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const SUN_K = 3800;
const MOON_K = 7500;
const SKY_K = 10000;

export const EXPLORE_LIGHTING = {
  background: '#0a0612',
  exposure: 1.02,

  fog: {
    color: '#0c0818',
    near: 58 * s,
    far: 215 * s,
  },

  /** 图像基照明 (IBL) — 供 PBR / 反射地面采样 */
  environment: {
    intensity: 0.48,
    resolution: 256,
  },

  /** 极低强度环境光，避免完全黑影（主照明由 IBL + 平行光承担） */
  ambient: {
    color: '#5c5668',
    intensity: 0.045,
  },

  hemisphere: {
    skyColor: kelvinToHex(SKY_K),
    groundColor: '#1c141c',
    intensity: 0.38,
  },

  /** 落日主光源 — 暖色、低角度、投射阴影 */
  sun: {
    position: [72 * s, 14, 38 * s] as const,
    target: [0, 0, 0] as const,
    color: kelvinToHex(SUN_K),
    intensity: 2.8,
    shadow: {
      mapSize: 2048,
      cameraSize: 85 * s,
      bias: -0.00015,
      normalBias: 0.025,
      radius: 3,
    },
  },

  /** 天空冷色补光 — 无可见月亮 */
  skyFill: {
    color: kelvinToHex(MOON_K),
    intensity: 0.35,
    position: SKY_FILL_POSITION,
  },

  ground: {
    envMapIntensity: 0.92,
  },
} as const;

/** EXPLORE 全局光传输 — 霓虹 IBL + 半球补光（无日月） */
export const EXPLORE_GLOBAL_LIGHT = {
  environment: {
    intensity: 0.44,
    resolution: 192,
  },
  hemisphere: {
    skyColor: '#1a1040',
    groundColor: '#0a0a0c',
    intensity: 0.26,
  },
  ambient: {
    color: '#100818',
    intensity: 0.038,
  },
  /** 城市天际霓虹条 — 深紫 / 电蓝 / 品红 */
  strips: [
    {
      id: 'west',
      color: '#1a2838',
      intensity: 1.05,
      position: [-52 * s, 14, 0] as const,
      rotationY: Math.PI / 2,
      scale: [72 * s, 10, 1] as const,
    },
    {
      id: 'east',
      color: '#00d4ff',
      intensity: 1.55,
      position: [52 * s, 14, 0] as const,
      rotationY: -Math.PI / 2,
      scale: [72 * s, 10, 1] as const,
    },
    {
      id: 'north',
      color: '#ff2d95',
      intensity: 1.28,
      position: [0, 12, -58 * s] as const,
      rotationY: 0,
      scale: [88 * s, 8, 1] as const,
    },
    {
      id: 'south',
      color: '#1a1014',
      intensity: 0.95,
      position: [0, 12, 48 * s] as const,
      rotationY: Math.PI,
      scale: [88 * s, 8, 1] as const,
    },
  ],
} as const;

/** EXPLORE 漫射 / 泛光 — 霓虹在空气与立面上的自然晕开 */
export const EXPLORE_DIFFUSE = {
  bloom: {
    intensity: 0.58,
    luminanceThreshold: 0.38,
    luminanceSmoothing: 0.34,
    radius: 0.58,
  },
  vignette: {
    offset: 0.16,
    darkness: 0.96,
  },
  /** 指数雾密度 — 略增紫雾感，不洗白 */
  fogDensity: 0.0066,
  exposure: 1.05,
} as const;

export function getSkyFillLightPosition(): THREE.Vector3Tuple {
  return [...SKY_FILL_POSITION] as THREE.Vector3Tuple;
}

export function applyExploreFog(scene: THREE.Scene): void {
  const { fog } = EXPLORE_LIGHTING;
  scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
  scene.background = new THREE.Color(EXPLORE_LIGHTING.background);
}

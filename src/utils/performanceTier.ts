/** 反射地面性能分级 — desktop / mobile / low */

export type PerformanceTier = 'desktop' | 'mobile' | 'low';

export type PerformancePreset = {
  resolution: number;
  blur: [number, number];
  distortionStrength: number;
  segments: number;
  dprMax: number;
};

export const PERFORMANCE_PRESETS: Record<PerformanceTier, PerformancePreset> = {
  desktop: {
    resolution: 1024,
    blur: [500, 120],
    distortionStrength: 0.008,
    segments: 256,
    dprMax: 1.5,
  },
  mobile: {
    resolution: 512,
    blur: [260, 80],
    distortionStrength: 0.004,
    segments: 128,
    dprMax: 1.25,
  },
  low: {
    resolution: 256,
    blur: [120, 40],
    distortionStrength: 0.002,
    segments: 64,
    dprMax: 1,
  },
};

/** 根据 UA / 内存 / 核心数推断分级 */
export function detectPerformanceTier(): PerformanceTier {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(ua);
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 8;

  if (mobile && ((memory !== undefined && memory <= 4) || cores <= 4)) {
    return 'low';
  }
  if (mobile) return 'mobile';
  return 'desktop';
}

export function getPerformancePreset(tier: PerformanceTier = detectPerformanceTier()): PerformancePreset {
  return PERFORMANCE_PRESETS[tier];
}

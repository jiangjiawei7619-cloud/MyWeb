/** 渲染质量分级。禁止直接使用原始 devicePixelRatio，统一走这里 clamp。 */

export type QualityPreset = 'high' | 'medium' | 'low';
export type PerformanceTier = QualityPreset;

export type PerformancePreset = {
  quality: QualityPreset;
  resolution: number;
  blur: [number, number];
  distortionStrength: number;
  segments: number;
  dprMax: number;
  bloomScale: number;
  bloomIntensity: number;
  bloomRadius: number;
  enableBloom: boolean;
  enableDynamicShadows: boolean;
};

export const PERFORMANCE_PRESETS: Record<QualityPreset, PerformancePreset> = {
  high: {
    quality: 'high',
    resolution: 1024,
    blur: [220, 56],
    distortionStrength: 0.006,
    segments: 160,
    dprMax: 1.5,
    bloomScale: 0.5,
    bloomIntensity: 0.36,
    bloomRadius: 0.3,
    enableBloom: true,
    enableDynamicShadows: true,
  },
  medium: {
    quality: 'medium',
    resolution: 512,
    blur: [150, 42],
    distortionStrength: 0.004,
    segments: 96,
    dprMax: 1.25,
    bloomScale: 0.25,
    bloomIntensity: 0.26,
    bloomRadius: 0.24,
    enableBloom: true,
    enableDynamicShadows: false,
  },
  low: {
    quality: 'low',
    resolution: 256,
    blur: [64, 24],
    distortionStrength: 0.002,
    segments: 48,
    dprMax: 1,
    bloomScale: 0.25,
    bloomIntensity: 0.08,
    bloomRadius: 0.16,
    enableBloom: false,
    enableDynamicShadows: false,
  },
};

function parseQuality(value: string | null | undefined): QualityPreset | null {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return null;
}

/** 根据 URL/localStorage/UA/内存/核心数推断分级。URL: ?quality=low */
export function detectPerformanceTier(): QualityPreset {
  if (typeof window !== 'undefined') {
    const urlQuality = parseQuality(new URLSearchParams(window.location.search).get('quality'));
    if (urlQuality) return urlQuality;
    const storedQuality = parseQuality(window.localStorage?.getItem('sasmy-quality'));
    if (storedQuality) return storedQuality;
  }

  if (typeof navigator === 'undefined') return 'high';

  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(ua);
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 8;

  if (mobile && ((memory !== undefined && memory <= 4) || cores <= 4)) {
    return 'low';
  }
  if (mobile) return 'medium';
  if ((memory !== undefined && memory <= 4) || cores <= 4) return 'medium';
  return 'high';
}

export function getPerformancePreset(tier: QualityPreset = detectPerformanceTier()): PerformancePreset {
  return PERFORMANCE_PRESETS[tier];
}

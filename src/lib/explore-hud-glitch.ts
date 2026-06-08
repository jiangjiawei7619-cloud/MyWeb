/** Explore 全息 HUD 屏：Works 式 burst + 破败衰减（shader 参数） */
export const HUD_SCREEN_GLITCH = {
  // Burst length: target 0.40 ~ 0.55s.
  duration: 0.52,
  // Discrete steps for layered horizontal-slice flicker.
  steps: 16,

  // After-burst decay window (still within a single interval cycle).
  decayTime: 0.32,

  // "破败" 线/静电强度
  staticStrength: 0.22,
  grimeStrength: 0.12,
  blackoutStrength: 0.28,

  // Scanline / LCD feel
  scanlineStrength: 0.10,

  // Some screens can be stable (glitch disabled).
  enableRatio: 0.72,

  // Default per-screen interval range (seconds).
  intervalMin: 3.0,
  intervalSpan: 4.0,

  // Extra dropout (rare).
  dropoutChance: 0.08,
} as const;


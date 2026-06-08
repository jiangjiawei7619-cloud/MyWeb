/** Works 封面切换同款故障 burst 参数（shader uniform）— 3D 断层艺术 */
export const POSTER_GLITCH_BURST = {
  duration: 0.48,
  steps: 12,
  /** 两次 burst 之间的最短间隔（秒） */
  intervalMin: 5.5,
  /** 在 intervalMin 之上叠加的随机跨度（秒） */
  intervalSpan: 6.5,
  /** 约多少比例的海报带定时故障 */
  enableRatio: 0.55,
  /** 已启用故障的海报中，各 3D 模式占比（合计 1）— 前 5 项共 80% */
  /** Mode 1 — RGB Z 轴通道分离 */
  rgbZLayerRatio: 0.16,
  /** Mode 2 — 扫描线全息上浮 */
  scanlineHoloRatio: 0.16,
  /** Mode 3 — 立体像素块剥离 */
  blockPeelRatio: 0.16,
  /** Mode 4 — 信号噪点 + 3D 视差 */
  signalNoise3dRatio: 0.16,
  /** Mode 5 — 不规则闪烁 + 3D 视差 */
  irregularFlicker3dRatio: 0.16,
  /** Mode 6 — 全效复合断层艺术 */
  composite3dRatio: 0.2,
  /** 视差强度（UV 偏移倍率） */
  parallaxStrength: 1.0,
  /** RGB Z 层深度间距 */
  rgbLayerDepth: 1.0,
  /** 扫描线全息上浮强度 */
  scanlineLift: 1.0,
  /** 像素块剥离强度 */
  blockPeelStrength: 1.0,
} as const;

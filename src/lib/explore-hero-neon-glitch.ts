/** Hero landmark neon — timed layered decay flicker (shader uniform) */
export const HERO_NEON_GLITCH = {
  /** Main malfunction burst window */
  duration: 0.85,
  steps: 16,
  interval: 4.2,
  /** Layer A — full-frame brown-out */
  layerAInterval: 5.8,
  layerADuration: 0.12,
  /** Layer B — text regions */
  layerBInterval: 3.1,
  layerBDuration: 0.55,
  /** Layer C — hex core glitch */
  layerCInterval: 6.4,
  layerCDuration: 0.38,
  /** Layer D — side widget strobe */
  layerDInterval: 2.4,
  layerDDuration: 0.42,
} as const;

export interface HeroNeonSignPlacement {
  x: number;
  y: number;
  z: number;
  width: number;
  /** 1024×571 source texture */
  aspect: number;
  rotationY: number;
  frameColor: string;
  bloomBoost: number;
  outerGlow: number;
  posterGain: number;
  posterGainBurst: number;
  /** Per-sign flicker phase offset */
  phase: number;
  seed: number;
}

/** Large hero signs — separate from instanced batch */
export const HERO_NEON_SIGNS: HeroNeonSignPlacement[] = [
  {
    /** West plaza wall — faces spawn [0, ~2, 0] */
    x: -16.2,
    y: 16,
    z: 3,
    width: 14,
    aspect: 1024 / 571,
    rotationY: Math.PI / 2,
    frameColor: '#ff4a42',
    bloomBoost: 1.02,
    outerGlow: 1.28,
    posterGain: 1.88,
    posterGainBurst: 2.45,
    phase: 1.35,
    seed: 11.7,
  },
  {
    /** East tower — visible from central walk path */
    x: 17.8,
    y: 13.5,
    z: -6,
    width: 12,
    aspect: 1024 / 571,
    rotationY: -Math.PI / 2,
    frameColor: '#e8456a',
    bloomBoost: 0.98,
    outerGlow: 1.22,
    posterGain: 1.78,
    posterGainBurst: 2.35,
    phase: 3.8,
    seed: 27.3,
  },
  {
    /** North corridor — over central void, faces south */
    x: 2.5,
    y: 18,
    z: -39,
    width: 11,
    aspect: 1024 / 571,
    rotationY: 0,
    frameColor: '#ff7b46',
    bloomBoost: 1.0,
    outerGlow: 1.25,
    posterGain: 1.82,
    posterGainBurst: 2.4,
    phase: 6.1,
    seed: 44.9,
  },
];

/** @deprecated use HERO_NEON_SIGNS[0] */
export const HERO_NEON_SIGN = HERO_NEON_SIGNS[0]!;

export const HERO_NEON_TEXTURE_URL = '/textures/neon-signs/cyber-ui-sign.png';

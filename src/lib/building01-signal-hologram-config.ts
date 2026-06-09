import { REBECCA_GLITCH_BURST, REBECCA_REFLECT } from '@/lib/rebecca-hologram-config';

const BUILDING01 = {
  x: -25.719642299223366,
  z: -46.54030511288038,
  w: 11,
  d: 9,
  h: 16,
} as const;

const GLITCH_IMAGE_ASPECT = 1086 / 1448;
const wallWidth = BUILDING01.w * 0.96;
const wallHeight = BUILDING01.h * 0.9;
const posterWidth = Math.min(wallWidth, wallHeight * GLITCH_IMAGE_ASPECT);
const posterHeight = posterWidth / GLITCH_IMAGE_ASPECT;

export const BUILDING01_SIGNAL_HOLOGRAM = {
  texturePath: '/textures/building01-signal-dropout-hologram.png',
  placement: {
    x: BUILDING01.x,
    y: BUILDING01.h * 0.5,
    z: BUILDING01.z + BUILDING01.d * 0.5 + 0.22,
    rotationY: 0,
    width: posterWidth,
    height: posterHeight,
  },
  burst: {
    ...REBECCA_GLITCH_BURST,
    phase: 5.25,
    bodyBrightness: 2.62,
    bloomBoost: 0.2,
    neonSpill: 0.46,
  },
  reflect: REBECCA_REFLECT,
  signalDropout: {
    interval: 5.8,
    duration: 0.74,
    phase: 1.35,
    steps: 9,
    bands: 34,
    strength: 0.18,
  },
} as const;

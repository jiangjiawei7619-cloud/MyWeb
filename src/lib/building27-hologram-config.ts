import { REBECCA_GLITCH_BURST } from '@/lib/rebecca-hologram-config';

const BUILDING27 = {
  x: -12.505923508773831,
  z: -66.31433460931778,
  w: 10.31943986440669,
  d: 10.351860362570733,
  h: 7.166173531673849,
} as const;

const EVA01_IMAGE_ASPECT = 1672 / 941;
const wallWidth = BUILDING27.w * 0.96;
const wallHeight = BUILDING27.h * 0.9;
const posterWidth = Math.min(wallWidth, wallHeight * EVA01_IMAGE_ASPECT);
const posterHeight = posterWidth / EVA01_IMAGE_ASPECT;

export const BUILDING27_EVA_HOLOGRAM = {
  texturePath: '/textures/building27-eva01-hologram.png',
  placement: {
    x: BUILDING27.x,
    y: BUILDING27.h * 0.5,
    z: BUILDING27.z + BUILDING27.d * 0.5 + 0.22,
    rotationY: 0,
    width: posterWidth,
    height: posterHeight,
  },
  burst: {
    ...REBECCA_GLITCH_BURST,
    phase: 4.4,
    bodyBrightness: 2.7,
    bodyLumaCap: 1.08,
  },
  breathing: {
    interval: 6.2,
    duration: 2.15,
    phase: 0.8,
    brightnessAmp: 0.08,
    opacityAmp: 0.055,
    bloomAmp: 0.24,
    neonSpillAmp: 0.2,
  },
} as const;

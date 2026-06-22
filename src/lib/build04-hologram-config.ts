import { REBECCA_GLITCH_BURST } from '@/lib/rebecca-hologram-config';

const BUILD04 = {
  x: 30.08109260609872,
  z: -33.62505192289982,
  w: 10.67005516635254,
  d: 11.096217426567703,
  h: 25.42691583558917,
} as const;

const EVA01_IMAGE_ASPECT = 941 / 1672;
const wallWidth = BUILD04.d * 0.96;
const wallHeight = BUILD04.h * 0.9;
const posterWidth = Math.min(wallWidth, wallHeight * EVA01_IMAGE_ASPECT);
const posterHeight = posterWidth / EVA01_IMAGE_ASPECT;

export const BUILD04_EVA_HOLOGRAM = {
  texturePath: '/textures/build04-eva01-hologram.png',
  placement: {
    x: BUILD04.x - BUILD04.w * 0.5 - 0.22,
    y: BUILD04.h * 0.5,
    z: BUILD04.z,
    rotationY: -Math.PI / 2,
    width: posterWidth,
    height: posterHeight,
  },
  burst: {
    ...REBECCA_GLITCH_BURST,
    phase: 3.05,
  },
} as const;

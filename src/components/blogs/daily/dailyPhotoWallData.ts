export type DailyPhotoAccent = 'red' | 'cyan' | 'violet';

export type DailyPhoto = {
  id: string;
  src: string;
  title: string;
  date: string;
  description?: string;
  tags?: string[];
  aspectRatio?: number;
  accent?: DailyPhotoAccent;
};

export type DailyWallDebugMetrics = {
  scrollVelocity: number;
  curveStrength: number;
  visiblePhotoCount: number;
  currentScroll: number;
  fps: number;
  wallBounds: string;
};

export const DEBUG_DAILY_WALL = false;
export const DEBUG_DAILY_GLITCH = false;

export const WALL_CONFIG = {
  columns: 9,
  gapX: 2.18,
  gapY: 1.34,
  planeWidth: 1.84,
  planeHeight: 1.02,
  autoScrollSpeed: 0.08,
  maxScrollDelta: 324,
  maxScrollVelocity: 7.2,
  maxCurve: 2.2,
  maxLift: 1.1,
  cylinderArc: 2.65,
  velocityCurveFactor: 0.018,
  velocityLiftFactor: 0.012,
  recoveryDamping: 0.075,
  shaderDistortionStrength: 1,
  entryStagger: 0.035,
  entryDuration: 0.86,
} as const;

export const DAILY_GLITCH_REVEAL_CONFIG = {
  enabled: true,
  preserveOriginalEntry: true,
  disableGlobalVerticalReveal: true,
  glitchIntensity: 'medium',
  entryDuration: 1.003,
  entryStaggerBase: 0.0413,
  entryJitter: 0.1888,
  bootBorderStrength: 0.75,
  bootBorderDuration: 0.4248,
  glitchBurstCount: 2,
  glitchBurstDuration: 0.1416,
  sliceCount: 9,
  scanlineOpacity: 0.18,
  noiseBlockOpacity: 0.16,
  settleDuration: 0.4012,
  reduceMotion: true,
} as const;

export const DAILY_GLITCH_INTENSITY_PRESETS = {
  subtle: {
    maxGlitchStrength: 0.22,
    maxChromaticOffset: 0.002,
    maxSliceOffset: 0.012,
  },
  medium: {
    maxGlitchStrength: 0.42,
    maxChromaticOffset: 0.0045,
    maxSliceOffset: 0.028,
  },
  strong: {
    maxGlitchStrength: 0.58,
    maxChromaticOffset: 0.006,
    maxSliceOffset: 0.038,
  },
} as const;

export const PERFORMANCE_CONFIG = {
  maxDpr: 1.5,
  mobileMaxPhotos: 18,
  desktopMaxPhotos: 36,
  enableShaderDistortion: true,
  enableGlowEdges: true,
  reduceMotionFallback: true,
} as const;

export const DAILY_PHOTO_PLACEHOLDER_SRC = '/textures/neon-posters/poster_00.png';

const PHOTO_ASSETS = [
  '/textures/neon-posters/poster_09.png',
  '/textures/neon-posters/poster_06.png',
  '/textures/neon-posters/poster_00.png',
  '/textures/rebecca-hologram.png',
  '/textures/building08-a-poster.png',
  '/textures/build04-eva01-hologram.png',
  '/textures/building27-eva01-hologram.png',
  '/textures/building01-signal-dropout-hologram.png',
  '/textures/neon-signs/hero-cyber-sign.png',
  '/textures/neon-signs/cyber-ui-sign.png',
] as const;

const TITLES = [
  'Neon rain reference',
  'Late terminal cleanup',
  'Glass district pass',
  'Quiet debug hour',
  'Archive signal bloom',
  'Scene graph refactor',
  'Reading mode pulse',
  'Morning route notes',
  'Shader budget check',
  'Hologram corridor',
  'Redline memory stack',
  'Cyan window study',
  'Subway afterimage',
  'Night build receipt',
  'Small victory log',
  'Interface static',
  'City block rehearsal',
  'Texture atlas drift',
  'Control room silence',
  'Poster wall sweep',
  'Low motion pass',
  'Synthetic sunrise',
  'Run loop diary',
  'Broken signal charm',
  'Faint violet cache',
  'Field note residue',
  'Chrome edge trace',
  'Blackbox reflection',
  'Zero hour snapshot',
  'Memory surface test',
] as const;

const DESCRIPTIONS = [
  'Collected color ratios and rain-glow references for the next environment pass.',
  'A small note from a long night: less noise, sharper hierarchy, calmer motion.',
  'Facade tests, soft cyan bloom, and a reminder that restraint makes the neon hit harder.',
  'One of those quiet sessions where deleting code feels like finally opening a window.',
  'A captured poster fragment from the personal archive stream.',
] as const;

const TAG_SETS = [
  ['FIELD_LOG', 'NEON', 'NIGHT'],
  ['WEBGL', 'HUD', 'REFLECT'],
  ['DAILY', 'TEXTURE', 'SIGNAL'],
  ['SHADER', 'CITY', 'SCANLINE'],
  ['MEMORY', 'ARCHIVE', 'CYAN'],
] as const;

const ACCENTS: DailyPhotoAccent[] = ['red', 'cyan', 'violet'];

export const dailyPhotos: DailyPhoto[] = TITLES.map((title, index) => ({
  id: `daily-wall-${String(index + 1).padStart(2, '0')}`,
  src: PHOTO_ASSETS[index % PHOTO_ASSETS.length],
  title,
  date: `2026-06-${String(24 - (index % 18)).padStart(2, '0')}`,
  description: DESCRIPTIONS[index % DESCRIPTIONS.length],
  tags: [...TAG_SETS[index % TAG_SETS.length]],
  aspectRatio: 1.57,
  accent: ACCENTS[index % ACCENTS.length],
}));

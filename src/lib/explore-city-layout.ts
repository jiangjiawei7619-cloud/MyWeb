import * as THREE from 'three';
import { EXPLORE_WORLD_SCALE } from '@/physics/rapier-config';

export interface ExploreBuilding {
  x: number;
  z: number;
  yBase: number;
  w: number;
  d: number;
  h: number;
  seed: number;
  type: number;
  material: number;
  isTier: boolean;
  antenna: boolean;
}

import { POSTER_GLITCH_BURST } from '@/lib/explore-poster-glitch';
import { REBECCA_LANDMARK } from '@/lib/rebecca-hologram-config';

/** 细柱广告牌塔 — 立柱无比例约束，顶部单面海报牌符合 POSTER_ASPECTS */
export interface ExplorePylon {
  x: number;
  z: number;
  poleHeight: number;
  poleRadius: number;
  seed: number;
}

/** 双细柱角落地标 — 两根立柱撑一块大广告牌，固定在世界对角 */
export interface ExploreDualPylon {
  x: number;
  z: number;
  poleHeight: number;
  poleRadius: number;
  /** 两柱中心间距（沿广告牌宽度轴） */
  poleSpacing: number;
  rotationY: number;
  seed: number;
}

export interface ExploreNeonSign {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rotationY: number;
  seed: number;
  posterIndex: number;
  color: THREE.Color;
  /** 是否启用 Works 式定时故障 burst */
  glitchEnabled: boolean;
  /** 0=无故障, 1=RGB分离, 2=扫描线, 3=像素块撕裂, 4=信号噪点, 5=不规则闪烁, 6=遗留复合 */
  glitchMode: number;
  glitchInterval: number;
  glitchPhase: number;
}

type CityZone = 'entry' | 'sparse';

const ENTRY_SKYSCRAPER_RATE = 0.2;
const SPARSE_SKYSCRAPER_RATE = 0.03;
const CITY_POSITION_SCALE = EXPLORE_WORLD_SCALE;

function scaleCityCoord(value: number): number {
  return value * CITY_POSITION_SCALE;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pushBuilding(
  list: ExploreBuilding[],
  rand: () => number,
  bx: number,
  bz: number,
  zone: CityZone,
) {
  const edgeBias = Math.min(1, Math.abs(bx) / 55);
  const roll = rand();
  let type = 0;
  let w: number;
  let d: number;
  let h: number;

  const skyRate = zone === 'entry' ? ENTRY_SKYSCRAPER_RATE : SPARSE_SKYSCRAPER_RATE;

  if (roll < skyRate) {
    type = 1;
    w = 3.8 + rand() * 2.8;
    d = 3.8 + rand() * 2.8;
    h = 22 + rand() * 23;
  } else if (roll < skyRate + (zone === 'entry' ? 0.38 : 0.28)) {
    type = 2;
    w = 9 + rand() * 7;
    d = 9 + rand() * 7;
    h = zone === 'entry' ? 6 + rand() * 12 : 5 + rand() * 8;
  } else {
    type = 0;
    w = 7 + rand() * 6;
    d = 7 + rand() * 6;
    if (zone === 'entry') {
      h = 8 + rand() * 27;
    } else {
      h = 6 + rand() * (10 + edgeBias * 4);
    }
  }

  const aspect = 0.78 + rand() * 0.44;
  if (rand() < 0.5) w *= aspect;
  else d *= aspect;

  const mr = rand();
  let material: number;
  if (type === 1) material = mr < 0.45 ? 0 : mr < 0.75 ? 3 : 2;
  else if (type === 2) material = mr < 0.55 ? 1 : 2;
  else material = mr < 0.35 ? 0 : mr < 0.65 ? 1 : mr < 0.88 ? 2 : 3;

  const seed = rand() * 100;
  list.push({
    x: scaleCityCoord(bx),
    z: scaleCityCoord(bz),
    yBase: 0,
    w,
    d,
    h,
    seed,
    type,
    material,
    isTier: false,
    antenna: type === 1 && h > 28 && rand() < 0.32,
  });

  if (type === 1 && h > 24 && rand() < 0.28) {
    let topY = h;
    let curW = w;
    let curD = d;
    const tiers = rand() < 0.3 ? 1 : 0;
    for (let tIdx = 0; tIdx <= tiers; tIdx++) {
      curW *= 0.58 + rand() * 0.18;
      curD *= 0.58 + rand() * 0.18;
      const th = h * (0.2 + rand() * 0.14);
      list.push({
        x: scaleCityCoord(bx),
        z: scaleCityCoord(bz),
        yBase: topY,
        w: curW,
        d: curD,
        h: th,
        seed: seed + 13.7 * (tIdx + 1),
        type,
        material,
        isTier: true,
        antenna: false,
      });
      topY += th;
    }
  }
}

/** 深紫 / 电蓝 / 霓虹品红 — 迷幻科技色调 */
const SIGN_FRAME_COLORS = ['#9d4edd', '#00d4ff', '#ff2d95', '#7b2cbf', '#00b8ff', '#e040fb'];
const SIGN_ATTACH_BASE = 0.22;

/** 海报友好立面比例 — w/h */
const POSTER_ASPECTS = [16 / 9, 1, 4 / 3] as const;

function pickPosterAspect(rand: () => number): number {
  return POSTER_ASPECTS[Math.floor(rand() * POSTER_ASPECTS.length)]!;
}

function sizeSignForFace(
  faceWidth: number,
  faceHeight: number,
  aspect: number,
  rand: () => number,
): { w: number; h: number } {
  const maxW = faceWidth * 0.9;
  const maxH = faceHeight * 0.52;
  let w = maxW * (0.62 + rand() * 0.22);
  let h = w / aspect;
  if (h > maxH) {
    h = maxH * (0.82 + rand() * 0.12);
    w = h * aspect;
  }
  w = Math.min(w, maxW);
  h = Math.min(h, maxH);
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;
  return { w, h };
}

function sizeTallSign(
  faceWidth: number,
  faceHeight: number,
  rand: () => number,
): { w: number; h: number } {
  const vertical = rand() < 0.55;
  if (vertical) {
    const w = Math.min(faceWidth * 0.35, 1.4 + rand() * 2.2);
    const h = Math.min(faceHeight * 0.55, 5 + rand() * (faceHeight * 0.38));
    return { w, h };
  }
  const w = Math.min(faceWidth * 0.72, 3 + rand() * 5);
  const h = Math.min(faceHeight * 0.42, 2.5 + rand() * 6);
  return { w, h };
}

function pushSignGlitch(rand: () => number): Pick<
  ExploreNeonSign,
  'glitchEnabled' | 'glitchMode' | 'glitchInterval' | 'glitchPhase'
> {
  const glitchEnabled = rand() < POSTER_GLITCH_BURST.enableRatio;
  let glitchMode = 0;
  if (glitchEnabled) {
    const modeRoll = rand();
    const {
      rgbZLayerRatio,
      scanlineHoloRatio,
      blockPeelRatio,
      signalNoise3dRatio,
      irregularFlicker3dRatio,
      composite3dRatio,
    } = POSTER_GLITCH_BURST;
    let threshold = rgbZLayerRatio;
    if (modeRoll < threshold) glitchMode = 1;
    else if (modeRoll < (threshold += scanlineHoloRatio)) glitchMode = 2;
    else if (modeRoll < (threshold += blockPeelRatio)) glitchMode = 3;
    else if (modeRoll < (threshold += signalNoise3dRatio)) glitchMode = 4;
    else if (modeRoll < (threshold += irregularFlicker3dRatio)) glitchMode = 5;
    else if (modeRoll < threshold + composite3dRatio) glitchMode = 6;
    else glitchMode = 1;
  }
  const glitchInterval =
    POSTER_GLITCH_BURST.intervalMin + rand() * POSTER_GLITCH_BURST.intervalSpan;
  const glitchPhase = rand() * glitchInterval;
  return { glitchEnabled, glitchMode, glitchInterval, glitchPhase };
}

function attachPosterFace(
  signs: ExploreNeonSign[],
  b: ExploreBuilding,
  face: 'px' | 'nx' | 'pz' | 'nz',
  aspect: number,
  rand: () => number,
  palette: THREE.Color[],
  posterSlot: number,
): number {
  const faceWidth = face === 'px' || face === 'nx' ? b.d : b.w;
  const { w, h } = sizeSignForFace(faceWidth, b.h, aspect, rand);
  if (w < 1.2 || h < 1.2) return posterSlot;

  let x = b.x;
  let z = b.z;
  let rotationY = 0;
  const inset = 0.14;

  switch (face) {
    case 'px':
      x = b.x + b.w * 0.5 + inset;
      z = b.z;
      rotationY = Math.PI / 2;
      break;
    case 'nx':
      x = b.x - b.w * 0.5 - inset;
      z = b.z;
      rotationY = -Math.PI / 2;
      break;
    case 'pz':
      x = b.x;
      z = b.z + b.d * 0.5 + inset;
      rotationY = 0;
      break;
    case 'nz':
      x = b.x;
      z = b.z - b.d * 0.5 - inset;
      rotationY = Math.PI;
      break;
  }

  signs.push({
    x,
    y: b.yBase + b.h * (0.32 + rand() * 0.28),
    z,
    w,
    h,
    rotationY,
    seed: rand() * 100,
    posterIndex: posterSlot % 12,
    color: palette[Math.floor(rand() * palette.length)]!.clone(),
    ...pushSignGlitch(rand),
  });
  return posterSlot + 1;
}

function attachSigns(buildings: ExploreBuilding[], rand: () => number): ExploreNeonSign[] {
  const signs: ExploreNeonSign[] = [];
  const palette = SIGN_FRAME_COLORS.map((hex) => new THREE.Color(hex));
  let posterSlot = 0;

  for (const b of buildings) {
    if (b.isTier || b.h < 6) continue;

    const isTall = b.type === 1 || b.h > 20;
    const isMediumLow = !isTall && b.yBase === 0 && b.h <= 18;

    if (isMediumLow) {
      if (rand() > SIGN_ATTACH_BASE * 0.55) continue;
      const faces: Array<'px' | 'nx' | 'pz' | 'nz'> = ['px', 'nx', 'pz', 'nz'];
      const faceCount = 1 + Math.floor(rand() * 3);
      for (let fi = 0; fi < faceCount; fi++) {
        const face = faces[Math.floor(rand() * faces.length)]!;
        const aspect = rand() < 0.72 ? pickPosterAspect(rand) : POSTER_ASPECTS[fi % POSTER_ASPECTS.length]!;
        posterSlot = attachPosterFace(signs, b, face, aspect, rand, palette, posterSlot);
      }
      continue;
    }

    if (isTall) {
      if (rand() > 0.42) continue;
      const towardCenterX = b.x > 0 ? -1 : 1;
      const towardCenterZ = b.z > 0 ? -1 : 1;
      const useXFace = rand() < 0.68;
      const faceWidth = useXFace ? b.d : b.w;
      const { w, h } = sizeTallSign(faceWidth, b.h, rand);
      if (w < 1 || h < 1.5) continue;

      let x: number;
      let z: number;
      let rotationY: number;

      if (useXFace) {
        x = b.x + towardCenterX * (b.w * 0.5 + 0.12);
        z = b.z;
        rotationY = towardCenterX > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        x = b.x;
        z = b.z + towardCenterZ * (b.d * 0.5 + 0.12);
        rotationY = towardCenterZ > 0 ? 0 : Math.PI;
      }

      signs.push({
        x,
        y: b.yBase + b.h * (0.22 + rand() * 0.52),
        z,
        w,
        h,
        rotationY,
        seed: rand() * 100,
        posterIndex: posterSlot % 12,
        color: palette[Math.floor(rand() * palette.length)]!.clone(),
        ...pushSignGlitch(rand),
      });
      posterSlot += 1;
      continue;
    }

    if (rand() > SIGN_ATTACH_BASE * 0.45) continue;
    const towardCenterX = b.x > 0 ? -1 : 1;
    const towardCenterZ = b.z > 0 ? -1 : 1;
    const useXFace = rand() < 0.72;
    const aspect = pickPosterAspect(rand);
    const faceWidth = useXFace ? b.d : b.w;
    const { w, h } = sizeSignForFace(faceWidth, b.h, aspect, rand);

    let x: number;
    let z: number;
    let rotationY: number;

    if (useXFace) {
      x = b.x + towardCenterX * (b.w * 0.5 + 0.12);
      z = b.z;
      rotationY = towardCenterX > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = b.x;
      z = b.z + towardCenterZ * (b.d * 0.5 + 0.12);
      rotationY = towardCenterZ > 0 ? 0 : Math.PI;
    }

    signs.push({
      x,
      y: b.yBase + b.h * (0.28 + rand() * 0.48),
      z,
      w,
      h,
      rotationY,
      seed: rand() * 100,
      posterIndex: posterSlot % 12,
      color: palette[Math.floor(rand() * palette.length)]!.clone(),
      ...pushSignGlitch(rand),
    });
    posterSlot += 1;
  }

  return signs;
}

const PYLON_MIN_SPACING = 11;

/** 角标双柱广告牌 — 在 sizePylonSign 基础上再放大 2 倍（maxW 40m / minW 16m） */
function sizeDualPylonSign(
  poleHeight: number,
  rand: () => number,
): { w: number; h: number; aspect: number } {
  return sizePylonSign(poleHeight, rand, 2);
}

function sizePylonSign(
  poleHeight: number,
  rand: () => number,
  signScale = 1,
): { w: number; h: number; aspect: number } {
  const aspect = pickPosterAspect(rand);
  const heightRatio = 0.25 + rand() * 0.2;
  let h = poleHeight * heightRatio;
  let w = h * aspect;
  const maxW = 20;
  if (w > maxW) {
    w = maxW;
    h = w / aspect;
  }
  const minW = 8;
  if (w < minW) {
    w = minW;
    h = Math.min(w / aspect, poleHeight * 0.45);
    w = h * aspect;
  }
  w *= signScale;
  h *= signScale;
  return { w, h, aspect };
}

function pickPylonPoleHeight(rand: () => number): number {
  const tierRoll = rand();
  let base: number;
  if (tierRoll < 0.34) base = 10 + rand() * 5;
  else if (tierRoll < 0.67) base = 16 + rand() * 6;
  else base = 22 + rand() * 8;
  return base * (0.85 + rand() * 0.3);
}

function shufflePylonSlots<T>(slots: T[], rand: () => number): T[] {
  const shuffled = [...slots];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/** 入口边缘 — 非对称分布，避免左右镜像成对 */
const PYLON_ENTRY_SLOTS: { xMin: number; xMax: number; zMin: number; zMax: number }[] = [
  { xMin: -54, xMax: -44, zMin: -56, zMax: -36 },
  { xMin: 38, xMax: 50, zMin: -54, zMax: -34 },
  { xMin: -30, xMax: -18, zMin: -58, zMax: -46 },
  { xMin: 14, xMax: 26, zMin: -60, zMax: -50 },
  { xMin: -46, xMax: -34, zMin: -44, zMax: -30 },
  { xMin: 28, xMax: 40, zMin: -42, zMax: -28 },
  { xMin: -12, xMax: -4, zMin: -54, zMax: -44 },
  { xMin: 4, xMax: 14, zMin: -52, zMax: -40 },
];

/** 稀疏区 — 分散到四边与角落，减少扎堆 */
const PYLON_SPARSE_SLOTS: { xMin: number; xMax: number; zMin: number; zMax: number }[] = [
  { xMin: -62, xMax: -48, zMin: -58, zMax: -18 },
  { xMin: 48, xMax: 62, zMin: -58, zMax: -18 },
  { xMin: -58, xMax: -36, zMin: 12, zMax: 42 },
  { xMin: 36, xMax: 58, zMin: 12, zMax: 42 },
  { xMin: -52, xMax: -28, zMin: 38, zMax: 58 },
  { xMin: 28, xMax: 52, zMin: 38, zMax: 58 },
  { xMin: -48, xMax: 48, zMin: -72, zMax: -58 },
  { xMin: -22, xMax: -10, zMin: 44, zMax: 58 },
  { xMin: 10, xMax: 22, zMin: 44, zMax: 58 },
];

/** 世界对角角落 — NW 与 SE，远离 spawn [0,2,5] */
const DUAL_PYLON_CORNERS: { x: number; z: number }[] = [
  { x: -55, z: -55 },
  { x: 55, z: 55 },
];

const DUAL_PYLON_CLEARANCE = 18;

function generateDualPylons(rand: () => number, posterSlotStart: number): {
  dualPylons: ExploreDualPylon[];
  signs: ExploreNeonSign[];
} {
  const dualPylons: ExploreDualPylon[] = [];
  const signs: ExploreNeonSign[] = [];
  const palette = SIGN_FRAME_COLORS.map((hex) => new THREE.Color(hex));
  let posterSlot = posterSlotStart;

  for (const corner of DUAL_PYLON_CORNERS) {
    const scaledX = scaleCityCoord(corner.x);
    const scaledZ = scaleCityCoord(corner.z);
    const poleHeight = 30 + rand() * 12;
    const poleRadius = 0.14 + rand() * 0.06;
    const { w, h } = sizeDualPylonSign(poleHeight, rand);
    const poleSpacing = w * 0.78;

    const towardCenterX = corner.x > 0 ? -1 : 1;
    const towardCenterZ = corner.z > 0 ? -1 : 1;
    const useXFace = Math.abs(corner.x) >= Math.abs(corner.z);
    let rotationY = 0;
    if (useXFace) {
      rotationY = towardCenterX > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      rotationY = towardCenterZ > 0 ? 0 : Math.PI;
    }

    dualPylons.push({
      x: scaledX,
      z: scaledZ,
      poleHeight,
      poleRadius,
      poleSpacing,
      rotationY,
      seed: rand() * 100,
    });

    signs.push({
      x: scaledX,
      y: poleHeight + h * 0.5,
      z: scaledZ,
      w,
      h,
      rotationY,
      seed: rand() * 100,
      posterIndex: posterSlot % 12,
      color: palette[Math.floor(rand() * palette.length)]!.clone(),
      ...pushSignGlitch(rand),
    });
    posterSlot += 1;
  }

  return { dualPylons, signs };
}

function generatePylons(
  rand: () => number,
  posterSlotStart: number,
  avoidDual: ExploreDualPylon[] = [],
): {
  pylons: ExplorePylon[];
  signs: ExploreNeonSign[];
} {
  const pylons: ExplorePylon[] = [];
  const signs: ExploreNeonSign[] = [];
  const palette = SIGN_FRAME_COLORS.map((hex) => new THREE.Color(hex));
  const targetCount = 8 + Math.floor(rand() * 8);
  let posterSlot = posterSlotStart;

  const entryQuota = 3 + Math.floor(rand() * 4);
  const sparseQuota = targetCount - entryQuota;

  function tryPlace(slot: { xMin: number; xMax: number; zMin: number; zMax: number }) {
    const jitter = 3.5;
    const x =
      slot.xMin +
      rand() * (slot.xMax - slot.xMin) +
      (rand() - 0.5) * jitter;
    const z =
      slot.zMin +
      rand() * (slot.zMax - slot.zMin) +
      (rand() - 0.5) * jitter;
    const scaledX = scaleCityCoord(x);
    const scaledZ = scaleCityCoord(z);
    if (isCentralClearance(x, z)) return false;
    if (
      avoidDual.some(
        (d) =>
          Math.hypot(d.x - scaledX, d.z - scaledZ) <
          DUAL_PYLON_CLEARANCE * CITY_POSITION_SCALE,
      )
    ) {
      return false;
    }
    if (
      pylons.some(
        (p) =>
          Math.hypot(p.x - scaledX, p.z - scaledZ) <
          PYLON_MIN_SPACING * CITY_POSITION_SCALE,
      )
    ) {
      return false;
    }

    const poleHeight = pickPylonPoleHeight(rand);
    const poleRadius = (0.12 + rand() * 0.22) * (0.88 + rand() * 0.27);
    const signScale = 0.85 + rand() * 0.3;

    pylons.push({
      x: scaledX,
      z: scaledZ,
      poleHeight,
      poleRadius,
      seed: rand() * 100,
    });

    const { w, h } = sizePylonSign(poleHeight, rand, signScale);
    const towardCenterX = x > 0 ? -1 : 1;
    const towardCenterZ = z > 0 ? -1 : 1;
    const useRandomFacing = rand() < 0.28;
    const useXFace = useRandomFacing ? rand() < 0.5 : Math.abs(x) >= Math.abs(z);
    const inset = poleRadius + 0.1;

    let signX = scaledX;
    let signZ = scaledZ;
    let rotationY = 0;

    if (useRandomFacing) {
      const face = Math.floor(rand() * 4);
      switch (face) {
        case 0:
          signX = scaledX + inset;
          rotationY = Math.PI / 2;
          break;
        case 1:
          signX = scaledX - inset;
          rotationY = -Math.PI / 2;
          break;
        case 2:
          signZ = scaledZ + inset;
          rotationY = 0;
          break;
        default:
          signZ = scaledZ - inset;
          rotationY = Math.PI;
          break;
      }
    } else if (useXFace) {
      signX = scaledX + towardCenterX * inset;
      rotationY = towardCenterX > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      signZ = scaledZ + towardCenterZ * inset;
      rotationY = towardCenterZ > 0 ? 0 : Math.PI;
    }
    rotationY += (rand() - 0.5) * 0.45;

    signs.push({
      x: signX,
      y: poleHeight + h * 0.5,
      z: signZ,
      w,
      h,
      rotationY,
      seed: rand() * 100,
      posterIndex: posterSlot % 12,
      color: palette[Math.floor(rand() * palette.length)]!.clone(),
      ...pushSignGlitch(rand),
    });
    posterSlot += 1;
    return true;
  }

  const entrySlots = shufflePylonSlots(PYLON_ENTRY_SLOTS, rand);
  let entryPlaced = 0;
  for (const slot of entrySlots) {
    if (entryPlaced >= entryQuota) break;
    for (let attempt = 0; attempt < 5 && entryPlaced < entryQuota; attempt++) {
      if (tryPlace(slot)) entryPlaced += 1;
    }
  }
  for (let i = 0; i < entryQuota * 4 && entryPlaced < entryQuota; i++) {
    const slot = entrySlots[Math.floor(rand() * entrySlots.length)]!;
    if (tryPlace(slot)) entryPlaced += 1;
  }

  const sparseSlots = shufflePylonSlots(PYLON_SPARSE_SLOTS, rand);
  let sparsePlaced = 0;
  for (const slot of sparseSlots) {
    if (sparsePlaced >= sparseQuota) break;
    for (let attempt = 0; attempt < 4 && sparsePlaced < sparseQuota; attempt++) {
      if (tryPlace(slot)) sparsePlaced += 1;
    }
  }
  for (let i = 0; i < sparseQuota * 6 && sparsePlaced < sparseQuota; i++) {
    const slot = sparseSlots[Math.floor(rand() * sparseSlots.length)]!;
    if (tryPlace(slot)) sparsePlaced += 1;
  }

  return { pylons, signs };
}

function isCentralClearance(x: number, z: number): boolean {
  if (Math.abs(x) < 16 && z > -54 && z < 22) return true;
  if (Math.abs(x) < 10 && z > -60 && z < -40) return true;
  return false;
}

function isRebeccaLandmarkZone(x: number, z: number): boolean {
  const b = REBECCA_LANDMARK.building;
  return Math.abs(x - b.x) < b.w * 0.85 + 3 && Math.abs(z - b.z) < b.d * 0.85 + 3;
}

/** 入口正面密集错落楼群 — 玩家 spawn [0,2,5] 朝 -Z 所见 */
function generateEntryCluster(buildings: ExploreBuilding[], rand: () => number) {
  const zAnchors = [-28, -33, -39, -45, -51, -56];
  for (const baseZ of zAnchors) {
    const rowCount = 7 + Math.floor(rand() * 6);
    for (let i = 0; i < rowCount; i++) {
      const x = -40 + rand() * 80;
      const z = baseZ + (rand() - 0.5) * (5 + rand() * 2);
      if (isCentralClearance(x, z)) continue;
      if (isRebeccaLandmarkZone(x, z)) continue;
      if (z > -24 || z < -60) continue;
      pushBuilding(buildings, rand, x, z, 'entry');
    }
  }

  const accentCount = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < accentCount; i++) {
    const x = -38 + rand() * 76;
    const z = -30 - rand() * 24;
    if (isCentralClearance(x, z)) continue;
    if (isRebeccaLandmarkZone(x, z)) continue;
    pushBuilding(buildings, rand, x + (rand() - 0.5) * 4, z + (rand() - 0.5) * 5, 'entry');
  }
}

/** 稀疏散布 — 街区其余区域 */
function generateSparseBlocks(buildings: ExploreBuilding[], rand: () => number) {
  const blocks: { x0: number; x1: number; z0: number; z1: number; step: number }[] = [
    { x0: -62, x1: -15, z0: -58, z1: 42, step: 16 },
    { x0: 15, x1: 62, z0: -58, z1: 42, step: 16 },
    { x0: -48, x1: 48, z0: -68, z1: -40, step: 18 },
    { x0: -40, x1: 40, z0: 28, z1: 58, step: 18 },
  ];

  for (const block of blocks) {
    for (let z = block.z0; z <= block.z1; z += block.step) {
      for (let x = block.x0; x <= block.x1; x += block.step) {
        if (isCentralClearance(x, z)) continue;
        if (z > -60 && z < -24 && Math.abs(x) < 38) continue;

        if (rand() < 0.62) continue;

        const jx = x + (rand() - 0.5) * 5;
        const jz = z + (rand() - 0.5) * 5;
        pushBuilding(buildings, rand, jx, jz, 'sparse');
      }
    }
  }
}

/** Rebecca 全息地标 — 入口左墙固定立面 */
function pushRebeccaLandmarkBuilding(buildings: ExploreBuilding[]) {
  const b = REBECCA_LANDMARK.building;
  buildings.push({
    x: scaleCityCoord(b.x),
    z: scaleCityCoord(b.z),
    yBase: 0,
    w: b.w,
    d: b.d,
    h: b.h,
    seed: 9001,
    type: 0,
    material: 0,
    isTier: false,
    antenna: false,
  });
}

/** 静态赛博街区：中央留空给玩家与主海报 */
export function generateExploreCity(): {
  buildings: ExploreBuilding[];
  signs: ExploreNeonSign[];
  pylons: ExplorePylon[];
  dualPylons: ExploreDualPylon[];
} {
  const rand = mulberry32(20260302);
  const buildings: ExploreBuilding[] = [];

  pushRebeccaLandmarkBuilding(buildings);
  generateEntryCluster(buildings, rand);
  generateSparseBlocks(buildings, rand);

  const signs = attachSigns(buildings, rand);
  const { dualPylons, signs: dualSigns } = generateDualPylons(rand, signs.length);
  const { pylons, signs: pylonSigns } = generatePylons(rand, signs.length + dualSigns.length, dualPylons);
  return { buildings, signs: [...signs, ...dualSigns, ...pylonSigns], pylons, dualPylons };
}

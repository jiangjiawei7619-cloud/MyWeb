import * as THREE from 'three';

export const EXPLORE_DISTANCE_LOD = {
  fadeStart: 92,
  fadeEnd: 108,
  lod1Start: 68,
  lod1End: 88,
  lod2Start: 96,
  lod2End: 106,
  /** Beyond this: skip RGB burst layers and heavy spill passes */
  animFullEnd: 52,
  /** Beyond this: freeze time-driven animation (static poster) */
  animReducedEnd: 72,
  /** Full 3D glitch burst only within this range */
  glitchFullEnd: 48,
  fogColor: '#07070a',
  fogDensity: 0.014,
} as const;

export type ExploreAnimTier = 'full' | 'reduced' | 'static' | 'culled';
export type StableLodTier = 'hero' | 'near' | 'mid' | 'far' | 'hidden';

export interface LodRuntimeState {
  currentTier: StableLodTier;
  candidateTier: StableLodTier | null;
  stableFrames: number;
  lastDistance: number;
  lastVisible: boolean;
}

export const LOD_HYSTERESIS = {
  near: { enter: 45, exit: 55 },
  mid: { enter: 75, exit: 90 },
  far: { enter: 115, exit: 135 },
  stableFramesRequired: 6,
  frustumMargin: 1.25,
} as const;

const _frustum = new THREE.Frustum();
const _frustumMatrix = new THREE.Matrix4();
const _frustumSphere = new THREE.Sphere();

export function classifyExploreAnimTier(distance: number): ExploreAnimTier {
  if (distance >= EXPLORE_DISTANCE_LOD.fadeEnd) return 'culled';
  if (distance >= EXPLORE_DISTANCE_LOD.animReducedEnd) return 'static';
  if (distance >= EXPLORE_DISTANCE_LOD.animFullEnd) return 'reduced';
  return 'full';
}

export function createLodRuntimeState(initialTier: StableLodTier = 'hidden'): LodRuntimeState {
  return {
    currentTier: initialTier,
    candidateTier: null,
    stableFrames: 0,
    lastDistance: Number.POSITIVE_INFINITY,
    lastVisible: false,
  };
}

function classifyHysteresisDistance(distance: number, currentTier: StableLodTier): StableLodTier {
  const { near, mid, far } = LOD_HYSTERESIS;

  if (currentTier === 'hero') {
    if (distance <= near.exit) return 'hero';
    if (distance <= mid.exit) return 'near';
    if (distance <= far.exit) return 'mid';
    return 'hidden';
  }

  if (currentTier === 'near') {
    if (distance <= near.enter) return 'hero';
    if (distance <= mid.exit) return 'near';
    if (distance <= far.exit) return 'mid';
    return 'hidden';
  }

  if (currentTier === 'mid') {
    if (distance <= near.enter) return 'hero';
    if (distance <= mid.enter) return 'near';
    if (distance <= far.exit) return 'mid';
    return 'hidden';
  }

  if (currentTier === 'far') {
    if (distance <= near.enter) return 'hero';
    if (distance <= mid.enter) return 'near';
    if (distance <= far.enter) return 'mid';
    if (distance <= far.exit) return 'far';
    return 'hidden';
  }

  if (distance <= near.enter) return 'hero';
  if (distance <= mid.enter) return 'near';
  if (distance <= far.enter) return 'mid';
  if (distance <= far.exit) return 'far';
  return 'hidden';
}

export function updateLodRuntimeState(
  state: LodRuntimeState,
  distance: number,
  visibleWithMargin: boolean,
): StableLodTier {
  const nextCandidate = visibleWithMargin ? classifyHysteresisDistance(distance, state.currentTier) : 'hidden';
  state.lastDistance = distance;
  state.lastVisible = visibleWithMargin;

  if (nextCandidate === state.currentTier) {
    state.candidateTier = null;
    state.stableFrames = 0;
    return state.currentTier;
  }

  if (state.candidateTier !== nextCandidate) {
    state.candidateTier = nextCandidate;
    state.stableFrames = 1;
    return state.currentTier;
  }

  state.stableFrames += 1;
  if (state.stableFrames >= LOD_HYSTERESIS.stableFramesRequired) {
    state.currentTier = nextCandidate;
    state.candidateTier = null;
    state.stableFrames = 0;
  }

  return state.currentTier;
}

export function stableLodTierToExploreAnimTier(tier: StableLodTier): ExploreAnimTier {
  if (tier === 'hidden') return 'culled';
  if (tier === 'far') return 'static';
  if (tier === 'mid') return 'reduced';
  return 'full';
}

export function isInCameraFrustum(
  camera: THREE.Camera,
  position: THREE.Vector3,
  radius: number,
  margin = 1,
): boolean {
  _frustumMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _frustum.setFromProjectionMatrix(_frustumMatrix);
  _frustumSphere.set(position, radius * margin);
  return _frustum.intersectsSphere(_frustumSphere);
}

export type ExploreDistanceStats = {
  visibleObjects: number;
  culledObjects: number;
  lod0Count: number;
  lod1Count: number;
  lod2Count: number;
};

export function emptyExploreDistanceStats(): ExploreDistanceStats {
  return {
    visibleObjects: 0,
    culledObjects: 0,
    lod0Count: 0,
    lod1Count: 0,
    lod2Count: 0,
  };
}

export function classifyExploreDistance(distance: number): 'culled' | 'lod0' | 'lod1' | 'lod2' {
  if (distance >= EXPLORE_DISTANCE_LOD.fadeEnd) return 'culled';
  if (distance >= EXPLORE_DISTANCE_LOD.lod2Start) return 'lod2';
  if (distance >= EXPLORE_DISTANCE_LOD.lod1Start) return 'lod1';
  return 'lod0';
}

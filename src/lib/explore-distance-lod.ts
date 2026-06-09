export const EXPLORE_DISTANCE_LOD = {
  fadeStart: 92,
  fadeEnd: 108,
  lod1Start: 68,
  lod1End: 88,
  lod2Start: 96,
  lod2End: 106,
  fogColor: '#000000',
  fogDensity: 0.014,
} as const;

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

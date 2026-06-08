import * as THREE from 'three';

export type WorldRoutePath =
  | '/'
  | '/projects'
  | '/blog'
  | '/about'
  | '/contact'
  | '/404';

export type StructureId = 'core' | 'forge' | 'archive' | 'mirror' | 'void' | 'bridge';

export interface ViewpointConfig {
  position: THREE.Vector3Tuple;
  target: THREE.Vector3Tuple;
  fov: number;
}

export interface PerfTierConfig {
  terrainSegments: number;
  particleCount: number;
  fogPlanes: number;
  enabledStructures: StructureId[];
}

export const WORLD_COLORS = {
  fogNear: '#240000',
  fogFar: '#050202',
  skyTop: '#41060a',
  skyBottom: '#130204',
  sun: '#ff3f2f',
  terrainDark: '#120507',
  terrainGlow: '#ff2f2f',
  traceGlow: '#ff8a65',
  warning: '#ff6b5f',
};

export const ROUTE_VIEWPOINTS: Record<WorldRoutePath, ViewpointConfig> = {
  '/': {
    position: [24, 17, 32],
    target: [0, 1.8, 0],
    fov: 54,
  },
  '/projects': {
    position: [-30, 14, 18],
    target: [-20, 3, 6],
    fov: 50,
  },
  '/blog': {
    position: [10, 15, -28],
    target: [18, 5, -18],
    fov: 52,
  },
  '/about': {
    position: [28, 20, -16],
    target: [22, 7, -2],
    fov: 47,
  },
  '/contact': {
    position: [-12, 12, 34],
    target: [-26, 4, 22],
    fov: 56,
  },
  '/404': {
    position: [42, 24, -36],
    target: [30, 4, -30],
    fov: 62,
  },
};

export const STRUCTURE_ROUTE_MAP: Record<StructureId, WorldRoutePath> = {
  core: '/',
  forge: '/projects',
  archive: '/blog',
  mirror: '/about',
  bridge: '/contact',
  void: '/404',
};

export const STRUCTURE_POSITIONS: Record<StructureId, THREE.Vector3Tuple> = {
  core: [0, 2.4, 0],
  forge: [-20, 2.8, 6],
  archive: [18, 2.5, -18],
  mirror: [22, 4.6, -2],
  bridge: [-26, 2.1, 22],
  void: [30, 1.8, -30],
};

export const TRANSITION_CONFIG = {
  durationSec: 1.2,
  quickFocusSec: 0.8,
  arcLift: 10,
  easeInOutCubic(t: number): number {
    if (t < 0.5) return 4 * t * t * t;
    return 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
};

export const PERF_TIER: Record<'desktop' | 'mobile' | 'low', PerfTierConfig> = {
  desktop: {
    terrainSegments: 100,
    particleCount: 2000,
    fogPlanes: 5,
    enabledStructures: ['core', 'forge', 'archive', 'mirror', 'void', 'bridge'],
  },
  mobile: {
    terrainSegments: 56,
    particleCount: 900,
    fogPlanes: 3,
    enabledStructures: ['core', 'forge', 'archive', 'mirror', 'bridge', 'void'],
  },
  low: {
    terrainSegments: 36,
    particleCount: 520,
    fogPlanes: 2,
    enabledStructures: ['core', 'forge', 'archive', 'mirror'],
  },
};

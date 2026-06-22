import type { ActivePage } from '@/lib/types';

export type Vector3Tuple = [number, number, number];
export type Vector2Tuple = [number, number];

export type NeonTier = 'hero' | 'near' | 'mid' | 'far';
export type LodTier = 'hero' | 'near' | 'mid' | 'far' | 'hidden';
export type MovementPhase = 'moving' | 'settling' | 'recovering' | 'stable';
export type DeviceTier = 'low' | 'medium' | 'high';
export type QualityPhase =
  | 'moving'
  | 'settling'
  | 'recoverGlow'
  | 'recoverBloom'
  | 'stable';

export type RenderableLodState = {
  lodTier: LodTier;
  visible: boolean;
  updateEnabled: boolean;
  bloomEnabled: boolean;
  raycastEnabled: boolean;
  animationEnabled: boolean;
};

export type BuildingRegistryEntry = {
  id: string;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  size: Vector3Tuple;
  type: 'tower' | 'block' | 'panel' | 'custom';
  lodTier: LodTier;
  visibleDistance: number;
  participatesInBloom: boolean;
  isInteractive: boolean;
};

export type NeonSignConfig = {
  id: string;
  tier: NeonTier;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  size: Vector2Tuple;
  textureId?: string;
  text?: string;
  color: string;
  flicker: number;
  glow: number;
  bloomWeight: number;
  /** Glitch poster atlas cell index populated from city layout. */
  posterIndex?: number;
  glitchEnabled?: boolean;
  glitchMode?: number;
  glitchInterval?: number;
  glitchPhase?: number;
  seed?: number;
};

export type NeonRegistryEntry = NeonSignConfig & {
  buildingId?: string;
  face?: 'A' | 'B' | 'C' | 'D';
  participatesInBloom: boolean;
  animated: boolean;
  interactive: boolean;
};

export type PagePanelRegistryEntry = {
  id: 'works' | 'blogs' | 'about';
  buildingId?: string;
  face?: 'A' | 'B' | 'C' | 'D';
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  size: Vector2Tuple;
  htmlEnabledDistance: number;
  interactive: boolean;
};

export type PosterRegistryEntry = {
  id: string;
  buildingId?: string;
  face?: 'A' | 'B' | 'C' | 'D';
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  size: Vector2Tuple;
  textureId: string;
  interactive: boolean;
  participatesInBloom: boolean;
  lodTier: LodTier;
};

export type RenderBudgetInput = {
  activeSection: ActivePage;
  cameraMoving: boolean;
  playerMoving: boolean;
  cameraSpeed: number;
  deviceTier: DeviceTier;
  nearHeroCount: number;
  scenePressure: {
    nearEmissiveCount: number;
    transparentLayerCount: number;
  };
  qualityPhase?: QualityPhase;
};

export type RenderBudget = {
  movementPhase: MovementPhase;
  bloomScale: number;
  glowScale: number;
  posterEffectScale: number;
  allowHeroEffects: boolean;
  allowFarGlow: boolean;
  dprMax: number;
  bloomEnabled: boolean;
  bloomIntensity: number;
  bloomResolutionScale: number;
  bloomLevels: number;
  farGlowEnabled: boolean;
  farAnimationEnabled: boolean;
  qualityPhase: QualityPhase;
};

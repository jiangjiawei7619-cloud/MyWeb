/** World pipeline feature flags with URL query overrides for gradual migration. */

export type WorldFeatureFlags = {
  useNewNeonSystem: boolean;
};

export type WorldRenderFlags = {
  enableHardVisibilityCulling: boolean;
  enableNearFrustumHardCulling: boolean;
  enableNearDistanceHardCulling: boolean;
  enableBuildingHardCulling: boolean;
  enablePosterHardCulling: boolean;
  enableNeonHardCulling: boolean;
  enableFarObjectSoftFade: boolean;
  enableShaderDetailScaling: boolean;
  enableRenderBudgetQualityScaling: boolean;
  enableCullingDebug: boolean;
};

const DEFAULT_FLAGS: WorldFeatureFlags = {
  useNewNeonSystem: true,
};

const DEFAULT_RENDER_FLAGS: WorldRenderFlags = {
  enableHardVisibilityCulling: false,
  enableNearFrustumHardCulling: false,
  enableNearDistanceHardCulling: false,
  enableBuildingHardCulling: false,
  enablePosterHardCulling: false,
  enableNeonHardCulling: false,
  enableFarObjectSoftFade: true,
  enableShaderDetailScaling: true,
  enableRenderBudgetQualityScaling: true,
  enableCullingDebug: false,
};

function readFlag(name: string): boolean | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get(name);
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return null;
}

export function getWorldFeatureFlags(): WorldFeatureFlags {
  const neon = readFlag('useNewNeonSystem') ?? readFlag('worldNeon');

  return {
    useNewNeonSystem: neon ?? DEFAULT_FLAGS.useNewNeonSystem,
  };
}

export function getWorldRenderFlags(): WorldRenderFlags {
  const hardCulling = readFlag('hardCulling') ?? readFlag('enableHardVisibilityCulling');

  return {
    enableHardVisibilityCulling:
      hardCulling ?? DEFAULT_RENDER_FLAGS.enableHardVisibilityCulling,
    enableNearFrustumHardCulling:
      readFlag('nearFrustumHardCulling') ??
      readFlag('enableNearFrustumHardCulling') ??
      hardCulling ??
      DEFAULT_RENDER_FLAGS.enableNearFrustumHardCulling,
    enableNearDistanceHardCulling:
      readFlag('nearDistanceHardCulling') ??
      readFlag('enableNearDistanceHardCulling') ??
      hardCulling ??
      DEFAULT_RENDER_FLAGS.enableNearDistanceHardCulling,
    enableBuildingHardCulling:
      readFlag('buildingHardCulling') ??
      readFlag('enableBuildingHardCulling') ??
      hardCulling ??
      DEFAULT_RENDER_FLAGS.enableBuildingHardCulling,
    enablePosterHardCulling:
      readFlag('posterHardCulling') ??
      readFlag('enablePosterHardCulling') ??
      hardCulling ??
      DEFAULT_RENDER_FLAGS.enablePosterHardCulling,
    enableNeonHardCulling:
      readFlag('neonHardCulling') ??
      readFlag('enableNeonHardCulling') ??
      hardCulling ??
      DEFAULT_RENDER_FLAGS.enableNeonHardCulling,
    enableFarObjectSoftFade:
      readFlag('farObjectSoftFade') ??
      readFlag('enableFarObjectSoftFade') ??
      DEFAULT_RENDER_FLAGS.enableFarObjectSoftFade,
    enableShaderDetailScaling:
      readFlag('shaderDetailScaling') ??
      readFlag('enableShaderDetailScaling') ??
      DEFAULT_RENDER_FLAGS.enableShaderDetailScaling,
    enableRenderBudgetQualityScaling:
      readFlag('renderBudgetQualityScaling') ??
      readFlag('enableRenderBudgetQualityScaling') ??
      DEFAULT_RENDER_FLAGS.enableRenderBudgetQualityScaling,
    enableCullingDebug:
      readFlag('cullingDebug') ??
      readFlag('enableCullingDebug') ??
      DEFAULT_RENDER_FLAGS.enableCullingDebug,
  };
}

export const WORLD_FEATURE_FLAGS = getWorldFeatureFlags();
export const WORLD_RENDER_FLAGS = getWorldRenderFlags();

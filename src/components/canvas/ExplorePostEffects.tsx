import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { EXPLORE_DIFFUSE } from '@/lib/explore-lighting';
import { detectPerformanceTier, getPerformancePreset } from '@/utils/performanceTier';

/**
 * EXPLORE 专用后处理 — 霓虹泛光扩散 + 暗角。
 */
export default function ExplorePostEffects() {
  const { bloom, vignette } = EXPLORE_DIFFUSE;
  const preset = getPerformancePreset(detectPerformanceTier());
  const bloomHeight = Math.round(720 * preset.bloomScale);

  if (!preset.enableBloom) {
    return (
      <EffectComposer multisampling={0}>
        <Vignette eskil={false} offset={vignette.offset} darkness={vignette.darkness} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={Math.min(bloom.intensity, preset.bloomIntensity)}
        luminanceThreshold={1.16}
        luminanceSmoothing={0.18}
        mipmapBlur
        height={bloomHeight}
        radius={Math.min(bloom.radius, preset.bloomRadius)}
        levels={4}
      />
      <Vignette eskil={false} offset={vignette.offset} darkness={vignette.darkness} />
    </EffectComposer>
  );
}

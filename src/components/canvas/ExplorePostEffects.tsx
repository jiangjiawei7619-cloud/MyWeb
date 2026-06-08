import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { EXPLORE_DIFFUSE } from '@/lib/explore-lighting';

/**
 * EXPLORE 专用后处理 — 霓虹泛光扩散 + 暗角。
 */
export default function ExplorePostEffects() {
  const { bloom, vignette } = EXPLORE_DIFFUSE;

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={bloom.intensity}
        luminanceThreshold={bloom.luminanceThreshold}
        luminanceSmoothing={bloom.luminanceSmoothing}
        mipmapBlur
        radius={bloom.radius}
      />
      <Vignette eskil={false} offset={vignette.offset} darkness={vignette.darkness} />
    </EffectComposer>
  );
}

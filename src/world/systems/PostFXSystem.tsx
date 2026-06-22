import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { BlendFunction, BloomEffect } from 'postprocessing';
import { EXPLORE_DIFFUSE } from '@/lib/explore-lighting';
import { emissiveBloomScale } from '@/lib/explore-emissive-pressure';
import { useRenderBudget } from '@/world/RenderBudgetSystem';

function BudgetedBloomEffect({
  targetIntensity,
  luminanceThreshold,
  luminanceSmoothing,
  height,
  radius,
  levels,
}: {
  targetIntensity: number;
  luminanceThreshold: number;
  luminanceSmoothing: number;
  height: number;
  radius: number;
  levels: number;
}) {
  const intensityRef = useRef(0);
  const effect = useMemo(
    () =>
      new BloomEffect({
        blendFunction: BlendFunction.ADD,
        intensity: 0,
        luminanceThreshold,
        luminanceSmoothing,
        mipmapBlur: true,
        height,
        radius,
        levels,
      }),
    [height, levels, luminanceSmoothing, luminanceThreshold, radius],
  );

  useFrame((_, delta) => {
    intensityRef.current = THREE.MathUtils.damp(intensityRef.current, targetIntensity, 7.5, delta);
    effect.intensity = intensityRef.current;
  });

  useEffect(() => () => effect.dispose(), [effect]);

  return <primitive object={effect} />;
}

export default function PostFXSystem() {
  const { bloom, vignette } = EXPLORE_DIFFUSE;
  const budget = useRenderBudget();
  const fixedBloomHeightRef = useRef(Math.max(160, Math.round(720 * budget.bloomResolutionScale)));
  const fixedBloomLevelsRef = useRef(budget.bloomLevels);
  const bloomRadius = Math.min(bloom.radius, 0.3);
  const emissiveScale = emissiveBloomScale(budget.movementPhase === 'moving' ? 0 : 3);
  const targetBloomIntensity = budget.bloomEnabled
    ? Math.min(bloom.intensity, budget.bloomIntensity) * budget.bloomScale * emissiveScale
    : 0;

  return (
    <EffectComposer multisampling={0}>
      <BudgetedBloomEffect
        targetIntensity={targetBloomIntensity}
        luminanceThreshold={EXPLORE_DIFFUSE.bloom.luminanceThreshold}
        luminanceSmoothing={EXPLORE_DIFFUSE.bloom.luminanceSmoothing}
        height={fixedBloomHeightRef.current}
        radius={bloomRadius}
        levels={fixedBloomLevelsRef.current}
      />
      <Vignette eskil={false} offset={vignette.offset} darkness={vignette.darkness} />
    </EffectComposer>
  );
}

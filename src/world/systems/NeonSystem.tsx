import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EXPLORE_DISTANCE_LOD } from '@/lib/explore-distance-lod';
import { addNearEmissive, resetNearEmissiveCount } from '@/lib/explore-emissive-pressure';
import { POSTER_GLITCH_BURST } from '@/lib/explore-poster-glitch';
import {
  createHybridNeonPosterAtlas,
  getPosterAtlasCellSize,
  GLITCH_POSTER_COLS,
} from '@/lib/explore-neon-atlas';
import { HERO_NEON_TEXTURE_URL } from '@/lib/explore-hero-neon-glitch';
import { exploreNeonSignFrag, exploreNeonSignVert } from '@/shaders/exploreCity.glsl';
import { getNeonByTier, neonRegistry } from '@/world/registries/neonRegistry';
import { getWorldRenderFlags } from '@/lib/world-feature-flags';
import { useRenderBudget } from '@/world/RenderBudgetSystem';
import type { NeonRegistryEntry, NeonTier } from '@/world/types';

type TierBatch = 'hero' | 'near' | 'mid' | 'far';

const TIER_PERF: Record<TierBatch, [number, number, number]> = {
  hero: [0, 1.22, 1],
  near: [1, 1.08, 0.32],
  mid: [2, 0.92, 0],
  far: [3, 0.86, 0],
};

function createDistanceLodUniforms() {
  return {
    uDistanceFadeStart: { value: EXPLORE_DISTANCE_LOD.fadeStart },
    uDistanceFadeEnd: { value: EXPLORE_DISTANCE_LOD.fadeEnd },
    uLod1Start: { value: EXPLORE_DISTANCE_LOD.lod1Start },
    uLod1End: { value: EXPLORE_DISTANCE_LOD.lod1End },
    uLod2Start: { value: EXPLORE_DISTANCE_LOD.lod2Start },
    uLod2End: { value: EXPLORE_DISTANCE_LOD.lod2End },
    uFarFogColor: { value: new THREE.Color(EXPLORE_DISTANCE_LOD.fogColor) },
    uFarFogDensity: { value: EXPLORE_DISTANCE_LOD.fogDensity },
  };
}

function createInactiveMirrorUniforms() {
  return {
    uReflectFadeDepth: { value: 1 },
    uReflectDistNear: { value: 0 },
    uReflectDistFar: { value: 1 },
    uReflectDistStrength: { value: 0 },
    uReflectFresnelPower: { value: 1 },
    uReflectFresnelBoost: { value: 1 },
    uReflectBlurNear: { value: 0 },
    uReflectBlurFar: { value: 1 },
    uReflectBlurFogMix: { value: 0 },
    uCamPos: { value: new THREE.Vector3() },
  };
}

function createNeonSignUniforms(
  texture: THREE.Texture,
  atlasCell: THREE.Vector2,
  atlasCols: number,
): Record<string, THREE.IUniform> {
  return {
    uTime: { value: 0 },
    uReflect: { value: 0 },
    uReflectBoost: { value: 1 },
    uReflectGain: { value: 1 },
    ...createInactiveMirrorUniforms(),
    uBrickPitch: { value: 1 },
    uBrickGap: { value: 0 },
    uBrickOrigin: { value: new THREE.Vector2(-120, -120) },
    uSeamReflectGain: { value: 0 },
    uSurfaceReflectGain: { value: 0 },
    uSeamBlurScale: { value: 1 },
    uSurfaceBlurScale: { value: 1 },
    uUseEdgeGapMask: { value: 1 },
    uGapWidthFrac: { value: 0 },
    uGapFeather: { value: 0 },
    uReflectionSeamDistortion: { value: 0 },
    uSeamDistortionNoiseScale: { value: 1 },
    uSeamDistortionSpeed: { value: 0 },
    uDebugDistortedReflection: { value: 0 },
    uReflectSurfacePass: { value: 0 },
    ...createDistanceLodUniforms(),
    uGlitchDuration: { value: POSTER_GLITCH_BURST.duration },
    uGlitchSteps: { value: POSTER_GLITCH_BURST.steps },
    uGlitchEnableRatio: { value: POSTER_GLITCH_BURST.enableRatio },
    uGlitchIntervalMin: { value: POSTER_GLITCH_BURST.intervalMin },
    uGlitchIntervalSpan: { value: POSTER_GLITCH_BURST.intervalSpan },
    uParallaxStrength: { value: POSTER_GLITCH_BURST.parallaxStrength },
    uRgbLayerDepth: { value: POSTER_GLITCH_BURST.rgbLayerDepth },
    uScanlineLift: { value: POSTER_GLITCH_BURST.scanlineLift },
    uBlockPeelStrength: { value: POSTER_GLITCH_BURST.blockPeelStrength },
    uPosterAtlas: { value: texture },
    uAtlasCell: { value: atlasCell.clone() },
    uAtlasCols: { value: atlasCols },
    uSignBloomBoost: { value: 0.22 },
    uSignOuterGlow: { value: 0.72 },
    uPosterGlowThreshold: { value: 0.55 },
    uPosterGlowSoftness: { value: 0.16 },
    uPosterSaturationThreshold: { value: 0.22 },
    uPosterEmissiveBoost: { value: 1.8 },
    uPosterBaseBrightness: { value: 0.92 },
    uPosterPulseStrength: { value: 0.08 },
    uPosterScanlineStrength: { value: 0.035 },
    uGlitchFullEnd: { value: EXPLORE_DISTANCE_LOD.glitchFullEnd },
  };
}

function buildSignGeometry(entries: NeonRegistryEntry[], atlasCell: THREE.Vector2, tier: TierBatch) {
  const count = entries.length;
  const colors = new Float32Array(count * 3);
  const atlasOffsets = new Float32Array(count * 2);
  const atlasScales = new Float32Array(count * 2);
  const signPerf = new Float32Array(count * 3);
  const glitchA = new Float32Array(count * 2);
  const glitchB = new Float32Array(count * 2);
  const [perfTier, emissive, flicker] = TIER_PERF[tier];

  for (let i = 0; i < count; i++) {
    const entry = entries[i]!;
    const color = new THREE.Color(entry.color);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    const posterIndex = entry.posterIndex ?? 0;
    const col = posterIndex % GLITCH_POSTER_COLS;
    const row = Math.floor(posterIndex / GLITCH_POSTER_COLS);
    atlasOffsets[i * 2] = col * atlasCell.x;
    atlasOffsets[i * 2 + 1] = row * atlasCell.y;
    atlasScales[i * 2] = atlasCell.x;
    atlasScales[i * 2 + 1] = atlasCell.y;

    signPerf[i * 3] = perfTier;
    signPerf[i * 3 + 1] = emissive * (0.85 + entry.glow * 0.15);
    signPerf[i * 3 + 2] = flicker * entry.flicker;

    glitchA[i * 2] = entry.glitchEnabled ? 1 : 0;
    glitchA[i * 2 + 1] = entry.glitchMode ?? 0;
    glitchB[i * 2] = entry.glitchInterval ?? 0;
    glitchB[i * 2 + 1] = entry.glitchPhase ?? 0;
  }

  const g = new THREE.PlaneGeometry(1, 1);
  g.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
  g.setAttribute('aAtlasUvOffset', new THREE.InstancedBufferAttribute(atlasOffsets, 2));
  g.setAttribute('aAtlasUvScale', new THREE.InstancedBufferAttribute(atlasScales, 2));
  g.setAttribute('aSignPerf', new THREE.InstancedBufferAttribute(signPerf, 3));
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(Float32Array.from(entries.map((e) => e.seed ?? 0)), 1));
  g.setAttribute('aGlitchA', new THREE.InstancedBufferAttribute(glitchA, 2));
  g.setAttribute('aGlitchB', new THREE.InstancedBufferAttribute(glitchB, 2));
  return g;
}

function buildMatrices(entries: NeonRegistryEntry[]) {
  const dummy = new THREE.Object3D();
  return entries.map((entry) => {
    dummy.position.set(entry.position[0], entry.position[1], entry.position[2]);
    dummy.rotation.set(entry.rotation[0], entry.rotation[1], entry.rotation[2]);
    dummy.scale.set(entry.size[0], entry.size[1], 1);
    dummy.updateMatrix();
    return dummy.matrix.clone();
  });
}

function NeonSignBatch({
  entries,
  tier,
  texture,
  textureKey,
  atlasCell,
  atlasCols,
  bloomWeightScale,
  animate,
}: {
  entries: NeonRegistryEntry[];
  tier: TierBatch;
  texture: THREE.Texture;
  textureKey: 'neonAtlas' | 'heroNeon';
  atlasCell: THREE.Vector2;
  atlasCols: number;
  bloomWeightScale: number;
  animate: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = entries.length;
  const geometry = useMemo(() => buildSignGeometry(entries, atlasCell, tier), [entries, atlasCell, tier]);
  const matrices = useMemo(() => buildMatrices(entries), [entries]);
  const anchor = useMemo(() => {
    const center = new THREE.Vector3();
    if (entries.length === 0) return center;
    for (const entry of entries) {
      center.x += entry.position[0];
      center.z += entry.position[2];
    }
    center.x /= entries.length;
    center.z /= entries.length;
    return center;
  }, [entries]);
  const uniforms = useMemo(
    () => createNeonSignUniforms(texture, atlasCell, atlasCols),
    [texture, atlasCell, atlasCols],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: exploreNeonSignVert,
        fragmentShader: exploreNeonSignFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [uniforms],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(({ camera }) => {
    if (tier === 'hero' || tier === 'near') {
      const dx = camera.position.x - anchor.x;
      const dz = camera.position.z - anchor.z;
      if (dx * dx + dz * dz < 58 * 58) addNearEmissive(tier === 'hero' ? 1.2 : 0.6);
    }
    (uniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
    uniforms.uSignBloomBoost.value = 0.22 * bloomWeightScale;
    uniforms.uSignOuterGlow.value = (tier === 'mid' || tier === 'far' ? 0 : 0.72) * bloomWeightScale;
  });

  useFrame(({ clock }) => {
    if (!animate) return;
    uniforms.uTime.value = clock.elapsedTime;
  });

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      renderOrder={tier === 'hero' ? 4 : tier === 'near' ? 3 : 2}
      frustumCulled={tier !== 'far'}
    />
  );
}

export default function NeonSystem() {
  const budget = useRenderBudget();
  const renderFlags = useMemo(() => getWorldRenderFlags(), []);
  const [posterAtlas, setPosterAtlas] = useState<THREE.Texture | null>(null);
  const [heroTexture, setHeroTexture] = useState<THREE.Texture | null>(null);
  const atlasCell = useMemo(() => getPosterAtlasCellSize(), []);
  const heroAtlasCell = useMemo(() => new THREE.Vector2(1, 1), []);

  const heroAtlasEntries = useMemo(
    () => getNeonByTier('hero').filter((e) => e.posterIndex !== undefined),
    [],
  );
  const heroTextureEntries = useMemo(
    () => neonRegistry.filter((e) => e.id.startsWith('hero-neon')),
    [],
  );
  const nearEntries = useMemo(() => getNeonByTier('near'), []);
  const midEntries = useMemo(() => getNeonByTier('mid'), []);
  const farEntries = useMemo(() => getNeonByTier('far'), []);

  useEffect(() => {
    let alive = true;
    createHybridNeonPosterAtlas().then((tex) => {
      if (alive) {
        setPosterAtlas(tex);
      } else {
        tex.dispose();
      }
    });
    const loader = new THREE.TextureLoader();
    loader.load(HERO_NEON_TEXTURE_URL, (tex) => {
      if (!alive) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      setHeroTexture(tex);
    });
    return () => {
      alive = false;
    };
  }, []);

  const bloomScale = budget.bloomScale * (budget.bloomEnabled ? 1 : 0);
  const heroAnimate =
    !renderFlags.enableShaderDetailScaling || budget.allowHeroEffects || budget.movementPhase !== 'moving';
  const nearAnimate =
    !renderFlags.enableShaderDetailScaling || budget.farAnimationEnabled || budget.movementPhase !== 'moving';

  if (!posterAtlas) return null;

  return (
    <>
      <NeonEmissiveReset />
      <group>
      <NeonSignBatch
        entries={farEntries}
        tier="far"
        texture={posterAtlas}
        textureKey="neonAtlas"
        atlasCell={atlasCell}
        atlasCols={GLITCH_POSTER_COLS}
        bloomWeightScale={0}
        animate={false}
      />
      <NeonSignBatch
        entries={midEntries}
        tier="mid"
        texture={posterAtlas}
        textureKey="neonAtlas"
        atlasCell={atlasCell}
        atlasCols={GLITCH_POSTER_COLS}
        bloomWeightScale={0}
        animate={budget.farAnimationEnabled}
      />
      <NeonSignBatch
        entries={nearEntries}
        tier="near"
        texture={posterAtlas}
        textureKey="neonAtlas"
        atlasCell={atlasCell}
        atlasCols={GLITCH_POSTER_COLS}
        bloomWeightScale={bloomScale * 0.42}
        animate={nearAnimate}
      />
      <NeonSignBatch
        entries={heroAtlasEntries}
        tier="hero"
        texture={posterAtlas}
        textureKey="neonAtlas"
        atlasCell={atlasCell}
        atlasCols={GLITCH_POSTER_COLS}
        bloomWeightScale={bloomScale}
        animate={heroAnimate}
      />
      {heroTexture && (
        <NeonSignBatch
          entries={heroTextureEntries}
          tier="hero"
          texture={heroTexture}
          textureKey="heroNeon"
          atlasCell={heroAtlasCell}
          atlasCols={1}
          bloomWeightScale={bloomScale}
          animate={heroAnimate}
        />
      )}
      </group>
    </>
  );
}

function NeonEmissiveReset() {
  useFrame(() => {
    resetNearEmissiveCount();
  }, -1);
  return null;
}

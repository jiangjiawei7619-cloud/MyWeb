import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  EXPLORE_DISTANCE_LOD,
  LOD_HYSTERESIS,
  classifyExploreAnimTier,
  createLodRuntimeState,
  isInCameraFrustum,
  stableLodTierToExploreAnimTier,
  updateLodRuntimeState,
} from '@/lib/explore-distance-lod';
import { addNearEmissive } from '@/lib/explore-emissive-pressure';
import {
  rebeccaHologramCleanFrag,
  rebeccaHologramLayerFrag,
  rebeccaHologramVert,
} from '@/shaders/rebeccaHologram.glsl';
import { detectPerformanceTier } from '@/utils/performanceTier';
import { getWorldRenderFlags } from '@/lib/world-feature-flags';

const FAR_GATE_UPDATE_HZ = 6;
const FAR_GATE_PRELOAD_MARGIN = 24;
const FAR_GATE_HYSTERESIS = 12;

export interface ExploreHologramPlacement {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  width: number;
  height: number;
}

export interface ExploreHologramBurst {
  intervalMin: number;
  intervalSpan: number;
  phase: number;
  duration: number;
  steps: number;
  layerSpread: number;
  baseBrightness: number;
  bodyBrightness: number;
  baseOpacity: number;
  bloomBoost: number;
  neonSpill: number;
  bodyHighlightKnee: number;
  bodyLumaCap: number;
  bodyDistFalloff: { near: number; far: number; minGain: number };
  layerGain: number;
}

export interface ExploreHologramBreathing {
  interval: number;
  duration: number;
  phase: number;
  brightnessAmp: number;
  opacityAmp: number;
  bloomAmp: number;
  neonSpillAmp: number;
}

export interface ExploreHologramSignalDropout {
  interval: number;
  duration: number;
  phase: number;
  steps: number;
  bands: number;
  strength: number;
}

interface ExploreHologramPosterProps {
  texturePath: string;
  placement: ExploreHologramPlacement;
  burst: ExploreHologramBurst;
  breathing?: ExploreHologramBreathing;
  signalDropout?: ExploreHologramSignalDropout;
  /** Skip RGB burst layer meshes and keep the clean pass only */
  disableRgbLayers?: boolean;
}

function createHologramBaseUniforms() {
  return {
    uCamPos: { value: new THREE.Vector3() },
    uBloomBoost: { value: 0 },
    uNeonSpill: { value: 0 },
    uHighlightKnee: { value: 0 },
    uLumaCap: { value: 999 },
    uDistFalloffNear: { value: 0 },
    uDistFalloffFar: { value: 1 },
    uDistFalloffMin: { value: 1 },
  };
}

function createFallbackPosterTexture() {
  const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
  texture.name = 'hologram-poster-fallback-texture';
  texture.needsUpdate = true;
  return texture;
}

function useSafePosterTexture(texturePath: string) {
  const fallbackTexture = useMemo(() => createFallbackPosterTexture(), []);
  const [texture, setTexture] = useState<THREE.Texture>(fallbackTexture);

  useEffect(
    () => () => {
      fallbackTexture.dispose();
    },
    [fallbackTexture],
  );

  useEffect(() => {
    let disposed = false;
    let loadedTexture: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();

    setTexture(fallbackTexture);
    loader.load(
      texturePath,
      (nextTexture) => {
        if (disposed) {
          nextTexture.dispose();
          return;
        }
        nextTexture.colorSpace = THREE.SRGBColorSpace;
        nextTexture.needsUpdate = true;
        loadedTexture = nextTexture;
        setTexture(nextTexture);
      },
      undefined,
      (error) => {
        if (disposed) return;
        console.warn('[HologramTextureFallback]', texturePath, error);
        setTexture(fallbackTexture);
      },
    );

    return () => {
      disposed = true;
      loadedTexture?.dispose();
    };
  }, [fallbackTexture, texturePath]);

  return texture;
}

function setUniformValue(uniforms: THREE.ShaderMaterial['uniforms'], key: string, value: number) {
  const uniform = uniforms[key];
  if (uniform) uniform.value = value;
}

function copyUniformVector3(
  uniforms: THREE.ShaderMaterial['uniforms'],
  key: string,
  value: THREE.Vector3,
) {
  const uniform = uniforms[key];
  if (!uniform) return;
  if (uniform.value instanceof THREE.Vector3) {
    uniform.value.copy(value);
    return;
  }
  uniform.value = value.clone();
}

function createPosterGlowUniforms(enabled = true) {
  return {
    uGlowThreshold: { value: 0.55 },
    uGlowSoftness: { value: 0.16 },
    uSaturationThreshold: { value: 0.22 },
    uEmissiveBoost: { value: enabled ? 1.8 : 0 },
    uBaseBrightness: { value: 0.92 },
    uGlowPulseSpeed: { value: enabled ? 0.45 : 0 },
    uGlowPulseStrength: { value: enabled ? 0.08 : 0 },
    uScanlineStrength: { value: enabled ? 0.035 : 0.012 },
  };
}

function smoothstep01(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export default function ExploreHologramPoster({
  texturePath,
  placement,
  burst,
  breathing,
  signalDropout,
  disableRgbLayers = false,
}: ExploreHologramPosterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cleanMatRef = useRef<THREE.ShaderMaterial>(null);
  const layerMatRefs = useRef<(THREE.ShaderMaterial | null)[]>([null, null, null]);
  const layerMeshRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const placementWorldRef = useRef(new THREE.Vector3());
  const frozenTimeRef = useRef(0);
  const boundsRadiusRef = useRef(1);
  const lodStateRef = useRef(createLodRuntimeState());
  const farGateRef = useRef({ hidden: false, nextUpdateAt: 0 });
  const { camera } = useThree();
  const renderFlags = useMemo(() => getWorldRenderFlags(), []);
  const lowPowerGlow = useMemo(() => detectPerformanceTier() === 'low', []);

  boundsRadiusRef.current = Math.hypot(placement.width, placement.height) * 0.55;

  const texture = useSafePosterTexture(texturePath);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }, [texture]);

  const cleanUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMap: { value: texture },
      uOpacity: { value: burst.baseOpacity },
      uMix: { value: 1 },
      ...createHologramBaseUniforms(),
      uBrightness: { value: burst.bodyBrightness },
      uBloomBoost: { value: burst.bloomBoost },
      uNeonSpill: { value: burst.neonSpill },
      uHighlightKnee: { value: burst.bodyHighlightKnee },
      uLumaCap: { value: burst.bodyLumaCap },
      uDistFalloffNear: { value: burst.bodyDistFalloff.near },
      uDistFalloffFar: { value: burst.bodyDistFalloff.far },
      uDistFalloffMin: { value: burst.bodyDistFalloff.minGain },
      uSignalDropoutT: { value: 0 },
      uSignalDropoutSteps: { value: signalDropout?.steps ?? 1 },
      uSignalDropoutBands: { value: signalDropout?.bands ?? 1 },
      uSignalDropoutStrength: { value: signalDropout?.strength ?? 0 },
      uCheapPass: { value: 0 },
      ...createPosterGlowUniforms(!lowPowerGlow),
    }),
    [burst, lowPowerGlow, signalDropout, texture],
  );

  const layerUniforms = useMemo(
    () =>
      [0, 1, 2].map((channel) => ({
        uTime: { value: 0 },
        uMap: { value: texture },
        uChannel: { value: channel },
        uBurstT: { value: 0 },
        uGlitchSteps: { value: burst.steps },
        uLayerGain: { value: burst.layerGain },
        uMix: { value: 0 },
        ...createHologramBaseUniforms(),
      })),
    [burst, texture],
  );

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    const liveT = clock.elapsedTime;
    placementWorldRef.current.set(placement.x, placement.y, placement.z);
    const placementDist = camera.position.distanceTo(placementWorldRef.current);
    const hardPosterCulling =
      renderFlags.enableHardVisibilityCulling || renderFlags.enablePosterHardCulling;
    const useHardFrustum =
      hardPosterCulling && renderFlags.enableNearFrustumHardCulling;
    const visibleWithMargin = useHardFrustum
      ? isInCameraFrustum(
          camera,
          placementWorldRef.current,
          boundsRadiusRef.current,
          LOD_HYSTERESIS.frustumMargin,
        )
      : true;
    const stableLodTier = hardPosterCulling
      ? updateLodRuntimeState(lodStateRef.current, placementDist, visibleWithMargin)
      : lodStateRef.current.currentTier;
    const distanceAnimTier = classifyExploreAnimTier(placementDist);
    const animTier = hardPosterCulling
      ? stableLodTierToExploreAnimTier(stableLodTier)
      : distanceAnimTier === 'culled'
        ? 'static'
        : distanceAnimTier;

    if (hardPosterCulling && liveT >= farGateRef.current.nextUpdateAt) {
      const hideDistance =
        EXPLORE_DISTANCE_LOD.fadeEnd + FAR_GATE_PRELOAD_MARGIN + FAR_GATE_HYSTERESIS;
      const showDistance = EXPLORE_DISTANCE_LOD.fadeEnd + FAR_GATE_PRELOAD_MARGIN;
      const distanceHardHidden = farGateRef.current.hidden
        ? placementDist > showDistance
        : placementDist > hideDistance;
      const frustumHardHidden =
        useHardFrustum && !visibleWithMargin && placementDist > EXPLORE_DISTANCE_LOD.fadeEnd;
      farGateRef.current.hidden =
        (renderFlags.enableNearDistanceHardCulling && distanceHardHidden) ||
        frustumHardHidden ||
        (stableLodTier === 'hidden' && placementDist > hideDistance);
      farGateRef.current.nextUpdateAt = liveT + 1 / FAR_GATE_UPDATE_HZ;
    }

    if (hardPosterCulling && farGateRef.current.hidden) {
      group.visible = false;
      layerMeshRefs.current.forEach((mesh) => {
        if (mesh) mesh.visible = false;
      });
      return;
    }

    const allowFullAnim = !renderFlags.enableShaderDetailScaling || animTier === 'full';
    const allowReducedAnim =
      !renderFlags.enableShaderDetailScaling || animTier === 'full' || animTier === 'reduced';
    const t = allowReducedAnim ? liveT : frozenTimeRef.current;
    if (allowReducedAnim) frozenTimeRef.current = liveT;

    const floatY = allowReducedAnim ? Math.sin(t * 0.75) * 0.04 : 0;
    const worldY = placement.y + floatY;
    placementWorldRef.current.set(placement.x, worldY, placement.z);
    const distanceFade = renderFlags.enableFarObjectSoftFade
      ? 1 - THREE.MathUtils.smoothstep(
          placementDist,
          EXPLORE_DISTANCE_LOD.fadeStart,
          EXPLORE_DISTANCE_LOD.fadeEnd,
        )
      : 1;
    const detailScale = renderFlags.enableShaderDetailScaling
      ? allowFullAnim
        ? 1
        : allowReducedAnim
          ? 0.62
          : 0.35
      : 1;

    group.position.set(placement.x, worldY, placement.z);
    group.rotation.set(0, placement.rotationY, 0);
    group.visible = true;

    const interval = burst.intervalMin + burst.intervalSpan * 0.5;
    const cycle = (t + burst.phase) % interval;
    const inBurst = allowFullAnim && cycle < burst.duration;
    const burstT = inBurst ? cycle / burst.duration : 0;

    const rgbLayersEnabled = allowFullAnim && !disableRgbLayers;
    let cleanMix = 1;
    let layerMix = 0;
    if (rgbLayersEnabled && inBurst) {
      const enter = smoothstep01(burstT / 0.12);
      const exit = smoothstep01((burst.duration - cycle) / 0.18);
      layerMix = enter * exit;
      cleanMix = 1 - layerMix;
    }

    const spread = rgbLayersEnabled ? burst.layerSpread * layerMix : 0;
    const layersActive = rgbLayersEnabled && layerMix > 0.01;
    let breath = 0;
    if (allowFullAnim && breathing) {
      const breathCycle = (t + breathing.phase) % breathing.interval;
      if (breathCycle < breathing.duration) {
        const breathT = breathCycle / breathing.duration;
        breath = Math.sin(breathT * Math.PI);
      }
    }
    let dropout = 0;
    if (allowFullAnim && signalDropout) {
      const dropoutCycle = (t + signalDropout.phase) % signalDropout.interval;
      if (dropoutCycle < signalDropout.duration) {
        const dropoutT = dropoutCycle / signalDropout.duration;
        dropout = Math.sin(dropoutT * Math.PI);
      }
    }

    const cheapPass = detailScale < 0.99 ? 1 : 0;
    [cleanMatRef].forEach((ref) => {
      const mat = ref.current;
      if (!mat) return;
      setUniformValue(mat.uniforms, 'uTime', t);
      setUniformValue(mat.uniforms, 'uMix', cleanMix);
      setUniformValue(mat.uniforms, 'uCheapPass', cheapPass);
      copyUniformVector3(mat.uniforms, 'uCamPos', camera.position);
    });

    const cleanMat = cleanMatRef.current;
    if (cleanMat) {
      setUniformValue(
        cleanMat.uniforms,
        'uBrightness',
        burst.bodyBrightness * (1 + breath * (breathing?.brightnessAmp ?? 0)) * distanceFade,
      );
      setUniformValue(
        cleanMat.uniforms,
        'uOpacity',
        burst.baseOpacity * (1 + breath * (breathing?.opacityAmp ?? 0)) * distanceFade,
      );
      setUniformValue(
        cleanMat.uniforms,
        'uBloomBoost',
        burst.bloomBoost * (1 + breath * (breathing?.bloomAmp ?? 0)) * distanceFade,
      );
      setUniformValue(
        cleanMat.uniforms,
        'uNeonSpill',
        burst.neonSpill *
          (1 + breath * (breathing?.neonSpillAmp ?? 0)) *
          distanceFade *
          (allowFullAnim ? 1 : 0),
      );
      setUniformValue(cleanMat.uniforms, 'uSignalDropoutT', dropout);
    }

    layerMeshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.visible = layersActive;
      const z = i === 0 ? spread : i === 2 ? -spread : 0;
      mesh.position.z = z;
    });

    if (rgbLayersEnabled) {
      layerMatRefs.current.forEach((mat) => {
        if (!mat) return;
        setUniformValue(mat.uniforms, 'uTime', t);
        setUniformValue(mat.uniforms, 'uBurstT', burstT);
        setUniformValue(mat.uniforms, 'uMix', layerMix * distanceFade);
        copyUniformVector3(mat.uniforms, 'uCamPos', camera.position);
      });
    }

    if (allowReducedAnim && distanceFade > 0.05) {
      addNearEmissive(allowFullAnim ? 1 : 0.45);
    }
  });

  const planeArgs = [placement.width, placement.height] as const;

  return (
    <>
      <group ref={groupRef} renderOrder={12}>
        <mesh renderOrder={12} frustumCulled={false}>
          <planeGeometry args={planeArgs} />
          <shaderMaterial
            ref={cleanMatRef}
            uniforms={cleanUniforms}
            vertexShader={rebeccaHologramVert}
            fragmentShader={rebeccaHologramCleanFrag}
            transparent
            depthWrite={false}
            depthTest
            blending={THREE.NormalBlending}
            toneMapped={false}
            side={THREE.FrontSide}
          />
        </mesh>

        {!disableRgbLayers &&
          [0, 1, 2].map((channel) => (
            <mesh
              key={channel}
              ref={(el) => {
                layerMeshRefs.current[channel] = el;
              }}
              renderOrder={13 + channel}
              frustumCulled={false}
            >
              <planeGeometry args={planeArgs} />
              <shaderMaterial
                ref={(el) => {
                  layerMatRefs.current[channel] = el;
                }}
                uniforms={layerUniforms[channel]}
                vertexShader={rebeccaHologramVert}
                fragmentShader={rebeccaHologramLayerFrag}
                transparent
                depthWrite={false}
                depthTest
                blending={THREE.AdditiveBlending}
                toneMapped={false}
                side={THREE.FrontSide}
              />
            </mesh>
          ))}
      </group>
    </>
  );
}

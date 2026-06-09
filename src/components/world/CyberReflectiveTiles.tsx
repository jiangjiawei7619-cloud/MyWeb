import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { Leva, useControls } from 'leva';
import * as THREE from 'three';
import { GROUND_HALF_EXTENT } from '@/physics/createPhysicsWorld';
import { EXPLORE_GROUND_REFLECTION } from '@/lib/explore-ground-reflection';
import { detectPerformanceTier, getPerformancePreset } from '@/utils/performanceTier';
import { MeshReflectorMaterial as MeshReflectorMaterialImpl } from '@react-three/drei/materials/MeshReflectorMaterial.js';
import {
  CYBER_TILE_DEFAULTS,
  CYBER_TILE_PATCH_VERSION,
  applyCyberTileReflectionPatch,
  createCyberTileUniforms,
  type CyberTileUniforms,
} from '@/shaders/cyberTileReflection';

export type CyberReflectiveTilesProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  reflectionStrength?: number;
  blurStrength?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  debug?: boolean;
  debugDepthFade?: boolean;
  debugFresnel?: boolean;
  debugReflectionOnly?: boolean;
  debugMicroVariation?: boolean;
};

const { cyberTiles } = EXPLORE_GROUND_REFLECTION;
const reflectorCfg = cyberTiles.reflector;
type MeshReflectorMaterialInstance = InstanceType<typeof MeshReflectorMaterialImpl>;

function CyberReflectiveTilesInner({
  position = [0, reflectorCfg.y, 0],
  rotation = [-Math.PI / 2, 0, 0],
  scale = 1,
  reflectionStrength = cyberTiles.reflectionStrength,
  blurStrength = cyberTiles.blurStrength,
  roughness = cyberTiles.roughness,
  metalness = cyberTiles.metalness,
  opacity = 1,
  debug = false,
  debugDepthFade = false,
  debugFresnel = false,
  debugReflectionOnly = false,
  debugMicroVariation = false,
}: CyberReflectiveTilesProps) {
  const tier = useMemo(() => detectPerformanceTier(), []);
  const preset = useMemo(() => getPerformancePreset(tier), [tier]);

  const leva = useControls(
    'Smooth Cyber Floor',
    {
      reflectionStrength: { value: reflectionStrength, min: 0.1, max: 1.2, step: 0.02 },
      reflectionFadeStart: { value: CYBER_TILE_DEFAULTS.reflectionFadeStart, min: 0, max: 24, step: 0.5 },
      reflectionFadeEnd: { value: CYBER_TILE_DEFAULTS.reflectionFadeEnd, min: 12, max: 96, step: 1 },
      nearReflectionStrength: {
        value: CYBER_TILE_DEFAULTS.nearReflectionStrength,
        min: 0.1,
        max: 1.4,
        step: 0.025,
      },
      farReflectionStrength: {
        value: CYBER_TILE_DEFAULTS.farReflectionStrength,
        min: 0.02,
        max: 0.9,
        step: 0.025,
      },
      nearRoughness: { value: CYBER_TILE_DEFAULTS.nearRoughness, min: 0.02, max: 0.28, step: 0.005 },
      farRoughness: { value: CYBER_TILE_DEFAULTS.farRoughness, min: 0.08, max: 0.5, step: 0.005 },
      nearContrast: { value: CYBER_TILE_DEFAULTS.nearContrast, min: 0.5, max: 1.35, step: 0.01 },
      farContrast: { value: CYBER_TILE_DEFAULTS.farContrast, min: 0.35, max: 1.1, step: 0.01 },
      fresnelStrength: { value: CYBER_TILE_DEFAULTS.fresnelStrength, min: 0, max: 1.4, step: 0.02 },
      fresnelPower: { value: CYBER_TILE_DEFAULTS.fresnelPower, min: 1, max: 6, step: 0.1 },
      fresnelBias: { value: CYBER_TILE_DEFAULTS.fresnelBias, min: 0.02, max: 0.4, step: 0.01 },
      microDistortionStrength: {
        value: CYBER_TILE_DEFAULTS.microDistortionStrength,
        min: 0,
        max: 0.006,
        step: 0.0001,
      },
      microRoughnessAmount: {
        value: CYBER_TILE_DEFAULTS.microRoughnessAmount,
        min: 0,
        max: 0.08,
        step: 0.001,
      },
      distanceFogAmount: { value: CYBER_TILE_DEFAULTS.distanceFogAmount, min: 0, max: 0.65, step: 0.01 },
      highlightBoost: { value: CYBER_TILE_DEFAULTS.highlightBoost, min: 0, max: 0.55, step: 0.01 },
      secondaryReflectionStrength: {
        value: CYBER_TILE_DEFAULTS.secondaryReflectionStrength,
        min: 0,
        max: 0.9,
        step: 0.01,
      },
      neonReceiveStrength: {
        value: CYBER_TILE_DEFAULTS.neonReceiveStrength,
        min: 0,
        max: 0.45,
        step: 0.01,
      },
      baseDarkness: { value: CYBER_TILE_DEFAULTS.baseDarkness, min: 0.65, max: 1.05, step: 0.01 },
      roughness: { value: roughness, min: 0.04, max: 0.6, step: 0.01 },
      metalness: { value: metalness, min: 0, max: 0.8, step: 0.02 },
      debugDepthFade: { value: false },
      debugFresnel: { value: false },
      debugReflectionOnly: { value: false },
      debugMicroVariation: { value: false },
    },
    { render: () => debug },
  );

  const params = debug
    ? {
        reflectionStrength: leva.reflectionStrength,
        blurStrength,
        roughness: leva.roughness,
        metalness: leva.metalness,
        opacity,
        reflectionFadeStart: leva.reflectionFadeStart,
        reflectionFadeEnd: leva.reflectionFadeEnd,
        nearReflectionStrength: leva.nearReflectionStrength,
        farReflectionStrength: leva.farReflectionStrength,
        nearRoughness: leva.nearRoughness,
        farRoughness: leva.farRoughness,
        nearContrast: leva.nearContrast,
        farContrast: leva.farContrast,
        fresnelStrength: leva.fresnelStrength,
        fresnelPower: leva.fresnelPower,
        fresnelBias: leva.fresnelBias,
        microDistortionStrength: leva.microDistortionStrength,
        microRoughnessAmount: leva.microRoughnessAmount,
        distanceFogColor: CYBER_TILE_DEFAULTS.distanceFogColor,
        distanceFogAmount: leva.distanceFogAmount,
        highlightBoost: leva.highlightBoost,
        secondaryReflectionStrength: leva.secondaryReflectionStrength,
        neonReceiveStrength: leva.neonReceiveStrength,
        baseDarkness: leva.baseDarkness,
        debugDepthFade: leva.debugDepthFade || debugDepthFade,
        debugFresnel: leva.debugFresnel || debugFresnel,
        debugReflectionOnly: leva.debugReflectionOnly || debugReflectionOnly,
        debugMicroVariation: leva.debugMicroVariation || debugMicroVariation,
      }
    : {
        reflectionStrength,
        blurStrength,
        roughness,
        metalness,
        opacity,
        reflectionFadeStart: CYBER_TILE_DEFAULTS.reflectionFadeStart,
        reflectionFadeEnd: CYBER_TILE_DEFAULTS.reflectionFadeEnd,
        nearReflectionStrength: CYBER_TILE_DEFAULTS.nearReflectionStrength,
        farReflectionStrength: CYBER_TILE_DEFAULTS.farReflectionStrength,
        nearRoughness: CYBER_TILE_DEFAULTS.nearRoughness,
        farRoughness: CYBER_TILE_DEFAULTS.farRoughness,
        nearContrast: CYBER_TILE_DEFAULTS.nearContrast,
        farContrast: CYBER_TILE_DEFAULTS.farContrast,
        fresnelStrength: CYBER_TILE_DEFAULTS.fresnelStrength,
        fresnelPower: CYBER_TILE_DEFAULTS.fresnelPower,
        fresnelBias: CYBER_TILE_DEFAULTS.fresnelBias,
        microDistortionStrength: CYBER_TILE_DEFAULTS.microDistortionStrength,
        microRoughnessAmount: CYBER_TILE_DEFAULTS.microRoughnessAmount,
        distanceFogColor: CYBER_TILE_DEFAULTS.distanceFogColor,
        distanceFogAmount: CYBER_TILE_DEFAULTS.distanceFogAmount,
        highlightBoost: CYBER_TILE_DEFAULTS.highlightBoost,
        secondaryReflectionStrength: CYBER_TILE_DEFAULTS.secondaryReflectionStrength,
        neonReceiveStrength: CYBER_TILE_DEFAULTS.neonReceiveStrength,
        baseDarkness: CYBER_TILE_DEFAULTS.baseDarkness,
        debugDepthFade,
        debugFresnel,
        debugReflectionOnly,
        debugMicroVariation,
      };

  const size = GROUND_HALF_EXTENT * 2;
  const meshScale = typeof scale === 'number' ? ([scale, scale, scale] as const) : scale;
  const reflectorMatRef = useRef<MeshReflectorMaterialInstance | null>(null);

  const cyberUniformsRef = useRef<CyberTileUniforms>(createCyberTileUniforms(params));

  const syncUniforms = useCallback(() => {
    const u = cyberUniformsRef.current;
    u.uReflectionFadeStart.value = params.reflectionFadeStart;
    u.uReflectionFadeEnd.value = params.reflectionFadeEnd;
    u.uNearReflectionStrength.value = params.nearReflectionStrength;
    u.uFarReflectionStrength.value = params.farReflectionStrength;
    u.uNearRoughness.value = params.nearRoughness;
    u.uFarRoughness.value = params.farRoughness;
    u.uNearContrast.value = params.nearContrast;
    u.uFarContrast.value = params.farContrast;
    u.uFresnelStrength.value = params.fresnelStrength;
    u.uFresnelPower.value = params.fresnelPower;
    u.uFresnelBias.value = params.fresnelBias;
    u.uMicroDistortionStrength.value = params.microDistortionStrength;
    u.uMicroRoughnessAmount.value = params.microRoughnessAmount;
    (u.uDistanceFogColor.value as THREE.Color).copy(params.distanceFogColor);
    u.uDistanceFogAmount.value = params.distanceFogAmount;
    u.uHighlightBoost.value = params.highlightBoost;
    u.uSecondaryReflectionStrength.value = params.secondaryReflectionStrength;
    u.uNeonReceiveStrength.value = params.neonReceiveStrength;
    u.uBaseDarkness.value = params.baseDarkness;
    u.uDebugDepthFade.value = params.debugDepthFade ? 1 : 0;
    u.uDebugFresnel.value = params.debugFresnel ? 1 : 0;
    u.uDebugReflectionOnly.value = params.debugReflectionOnly ? 1 : 0;
    u.uDebugMicroVariation.value = params.debugMicroVariation ? 1 : 0;
  }, [params]);

  useLayoutEffect(() => {
    syncUniforms();
  }, [syncUniforms]);

  const patchReflectorMaterial = useCallback((mat: MeshReflectorMaterialInstance) => {
    const tagged = mat as MeshReflectorMaterialInstance & { __smoothCyberPatch?: string };
    if (tagged.__smoothCyberPatch === CYBER_TILE_PATCH_VERSION) return;

    const baseCompile = MeshReflectorMaterialImpl.prototype.onBeforeCompile;
    mat.onBeforeCompile = function onSmoothCyberCompile(shader) {
      baseCompile.call(this, shader);
      applyCyberTileReflectionPatch(shader, cyberUniformsRef.current);
    };
    mat.customProgramCacheKey = () => `smooth-cyber-floor-${CYBER_TILE_PATCH_VERSION}`;
    tagged.__smoothCyberPatch = CYBER_TILE_PATCH_VERSION;
    mat.needsUpdate = true;
  }, []);

  const ensureMaterialPatched = useCallback(() => {
    const mat = reflectorMatRef.current;
    if (!mat) return;
    patchReflectorMaterial(mat);
  }, [patchReflectorMaterial]);

  useLayoutEffect(() => {
    ensureMaterialPatched();
  }, [ensureMaterialPatched, preset.resolution, params.blurStrength]);

  useFrame(({ clock }) => {
    cyberUniformsRef.current.uTime.value = clock.elapsedTime;
  });

  const mirror = THREE.MathUtils.clamp(
    reflectorCfg.mirror * (0.88 + params.reflectionStrength * 0.22),
    0.38,
    0.94,
  );
  const mixStrength = reflectorCfg.mixStrength * (0.76 + params.reflectionStrength * 0.34);

  return (
    <>
      {debug && <Leva collapsed={false} oneLineLabels />}

      <mesh
        position={position}
        rotation={rotation}
        scale={meshScale}
        receiveShadow={false}
        renderOrder={-1}
      >
        <planeGeometry args={[size, size, preset.segments, preset.segments]} />
        <MeshReflectorMaterial
          ref={reflectorMatRef}
          color={CYBER_TILE_DEFAULTS.groundColor}
          roughness={params.roughness}
          metalness={params.metalness}
          opacity={params.opacity}
          transparent={params.opacity < 1}
          depthWrite
          mirror={mirror}
          mixBlur={params.blurStrength}
          mixStrength={mixStrength}
          mixContrast={reflectorCfg.mixContrast}
          blur={[preset.blur[0], preset.blur[1]]}
          resolution={preset.resolution}
          depthScale={reflectorCfg.depthScale}
          minDepthThreshold={reflectorCfg.minDepthThreshold}
          maxDepthThreshold={reflectorCfg.maxDepthThreshold}
          depthToBlurRatioBias={reflectorCfg.depthToBlurRatioBias}
          distortion={reflectorCfg.distortion}
          reflectorOffset={reflectorCfg.reflectorOffset}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

const CyberReflectiveTiles = memo(CyberReflectiveTilesInner);
export default CyberReflectiveTiles;

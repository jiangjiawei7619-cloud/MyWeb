import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EXPLORE_GROUND_REFLECTION, createExploreSignMirrorUniforms } from '@/lib/explore-ground-reflection';
import { EXPLORE_DISTANCE_LOD } from '@/lib/explore-distance-lod';
import {
  rebeccaHologramCleanFrag,
  rebeccaHologramLayerFrag,
  rebeccaHologramVert,
} from '@/shaders/rebeccaHologram.glsl';

const useGeometricMirrors =
  EXPLORE_GROUND_REFLECTION.groundMode === 'legacy' ||
  EXPLORE_GROUND_REFLECTION.cyberTiles.hybridGeometricMirrors;

const { mirrorLayer } = EXPLORE_GROUND_REFLECTION;
const signMirrorUniforms = createExploreSignMirrorUniforms();

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

export interface ExploreHologramReflect {
  reflectDimmer: number;
  reflectAlphaFloor: number;
  reflectBlurScale: number;
  reflectForwardOffset: number;
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
  reflect: ExploreHologramReflect;
  breathing?: ExploreHologramBreathing;
  signalDropout?: ExploreHologramSignalDropout;
}

const reflectStubUniforms = {
  uBloomBoost: { value: 0 },
  uNeonSpill: { value: 0 },
  uHighlightKnee: { value: 0 },
  uLumaCap: { value: 999 },
  uDistFalloffNear: { value: 0 },
  uDistFalloffFar: { value: 1 },
  uDistFalloffMin: { value: 1 },
  uReflectDimmer: { value: 1 },
  uReflectAlphaFloor: { value: 0 },
  uReflectBlurScale: { value: 1 },
};

function smoothstep01(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export default function ExploreHologramPoster({
  texturePath,
  placement,
  burst,
  reflect,
  breathing,
  signalDropout,
}: ExploreHologramPosterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const reflectGroupRef = useRef<THREE.Group>(null);
  const cleanMatRef = useRef<THREE.ShaderMaterial>(null);
  const reflectCleanMatRef = useRef<THREE.ShaderMaterial>(null);
  const layerMatRefs = useRef<(THREE.ShaderMaterial | null)[]>([null, null, null]);
  const reflectLayerMatRefs = useRef<(THREE.ShaderMaterial | null)[]>([null, null, null]);
  const layerMeshRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const reflectLayerMeshRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const placementWorldRef = useRef(new THREE.Vector3());
  const { camera } = useThree();

  const texture = useLoader(THREE.TextureLoader, texturePath);
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
      uReflect: { value: 0 },
      uReflectBoost: { value: 1 },
      uReflectGain: { value: 1 },
      ...reflectStubUniforms,
      ...signMirrorUniforms,
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
    }),
    [burst, signalDropout, texture],
  );

  const reflectPassUniforms = useMemo(
    () => ({
      uReflectDimmer: { value: reflect.reflectDimmer },
      uReflectAlphaFloor: { value: reflect.reflectAlphaFloor },
      uReflectBlurScale: { value: reflect.reflectBlurScale },
    }),
    [reflect],
  );

  const reflectCleanUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMap: { value: texture },
      uBrightness: { value: burst.baseBrightness },
      uOpacity: { value: burst.baseOpacity },
      uMix: { value: 1 },
      uBloomBoost: { value: 0 },
      uReflect: { value: 1 },
      uReflectBoost: { value: 1 },
      uReflectGain: { value: 1 },
      ...reflectPassUniforms,
      ...signMirrorUniforms,
      uSignalDropoutT: { value: 0 },
      uSignalDropoutSteps: { value: signalDropout?.steps ?? 1 },
      uSignalDropoutBands: { value: signalDropout?.bands ?? 1 },
      uSignalDropoutStrength: { value: signalDropout?.strength ?? 0 },
    }),
    [burst, reflectPassUniforms, signalDropout, texture],
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
        uReflect: { value: 0 },
        uReflectBoost: { value: 1 },
        uReflectGain: { value: 1 },
        ...reflectStubUniforms,
        ...signMirrorUniforms,
      })),
    [burst, texture],
  );

  const reflectLayerUniforms = useMemo(
    () =>
      [0, 1, 2].map((channel) => ({
        uTime: { value: 0 },
        uMap: { value: texture },
        uChannel: { value: channel },
        uBurstT: { value: 0 },
        uGlitchSteps: { value: burst.steps },
        uLayerGain: { value: burst.layerGain },
        uMix: { value: 0 },
        uReflect: { value: 1 },
        uReflectBoost: { value: 1 },
        uReflectGain: { value: 1 },
        ...reflectPassUniforms,
        ...signMirrorUniforms,
      })),
    [burst, reflectPassUniforms, texture],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const group = groupRef.current;
    const reflectGroup = reflectGroupRef.current;
    if (!group || !reflectGroup) return;

    const floatY = Math.sin(t * 0.75) * 0.04;
    const worldY = placement.y + floatY;
    placementWorldRef.current.set(placement.x, worldY, placement.z);
    const placementDist = camera.position.distanceTo(placementWorldRef.current);
    const distanceFade =
      1 - THREE.MathUtils.smoothstep(placementDist, EXPLORE_DISTANCE_LOD.fadeStart, EXPLORE_DISTANCE_LOD.fadeEnd);
    group.position.set(placement.x, worldY, placement.z);
    group.rotation.set(0, placement.rotationY, 0);
    group.visible = distanceFade > 0.002;
    const normalX = Math.sin(placement.rotationY);
    const normalZ = Math.cos(placement.rotationY);
    reflectGroup.position.set(
      placement.x + normalX * reflect.reflectForwardOffset,
      -worldY - mirrorLayer.yEpsilon,
      placement.z + normalZ * reflect.reflectForwardOffset,
    );
    reflectGroup.rotation.set(0, placement.rotationY, 0);
    reflectGroup.visible = distanceFade > 0.002;

    const interval = burst.intervalMin + burst.intervalSpan * 0.5;
    const cycle = (t + burst.phase) % interval;
    const inBurst = cycle < burst.duration;
    const burstT = inBurst ? cycle / burst.duration : 0;

    let cleanMix = 1;
    let layerMix = 0;
    if (inBurst) {
      const enter = smoothstep01(burstT / 0.12);
      const exit = smoothstep01((burst.duration - cycle) / 0.18);
      layerMix = enter * exit;
      cleanMix = 1 - layerMix;
    }

    const spread = burst.layerSpread * layerMix;
    let breath = 0;
    if (breathing) {
      const breathCycle = (t + breathing.phase) % breathing.interval;
      if (breathCycle < breathing.duration) {
        const breathT = breathCycle / breathing.duration;
        breath = Math.sin(breathT * Math.PI);
      }
    }
    let dropout = 0;
    if (signalDropout) {
      const dropoutCycle = (t + signalDropout.phase) % signalDropout.interval;
      if (dropoutCycle < signalDropout.duration) {
        const dropoutT = dropoutCycle / signalDropout.duration;
        dropout = Math.sin(dropoutT * Math.PI);
      }
    }

    [cleanMatRef, reflectCleanMatRef].forEach((ref) => {
      const mat = ref.current;
      if (!mat) return;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uMix.value = cleanMix;
      (mat.uniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
    });

    const cleanMat = cleanMatRef.current;
    if (cleanMat) {
      cleanMat.uniforms.uBrightness.value = burst.bodyBrightness * (1 + breath * (breathing?.brightnessAmp ?? 0)) * distanceFade;
      cleanMat.uniforms.uOpacity.value = burst.baseOpacity * (1 + breath * (breathing?.opacityAmp ?? 0)) * distanceFade;
      cleanMat.uniforms.uBloomBoost.value = burst.bloomBoost * (1 + breath * (breathing?.bloomAmp ?? 0)) * distanceFade;
      cleanMat.uniforms.uNeonSpill.value = burst.neonSpill * (1 + breath * (breathing?.neonSpillAmp ?? 0)) * distanceFade;
      cleanMat.uniforms.uSignalDropoutT.value = dropout;
    }

    const reflectCleanMat = reflectCleanMatRef.current;
    if (reflectCleanMat) {
      reflectCleanMat.uniforms.uBrightness.value = burst.baseBrightness * (1 + breath * (breathing?.brightnessAmp ?? 0) * 0.55) * distanceFade;
      reflectCleanMat.uniforms.uOpacity.value = burst.baseOpacity * (1 + breath * (breathing?.opacityAmp ?? 0) * 0.45) * distanceFade;
      reflectCleanMat.uniforms.uSignalDropoutT.value = dropout * 0.72;
    }

    layerMeshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const z = i === 0 ? spread : i === 2 ? -spread : 0;
      mesh.position.z = z;
    });
    reflectLayerMeshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const z = i === 0 ? spread : i === 2 ? -spread : 0;
      mesh.position.z = z;
    });

    [...layerMatRefs.current, ...reflectLayerMatRefs.current].forEach((mat) => {
      if (!mat) return;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uBurstT.value = burstT;
      mat.uniforms.uMix.value = layerMix * distanceFade;
      (mat.uniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
    });
  });

  const planeArgs = [placement.width, placement.height] as const;

  return (
    <>
      {useGeometricMirrors && (
        <group ref={reflectGroupRef} renderOrder={10}>
          <mesh renderOrder={10} scale={[1, -1, 1]}>
            <planeGeometry args={planeArgs} />
            <shaderMaterial
              ref={reflectCleanMatRef}
              uniforms={reflectCleanUniforms}
              vertexShader={rebeccaHologramVert}
              fragmentShader={rebeccaHologramCleanFrag}
              transparent
              depthWrite={false}
              depthTest={false}
              side={THREE.DoubleSide}
              blending={THREE.NormalBlending}
              toneMapped={false}
            />
          </mesh>

          {[0, 1, 2].map((channel) => (
            <mesh
              key={channel}
              ref={(el) => {
                reflectLayerMeshRefs.current[channel] = el;
              }}
              renderOrder={11 + channel}
              scale={[1, -1, 1]}
            >
              <planeGeometry args={planeArgs} />
              <shaderMaterial
                ref={(el) => {
                  reflectLayerMatRefs.current[channel] = el;
                }}
                uniforms={reflectLayerUniforms[channel]}
                vertexShader={rebeccaHologramVert}
                fragmentShader={rebeccaHologramLayerFrag}
                transparent
                depthWrite={false}
                depthTest={false}
                side={THREE.DoubleSide}
                blending={THREE.NormalBlending}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      )}

      <group ref={groupRef} renderOrder={12}>
        <mesh renderOrder={12}>
          <planeGeometry args={planeArgs} />
          <shaderMaterial
            ref={cleanMatRef}
            uniforms={cleanUniforms}
            vertexShader={rebeccaHologramVert}
            fragmentShader={rebeccaHologramCleanFrag}
            transparent
            depthWrite={false}
            depthTest
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            blending={THREE.NormalBlending}
            toneMapped={false}
            side={THREE.FrontSide}
          />
        </mesh>

        {[0, 1, 2].map((channel) => (
          <mesh
            key={channel}
            ref={(el) => {
              layerMeshRefs.current[channel] = el;
            }}
            renderOrder={13 + channel}
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
              polygonOffset
              polygonOffsetFactor={-3 - channel}
              polygonOffsetUnits={-3 - channel}
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

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getRebeccaHologramPlacement,
  REBECCA_GLITCH_BURST,
  REBECCA_LANDMARK,
  REBECCA_REFLECT,
} from '@/lib/rebecca-hologram-config';
import { EXPLORE_GROUND_REFLECTION, createExploreSignMirrorUniforms } from '@/lib/explore-ground-reflection';

const useGeometricMirrors =
  EXPLORE_GROUND_REFLECTION.groundMode === 'legacy' ||
  EXPLORE_GROUND_REFLECTION.cyberTiles.hybridGeometricMirrors;
import {
  rebeccaHologramCleanFrag,
  rebeccaHologramLayerFrag,
  rebeccaHologramVert,
} from '@/shaders/rebeccaHologram.glsl';

const placement = getRebeccaHologramPlacement();
const { layerSpread, intervalMin, intervalSpan, phase, duration, steps } = REBECCA_GLITCH_BURST;
const { mirrorLayer } = EXPLORE_GROUND_REFLECTION;
const signMirrorUniforms = createExploreSignMirrorUniforms();

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

const reflectPassUniforms = {
  uReflectDimmer: { value: REBECCA_REFLECT.reflectDimmer },
  uReflectAlphaFloor: { value: REBECCA_REFLECT.reflectAlphaFloor },
  uReflectBlurScale: { value: REBECCA_REFLECT.reflectBlurScale },
};

function smoothstep01(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export default function ExploreRebeccaHologram() {
  const groupRef = useRef<THREE.Group>(null);
  const reflectGroupRef = useRef<THREE.Group>(null);
  const cleanMatRef = useRef<THREE.ShaderMaterial>(null);
  const reflectCleanMatRef = useRef<THREE.ShaderMaterial>(null);
  const layerMatRefs = useRef<(THREE.ShaderMaterial | null)[]>([null, null, null]);
  const reflectLayerMatRefs = useRef<(THREE.ShaderMaterial | null)[]>([null, null, null]);
  const layerMeshRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const reflectLayerMeshRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const { camera } = useThree();

  const texture = useLoader(THREE.TextureLoader, REBECCA_LANDMARK.texturePath);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }, [texture]);

  const cleanUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMap: { value: texture },
      uOpacity: { value: REBECCA_GLITCH_BURST.baseOpacity },
      uMix: { value: 1 },
      uReflect: { value: 0 },
      uReflectBoost: { value: 1 },
      uReflectGain: { value: 1 },
      ...reflectStubUniforms,
      ...signMirrorUniforms,
      uBrightness: { value: REBECCA_GLITCH_BURST.bodyBrightness },
      uBloomBoost: { value: REBECCA_GLITCH_BURST.bloomBoost },
      uNeonSpill: { value: REBECCA_GLITCH_BURST.neonSpill },
      uHighlightKnee: { value: REBECCA_GLITCH_BURST.bodyHighlightKnee },
      uLumaCap: { value: REBECCA_GLITCH_BURST.bodyLumaCap },
      uDistFalloffNear: { value: REBECCA_GLITCH_BURST.bodyDistFalloff.near },
      uDistFalloffFar: { value: REBECCA_GLITCH_BURST.bodyDistFalloff.far },
      uDistFalloffMin: { value: REBECCA_GLITCH_BURST.bodyDistFalloff.minGain },
    }),
    [texture],
  );

  const reflectCleanUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMap: { value: texture },
      uBrightness: { value: REBECCA_GLITCH_BURST.baseBrightness },
      uOpacity: { value: REBECCA_GLITCH_BURST.baseOpacity },
      uMix: { value: 1 },
      uBloomBoost: { value: 0 },
      uReflect: { value: 1 },
      uReflectBoost: { value: 1 },
      uReflectGain: { value: 1 },
      ...reflectPassUniforms,
      ...signMirrorUniforms,
    }),
    [texture],
  );

  const layerUniforms = useMemo(
    () =>
      [0, 1, 2].map((channel) => ({
        uTime: { value: 0 },
        uMap: { value: texture },
        uCamPos: { value: new THREE.Vector3() },
        uChannel: { value: channel },
        uBurstT: { value: 0 },
        uGlitchSteps: { value: steps },
        uLayerGain: { value: REBECCA_GLITCH_BURST.layerGain },
        uMix: { value: 0 },
        uReflect: { value: 0 },
        uReflectBoost: { value: 1 },
        uReflectGain: { value: 1 },
        ...reflectStubUniforms,
        ...signMirrorUniforms,
      })),
    [texture],
  );

  const reflectLayerUniforms = useMemo(
    () =>
      [0, 1, 2].map((channel) => ({
        uTime: { value: 0 },
        uMap: { value: texture },
        uCamPos: { value: new THREE.Vector3() },
        uChannel: { value: channel },
        uBurstT: { value: 0 },
        uGlitchSteps: { value: steps },
        uLayerGain: { value: REBECCA_GLITCH_BURST.layerGain },
        uMix: { value: 0 },
        uReflect: { value: 1 },
        uReflectBoost: { value: 1 },
        uReflectGain: { value: 1 },
        ...reflectPassUniforms,
        ...signMirrorUniforms,
      })),
    [texture],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const group = groupRef.current;
    const reflectGroup = reflectGroupRef.current;
    if (!group || !reflectGroup) return;

    const floatY = Math.sin(t * 0.75) * 0.04;
    const worldY = placement.y + floatY;
    group.position.set(placement.x, worldY, placement.z);
    group.rotation.set(0, placement.rotationY, 0);
    reflectGroup.position.set(
      placement.x + REBECCA_REFLECT.reflectForwardOffset,
      -worldY - mirrorLayer.yEpsilon,
      placement.z,
    );
    reflectGroup.rotation.set(0, placement.rotationY, 0);

    const interval = intervalMin + intervalSpan * 0.5;
    const cycle = (t + phase) % interval;
    const inBurst = cycle < duration;
    const burstT = inBurst ? cycle / duration : 0;

    let cleanMix = 1;
    let layerMix = 0;
    if (inBurst) {
      const enter = smoothstep01(burstT / 0.12);
      const exit = smoothstep01((duration - cycle) / 0.18);
      layerMix = enter * exit;
      cleanMix = 1 - layerMix;
    }

    const spread = layerSpread * layerMix;

    [cleanMatRef, reflectCleanMatRef].forEach((ref) => {
      const mat = ref.current;
      if (!mat) return;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uMix.value = cleanMix;
      (mat.uniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
    });

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
      mat.uniforms.uMix.value = layerMix;
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

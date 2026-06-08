import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GROUND_HALF_EXTENT } from '@/physics/createPhysicsWorld';
import type { PhysicsWorldBundle } from '@/physics/createPhysicsWorld';
import { makeCyberMood, type CyberMood } from '@/lib/cyber-mood';
import { EXPLORE_GROUND_REFLECTION, createBrickWetGridUniforms } from '@/lib/explore-ground-reflection';
import {
  CYBER_GROUND_MAX_RIPPLES,
  cyberGroundFragmentShader,
  cyberGroundVertexShader,
} from '@/shaders/cyberGround.glsl';

/**
 * 与 WORKS / LOGS / ABOUT 相同的半透明湿地 + 细网格 + 涟漪（CyberGrid Ground）
 */
export default function CyberWetGround({
  bundleRef,
  mood = makeCyberMood('EXPLORE'),
  flat = false,
  brickOverlay = false,
}: {
  bundleRef?: React.RefObject<PhysicsWorldBundle | null>;
  mood?: CyberMood;
  /** EXPLORE：禁用顶点起伏/涟漪，地面保持纯平 */
  flat?: boolean;
  /** 砖块地面之上的薄湿层 — 弱化网格，保留镜像 Fresnel */
  brickOverlay?: boolean;
}) {
  const { camera } = useThree();
  const ripplesRef = useRef<{ x: number; z: number; start: number; strength: number }[]>([]);
  const size = GROUND_HALF_EXTENT * 2;
  const wet = EXPLORE_GROUND_REFLECTION.groundWet;
  const brickWet = EXPLORE_GROUND_REFLECTION.brickWetOverlay;

  const brickWetGrid = useMemo(() => createBrickWetGridUniforms(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFlat: { value: flat ? 1 : 0 },
      uBrickOverlay: { value: brickOverlay ? 1 : 0 },
      ...brickWetGrid,
      uMouse: { value: new THREE.Vector2(0, 0) },
      uMouseStrength: { value: 0.45 },
      uRipples: {
        value: Array.from({ length: CYBER_GROUND_MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)),
      },
      uRippleCount: { value: 0 },
      uGround: { value: mood.ground.clone() },
      uEmber: { value: mood.ember.clone() },
      uAmber: { value: mood.amber.clone() },
      uIntensity: { value: mood.intensity },
      uCamPos: { value: new THREE.Vector3() },
      uFresnelPower: { value: flat ? wet.fresnelPower : 3.0 },
      uFresnelAlphaMin: {
        value: brickOverlay ? brickWet.fresnelAlphaMin : flat ? wet.fresnelAlphaMin : 0.028,
      },
      uFresnelAlphaMax: {
        value: brickOverlay ? brickWet.fresnelAlphaMax : flat ? wet.fresnelAlphaMax : 0.68,
      },
      uEnvReflectStrength: {
        value: brickOverlay ? brickWet.envReflectStrength : flat ? wet.envReflectStrength : 0.0,
      },
      uSpecularStrength: {
        value: brickOverlay ? brickWet.specularStrength : flat ? wet.specularStrength : 0.0,
      },
      uGridAlphaBoost: {
        value: brickOverlay ? brickWet.gridAlphaBoost : flat ? wet.gridAlphaBoost : 0.1,
      },
    }),
    [mood, flat, brickOverlay, wet, brickWet, brickWetGrid],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;
    (uniforms.uGround.value as THREE.Color).lerp(mood.ground, 0.04);
    (uniforms.uEmber.value as THREE.Color).lerp(mood.ember, 0.04);
    (uniforms.uAmber.value as THREE.Color).lerp(mood.amber, 0.04);
    uniforms.uIntensity.value += (mood.intensity - uniforms.uIntensity.value) * 0.04;
    if (flat) {
      (uniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
    }

    const body = bundleRef?.current?.playerBody;
    if (!flat && body) {
      const p = body.translation();
      uniforms.uMouse.value.set(p.x, p.z);
      uniforms.uMouseStrength.value = 0.55;
    }

    const arr = uniforms.uRipples.value as THREE.Vector4[];
    let count = 0;
    for (let i = 0; i < ripplesRef.current.length && count < CYBER_GROUND_MAX_RIPPLES; i++) {
      const r = ripplesRef.current[i]!;
      if (t - r.start > 3.4) continue;
      arr[count]!.set(r.x, r.z, r.start, r.strength);
      count++;
    }
    uniforms.uRippleCount.value = count;

    ripplesRef.current = ripplesRef.current.filter((r) => t - r.start <= 3.4);
  });

  const overlayY = brickOverlay ? brickWet.y : flat ? 0.004 : 0.002;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, overlayY, 0]}
      renderOrder={brickOverlay ? 9 : flat ? 8 : 5}
    >
      <planeGeometry args={[size, size, flat ? 1 : 120, flat ? 1 : 120]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={cyberGroundVertexShader}
        fragmentShader={cyberGroundFragmentShader}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

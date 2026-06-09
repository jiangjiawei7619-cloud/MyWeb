import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type {
  ExploreBuilding,
  ExploreDualPylon,
  ExploreNeonSign,
  ExplorePylon,
} from '@/lib/explore-city-layout';
import { EXPLORE_GROUND_REFLECTION } from '@/lib/explore-ground-reflection';
import { EXPLORE_WORLD_SCALE, GROUND_HALF_EXTENT } from '@/physics/rapier-config';
import { EXPLORE_DISTANCE_LOD } from '@/lib/explore-distance-lod';

type AccentProps = {
  buildings: ExploreBuilding[];
  signs: ExploreNeonSign[];
  pylons: ExplorePylon[];
  dualPylons: ExploreDualPylon[];
};

const FLOOR_Y = EXPLORE_GROUND_REFLECTION.cyberTiles.reflector.y;
const s = EXPLORE_WORLD_SCALE;

/** 跳过会在地面形成紫色光斑/阴影的霓虹色 */
function isPurpleFloorTint(color: THREE.Color): boolean {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return hsl.s > 0.28 && hsl.h >= 0.62 && hsl.h <= 0.92;
}

type PoolInstance = {
  x: number;
  z: number;
  sx: number;
  sz: number;
  color: THREE.Color;
  strength: number;
  rotation?: number;
};

function makePoolMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCamPos: { value: new THREE.Vector3() },
      uDistanceFadeStart: { value: EXPLORE_DISTANCE_LOD.fadeStart },
      uDistanceFadeEnd: { value: EXPLORE_DISTANCE_LOD.fadeEnd },
      uFarFogColor: { value: new THREE.Color(EXPLORE_DISTANCE_LOD.fogColor) },
      uFarFogDensity: { value: EXPLORE_DISTANCE_LOD.fogDensity },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aStrength;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vStrength;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vColor = aColor;
        vStrength = aStrength;
        vec4 wp = instanceMatrix * vec4(position, 1.0);
        vWorldPos = (modelMatrix * wp).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uCamPos;
      uniform float uDistanceFadeStart;
      uniform float uDistanceFadeEnd;
      uniform vec3 uFarFogColor;
      uniform float uFarFogDensity;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vStrength;
      varying vec3 vWorldPos;

      void main() {
        float d = length(vWorldPos - uCamPos);
        float fade = 1.0 - smoothstep(uDistanceFadeStart, uDistanceFadeEnd, d);
        if (fade <= 0.002) discard;
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float core = 1.0 - smoothstep(0.0, 0.2, r);
        float aura = 1.0 - smoothstep(0.12, 0.58, r);
        float alpha = (core * 0.18 + aura * 0.62) * vStrength * fade;
        vec3 col = vColor * fade;
        float fog = clamp(1.0 - exp(-d * uFarFogDensity), 0.0, 1.0);
        gl_FragColor = vec4(mix(col, uFarFogColor, fog), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function usePlaneInstances<T extends { x: number; z: number; sx: number; sz: number; rotation?: number }>(
  items: T[],
  y: number,
) {
  return useMemo(() => {
    const dummy = new THREE.Object3D();
    return items.map((item) => {
      dummy.position.set(item.x, y, item.z);
      dummy.rotation.set(-Math.PI / 2, 0, item.rotation ?? 0);
      dummy.scale.set(item.sx, item.sz, 1);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [items, y]);
}

function NeonFloorPools({ signs }: { signs: ExploreNeonSign[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const items = useMemo<PoolInstance[]>(() => {
    return signs
      .filter((s) => s.y < 34 && !isPurpleFloorTint(s.color))
      .slice(0, 44)
      .map((s) => ({
        x: s.x,
        z: s.z,
        sx: Math.max(2.6, s.w * 0.72),
        sz: Math.max(1.5, s.w * 0.34),
        color: s.color.clone().multiplyScalar(0.88),
        strength: THREE.MathUtils.clamp(0.018 + s.w * 0.0032, 0.022, 0.055),
        rotation: s.rotationY,
      }));
  }, [signs]);

  const matrices = usePlaneInstances(items, FLOOR_Y + 0.014);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const colors = new Float32Array(items.length * 3);
    const strengths = new Float32Array(items.length);
    items.forEach((item, i) => {
      colors[i * 3] = item.color.r;
      colors[i * 3 + 1] = item.color.g;
      colors[i * 3 + 2] = item.color.b;
      strengths[i] = item.strength;
    });
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
    g.setAttribute('aStrength', new THREE.InstancedBufferAttribute(strengths, 1));
    return g;
  }, [items]);
  const material = useMemo(() => makePoolMaterial(), []);

  useFrame(() => {
    (material.uniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
  });

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  if (items.length === 0) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, items.length]} frustumCulled={false} renderOrder={4} />;
}

function FloorGuideAccents() {
  const guides = useMemo(
    () => [
      { x: 0, z: -48 * s, sx: 54 * s, sz: 0.07, color: '#ff2d95', opacity: 0.13 },
      { x: -42 * s, z: -10 * s, sx: 0.06, sz: 70 * s, color: '#ff5357', opacity: 0.1 },
      { x: 42 * s, z: -10 * s, sx: 0.06, sz: 70 * s, color: '#ff5357', opacity: 0.08 },
    ],
    [],
  );

  return (
    <group renderOrder={5}>
      {guides.map((g, i) => (
        <mesh
          key={`${g.x}-${g.z}-${i}`}
          position={[g.x, FLOOR_Y + 0.018, g.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[g.sx, g.sz, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={g.color}
            transparent
            opacity={g.opacity}
            depthWrite={false}
            depthTest
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function LowFloorHaze() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();

  const uniforms = useMemo(
    () => ({
      uCamPos: { value: new THREE.Vector3() },
      uColor: { value: new THREE.Color('#07101a') },
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uCamPos.value.copy(camera.position);
  });

  return (
    <mesh position={[0, FLOOR_Y + 0.028, -10 * s]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
      <planeGeometry args={[GROUND_HALF_EXTENT * 2, GROUND_HALF_EXTENT * 2, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vWorldPos;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `}
        fragmentShader={/* glsl */ `
          precision highp float;
          uniform vec3 uCamPos;
          uniform vec3 uColor;
          uniform float uTime;
          varying vec3 vWorldPos;
          varying vec2 vUv;

          void main() {
            float d = distance(vWorldPos.xz, uCamPos.xz);
            float farFade = smoothstep(22.0, 105.0, d);
            float edgeFade = smoothstep(0.02, 0.14, vUv.x) * smoothstep(0.98, 0.86, vUv.x)
                           * smoothstep(0.02, 0.14, vUv.y) * smoothstep(0.98, 0.86, vUv.y);
            float drift = sin(vWorldPos.x * 0.07 + vWorldPos.z * 0.05 + uTime * 0.08) * 0.5 + 0.5;
            float alpha = farFade * edgeFade * mix(0.035, 0.075, drift);
            gl_FragColor = vec4(uColor, alpha);
          }
        `}
        transparent
        depthWrite={false}
        depthTest
        blending={THREE.NormalBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function FloorLightingAccents(props: AccentProps) {
  return (
    <>
      <NeonFloorPools signs={props.signs} />
      <FloorGuideAccents />
      <LowFloorHaze />
    </>
  );
}

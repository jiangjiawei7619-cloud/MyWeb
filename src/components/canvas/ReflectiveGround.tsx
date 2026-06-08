import { useMemo } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { GROUND_HALF_EXTENT } from '@/physics/createPhysicsWorld';
import { EXPLORE_LIGHTING } from '@/lib/explore-lighting';
import { createGroundColorMap } from '@/utils/groundTextures';

export default function ReflectiveGround() {
  const colorMap = useMemo(() => createGroundColorMap(), []);

  const size = GROUND_HALF_EXTENT * 2;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} receiveShadow>
      <planeGeometry args={[size, size, 1, 1]} />
      <MeshReflectorMaterial
        map={colorMap}
        color="#2a2228"
        emissive="#120a10"
        emissiveIntensity={0.22}
        envMapIntensity={EXPLORE_LIGHTING.ground.envMapIntensity}
        roughness={0.08}
        metalness={0.92}
        mirror={0.92}
        mixBlur={0.32}
        mixStrength={1.15}
        mixContrast={1.12}
        blur={[384, 192]}
        resolution={1024}
        depthScale={0.55}
        minDepthThreshold={0.82}
        maxDepthThreshold={1}
        depthToBlurRatioBias={0.08}
        reflectorOffset={0.012}
      />
    </mesh>
  );
}

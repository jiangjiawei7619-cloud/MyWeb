import * as THREE from 'three';
import { GROUND_HALF_EXTENT } from '@/physics/rapier-config';

const BASE_SIZE = GROUND_HALF_EXTENT * 2;

export default function WorldVoidBase() {
  return (
    <mesh
      name="world-void-base"
      position={[0, -0.012, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-20}
      frustumCulled={false}
    >
      <planeGeometry args={[BASE_SIZE, BASE_SIZE]} />
      <meshBasicMaterial
        color="#111015"
        depthWrite
        depthTest
        toneMapped={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

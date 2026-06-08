import { useMemo } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { GROUND_HALF_EXTENT } from '@/physics/createPhysicsWorld';
import { EXPLORE_GROUND_REFLECTION } from '@/lib/explore-ground-reflection';
import { createExploreGroundTextures } from '@/utils/groundTextures';

/**
 * 湿地面：大块地砖 + 砖面金属/粗糙度驱动反射（颜色贴图仅微色调，避免蒙版感）。
 */
export default function ExploreReflectiveGround() {
  const { colorMap, normalMap, roughnessMap, metalnessMap } = useMemo(
    () => createExploreGroundTextures(GROUND_HALF_EXTENT),
    [],
  );
  const size = GROUND_HALF_EXTENT * 2;
  const { planar } = EXPLORE_GROUND_REFLECTION;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, planar.y, 0]} receiveShadow renderOrder={4}>
      <planeGeometry args={[size, size, 1, 1]} />
      <MeshReflectorMaterial
        map={colorMap}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.1, 0.1)}
        roughnessMap={roughnessMap}
        roughness={0.42}
        metalnessMap={metalnessMap}
        metalness={0.72}
        color="#1a1418"
        emissive="#12080c"
        emissiveIntensity={0.08}
        envMapIntensity={0}
        mirror={planar.mirror}
        mixBlur={planar.mixBlur}
        mixStrength={planar.mixStrength}
        mixContrast={planar.mixContrast}
        blur={planar.blur}
        resolution={planar.resolution}
        depthScale={planar.depthScale}
        minDepthThreshold={planar.minDepthThreshold}
        maxDepthThreshold={planar.maxDepthThreshold}
        depthToBlurRatioBias={planar.depthToBlurRatioBias}
        reflectorOffset={planar.reflectorOffset}
        depthWrite={true}
      />
    </mesh>
  );
}

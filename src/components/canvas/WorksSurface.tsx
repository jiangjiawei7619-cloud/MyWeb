import { Html } from '@react-three/drei';
import * as THREE from 'three';
import WorksContent from '@/components/sections/WorksContent';
import { BUILDING08_C_ANCHOR, DEBUG_BUILDING_ANCHORS } from '@/lib/section-camera-presets';

export default function WorksSurface() {
  return (
    <group name="works-surface-building08-c">
      <Html
        transform
        occlude={false}
        position={BUILDING08_C_ANCHOR.panelPosition}
        rotation={BUILDING08_C_ANCHOR.panelRotation}
        scale={BUILDING08_C_ANCHOR.panelScale}
        zIndexRange={[35, 0]}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="works-surface-panel">
          <WorksContent />
        </div>
      </Html>

      {DEBUG_BUILDING_ANCHORS && (
        <group>
          <mesh position={BUILDING08_C_ANCHOR.center}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshBasicMaterial color="#00eefc" toneMapped={false} />
          </mesh>
          <arrowHelper
            args={[
              new THREE.Vector3(...BUILDING08_C_ANCHOR.normal),
              new THREE.Vector3(...BUILDING08_C_ANCHOR.center),
              2.2,
              '#ff5357',
            ]}
          />
          <mesh position={BUILDING08_C_ANCHOR.cameraPosition}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshBasicMaterial color="#ff5357" toneMapped={false} />
          </mesh>
          <Html position={BUILDING08_C_ANCHOR.center} style={{ pointerEvents: 'none' }}>
            <div className="works-anchor-label">building08:C / WORKS</div>
          </Html>
        </group>
      )}
    </group>
  );
}

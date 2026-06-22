import { useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import WorksContent from '@/components/sections/WorksContent';
import { BUILDING08_C_ANCHOR, DEBUG_BUILDING_ANCHORS } from '@/lib/section-camera-presets';
import type { ActivePage } from '@/lib/types';
import { WorksWorldModeContext } from '@/lib/works-world-mode-context';
import { DEBUG_WORKS_SURFACE_FIT } from '@/lib/works-surface-config';

function DebugWireRect({
  width,
  height,
  color,
  position,
  rotation,
}: {
  width: number;
  height: number;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.85} toneMapped={false} />
    </mesh>
  );
}

export default function WorksSurface({
  activeSection = 'EXPLORE',
}: {
  activeSection?: ActivePage;
}) {
  const { gl } = useThree();
  const layout = BUILDING08_C_ANCHOR;
  const panelGroupRef = useRef<THREE.Group>(null);
  const normal = useMemo(
    () => new THREE.Vector3(...layout.normal),
    [layout.normal],
  );
  const portal = useMemo(
    () => ({ current: gl.domElement.parentElement as HTMLElement }),
    [gl.domElement],
  );
  const showDebug = DEBUG_WORKS_SURFACE_FIT || DEBUG_BUILDING_ANCHORS;

  return (
    <group name="works-surface-building08-c">
      <group ref={panelGroupRef} position={layout.panelPosition} rotation={layout.panelRotation}>
        <mesh renderOrder={12}>
          <planeGeometry args={[layout.panelWidth, layout.panelHeight]} />
          <meshBasicMaterial
            color="#000000"
            toneMapped={false}
            depthWrite
            depthTest
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
        <Html
          transform
          center
          portal={portal}
          eps={0}
          position={[0, 0, 0.004]}
          scale={layout.htmlScale}
          distanceFactor={layout.htmlDistanceFactor}
          style={{ pointerEvents: 'auto' }}
        >
          <WorksWorldModeContext.Provider value>
            <div
              className="works-world-panel works-content-world-mode"
              style={{
                width: `${layout.panelPxWidth}px`,
                height: `${layout.panelPxHeight}px`,
              }}
              onPointerEnter={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="works-content-root">
                <WorksContent active={activeSection === 'WORKS'} />
              </div>
            </div>
          </WorksWorldModeContext.Provider>
        </Html>
      </group>

      {showDebug && (
        <group>
          <DebugWireRect
            width={layout.faceSize.width}
            height={layout.faceSize.height}
            color="#00eefc"
            position={layout.faceCenter}
            rotation={layout.panelRotation}
          />
          <DebugWireRect
            width={layout.panelWidth}
            height={layout.panelHeight}
            color="#ff5357"
            position={layout.panelPosition}
            rotation={layout.panelRotation}
          />
          <mesh position={layout.faceCenter}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshBasicMaterial color="#00eefc" toneMapped={false} />
          </mesh>
          <arrowHelper
            args={[normal, new THREE.Vector3(...layout.faceCenter), 2.4, '#ff5357']}
          />
          <mesh position={layout.cameraPosition}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshBasicMaterial color="#ff5357" toneMapped={false} />
          </mesh>
          <Html position={layout.faceCenter} style={{ pointerEvents: 'none' }}>
            <div className="works-fit-debug-label">
              <div>building08:C / WORKS FIT</div>
              <div>
                face {layout.faceSize.width.toFixed(2)} × {layout.faceSize.height.toFixed(2)} m
              </div>
              <div>
                panel {layout.panelWidth.toFixed(2)} × {layout.panelHeight.toFixed(2)} m (
                {(layout.faceMargin * 100).toFixed(0)}%)
              </div>
              <div>
                design {layout.designWidth} × {layout.designHeight} px · htmlScale{' '}
                {layout.htmlScale.toFixed(5)}
              </div>
              <div>distanceFactor {layout.htmlDistanceFactor}</div>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

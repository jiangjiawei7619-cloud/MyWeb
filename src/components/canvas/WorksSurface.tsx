import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import WorksContent from '@/components/sections/WorksContent';
import { BUILDING08_C_ANCHOR, DEBUG_BUILDING_ANCHORS } from '@/lib/section-camera-presets';
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

export default function WorksSurface() {
  const layout = BUILDING08_C_ANCHOR;
  const normal = useMemo(
    () => new THREE.Vector3(...layout.normal),
    [layout.normal],
  );
  const showDebug = DEBUG_WORKS_SURFACE_FIT || DEBUG_BUILDING_ANCHORS;

  return (
    <group name="works-surface-building08-c">
      {/* 贴 C 面外侧的背景板 — 世界单位铺满 92% 面宽×高 */}
      <mesh
        position={layout.panelPosition}
        rotation={layout.panelRotation}
        renderOrder={2}
      >
        <planeGeometry args={[layout.panelWidth, layout.panelHeight]} />
        <meshBasicMaterial
          color="#0a0812"
          transparent
          opacity={0.94}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      <Html
        transform
        center
        occlude={false}
        position={layout.panelPosition}
        rotation={layout.panelRotation}
        scale={layout.htmlScale}
        distanceFactor={layout.htmlDistanceFactor}
        zIndexRange={[35, 0]}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          className="works-world-panel works-content-world-mode"
          style={{
            width: `${layout.panelPxWidth}px`,
            height: `${layout.panelPxHeight}px`,
          }}
          onPointerEnter={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="works-content-root"
            style={{
              width: `${layout.designWidth}px`,
              height: `${layout.designHeight}px`,
              ['--works-cover-scale' as string]: String(layout.contentCoverScale),
            }}
          >
            <WorksContent />
          </div>
        </div>
      </Html>

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
                design {layout.designWidth} × {layout.designHeight} px
              </div>
              <div>
                dom {layout.panelPxWidth.toFixed(0)} × {layout.panelPxHeight.toFixed(0)} px · scale{' '}
                {layout.htmlScale.toFixed(5)} · df {layout.htmlDistanceFactor}
              </div>
              <div>contentCoverScale {layout.contentCoverScale.toFixed(3)}</div>
              <div>offset {layout.surfaceOffset} m</div>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

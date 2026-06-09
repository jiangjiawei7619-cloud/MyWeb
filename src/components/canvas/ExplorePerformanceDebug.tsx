import { useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Perf } from 'r3f-perf';
import * as THREE from 'three';
import { detectPerformanceTier } from '@/utils/performanceTier';

type DebugStats = {
  fps: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  neonSigns: number;
  emissiveMaterials: number;
  bloomObjects: number;
  reflectiveObjects: number;
  transparentObjects: number;
  videoTextures: number;
  canvasTextures: number;
  quality: string;
};

const EMPTY_STATS: DebugStats = {
  fps: 0,
  calls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  programs: 0,
  neonSigns: 0,
  emissiveMaterials: 0,
  bloomObjects: 0,
  reflectiveObjects: 0,
  transparentObjects: 0,
  videoTextures: 0,
  canvasTextures: 0,
  quality: 'high',
};

function countMaterials(material: THREE.Material | THREE.Material[], visit: (mat: THREE.Material) => void) {
  if (Array.isArray(material)) material.forEach(visit);
  else visit(material);
}

function countMaterialTextures(material: THREE.Material): { video: number; canvas: number } {
  const record = material as unknown as Record<string, unknown>;
  let video = 0;
  let canvas = 0;
  const inspectValue = (value: unknown) => {
    if (value instanceof THREE.VideoTexture) video += 1;
    if (value instanceof THREE.CanvasTexture) canvas += 1;
  };
  Object.values(record).forEach(inspectValue);
  const uniforms = (material as THREE.ShaderMaterial).uniforms;
  if (uniforms) {
    Object.values(uniforms).forEach((uniform) => inspectValue(uniform.value));
  }
  return { video, canvas };
}

function ExploreDebugPanel() {
  const { gl, scene } = useThree();
  const quality = useMemo(() => detectPerformanceTier(), []);
  const lastTimeRef = useRef(performance.now());
  const framesRef = useRef(0);
  const elapsedRef = useRef(0);
  const [stats, setStats] = useState<DebugStats>({ ...EMPTY_STATS, quality });

  useFrame((_, delta) => {
    framesRef.current += 1;
    elapsedRef.current += delta;
    if (elapsedRef.current < 0.5) return;

    const now = performance.now();
    const fps = Math.round((framesRef.current * 1000) / Math.max(1, now - lastTimeRef.current));
    framesRef.current = 0;
    elapsedRef.current = 0;
    lastTimeRef.current = now;

    let neonSigns = 0;
    let emissiveMaterials = 0;
    let bloomObjects = 0;
    let reflectiveObjects = 0;
    let transparentObjects = 0;
    let videoTextures = 0;
    let canvasTextures = 0;

    scene.traverse((obj) => {
      if (!obj.visible) return;
      const data = obj.userData as {
        neonSignCount?: number;
        emissiveMaterialsCount?: number;
        bloomEnabledCount?: number;
        reflectionLayerCount?: number;
        transparentMaterialsCount?: number;
      };
      neonSigns += data.neonSignCount ?? 0;
      emissiveMaterials += data.emissiveMaterialsCount ?? 0;
      bloomObjects += data.bloomEnabledCount ?? 0;
      reflectiveObjects += data.reflectionLayerCount ?? 0;
      transparentObjects += data.transparentMaterialsCount ?? 0;

      const maybeMesh = obj as THREE.Mesh;
      if (!maybeMesh.material) return;
      countMaterials(maybeMesh.material, (mat) => {
        const standard = mat as THREE.MeshStandardMaterial;
        const basic = mat as THREE.MeshBasicMaterial;
        if (
          ('emissiveIntensity' in standard && standard.emissiveIntensity > 0) ||
          ('color' in basic && mat.toneMapped === false)
        ) {
          emissiveMaterials += 1;
        }
        if (mat.transparent) transparentObjects += 1;
        const textureCounts = countMaterialTextures(mat);
        videoTextures += textureCounts.video;
        canvasTextures += textureCounts.canvas;
      });
    });

    const info = gl.info;
    const programs = ((info as unknown as { programs?: unknown[] }).programs ?? []).length;
    setStats({
      fps,
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs,
      neonSigns,
      emissiveMaterials,
      bloomObjects,
      reflectiveObjects,
      transparentObjects,
      videoTextures,
      canvasTextures,
      quality,
    });
  });

  return (
    <Html fullscreen prepend zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
      <div className="explore-debug-panel">
        <div className="explore-debug-title">SASMY PERF · {stats.quality}</div>
        <div>FPS {stats.fps}</div>
        <div>draw calls {stats.calls}</div>
        <div>triangles {stats.triangles.toLocaleString()}</div>
        <div>geometries {stats.geometries}</div>
        <div>textures {stats.textures}</div>
        <div>programs {stats.programs}</div>
        <div>neon signs count {stats.neonSigns}</div>
        <div>emissive materials {stats.emissiveMaterials}</div>
        <div>bloom enabled objects {stats.bloomObjects}</div>
        <div>reflective objects {stats.reflectiveObjects}</div>
        <div>transparent materials {stats.transparentObjects}</div>
        <div>video textures {stats.videoTextures}</div>
        <div>canvas textures {stats.canvasTextures}</div>
      </div>
    </Html>
  );
}

export default function ExplorePerformanceDebug() {
  if (!import.meta.env.DEV) return null;
  return (
    <>
      <Perf position="top-left" minimal={false} deepAnalyze={false} />
      <ExploreDebugPanel />
    </>
  );
}

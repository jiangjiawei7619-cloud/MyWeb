import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import CameraController from '@/components/camera-controller';
import { createTerrainMaterial, useTerrainUniforms } from '@/components/terrain-shader';
import {
  ArchiveStructure,
  BridgeStructure,
  CoreStructure,
  ForgeStructure,
  MirrorStructure,
  VoidStructure,
} from '@/components/structures';
import {
  PERF_TIER,
  ROUTE_VIEWPOINTS,
  STRUCTURE_POSITIONS,
  STRUCTURE_ROUTE_MAP,
  TRANSITION_CONFIG,
  WORLD_COLORS,
  type StructureId,
  type WorldRoutePath,
} from '@/lib/world-config';

interface CyberWorldProps {
  routePath: WorldRoutePath;
}

interface PerfState {
  tier: 'desktop' | 'mobile' | 'low';
  terrainSegments: number;
  particleCount: number;
  fogPlanes: number;
  enabledStructures: StructureId[];
}

interface TransitionMetrics {
  speed: number;
  transitionProgress: number;
  warningPulse: number;
  landingRipple: number;
  focusBoost: number;
  travelDirection: THREE.Vector2;
}

function detectPerfTier(): PerfState {
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const narrowScreen = window.matchMedia('(max-width: 900px)').matches;
  const lowCpu = (navigator.hardwareConcurrency ?? 8) <= 4;
  const lowMemory = ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;

  const tier: 'desktop' | 'mobile' | 'low' = lowCpu || lowMemory ? 'low' : coarsePointer || narrowScreen ? 'mobile' : 'desktop';
  return { tier, ...PERF_TIER[tier] };
}

function SunDisc() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }

          void main() {
            vec2 uv = vUv * 2.0 - 1.0;
            float r = length(uv);
            float ring = smoothstep(1.0, 0.15, r);
            float flow = noise(uv * 4.2 + vec2(uTime * 0.22, -uTime * 0.12));
            float streak = smoothstep(0.45, 1.0, flow + sin((uv.y + uTime * 0.15) * 12.0) * 0.2);
            vec3 core = vec3(1.0, 0.28, 0.16);
            vec3 edge = vec3(0.63, 0.06, 0.08);
            vec3 color = mix(edge, core, ring) + vec3(0.25, 0.05, 0.02) * streak;
            float alpha = ring * (0.72 + streak * 0.25);
            gl_FragColor = vec4(color, alpha);
          }
        `,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh position={[12, 24, -64]}>
      <planeGeometry args={[24, 24]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

function Atmosphere({ fogBias }: { fogBias: number }) {
  const { scene } = useThree();
  const sunColor = useMemo(() => new THREE.Color(WORLD_COLORS.sun), []);

  useEffect(() => {
    scene.fog = new THREE.Fog(WORLD_COLORS.fogNear, 20, 118);
  }, [scene]);

  useFrame(() => {
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = 16 - fogBias * 2;
      scene.fog.far = 116 + fogBias * 14;
      scene.fog.color.set(WORLD_COLORS.fogNear);
    }
  });

  return (
    <>
      <color attach="background" args={[WORLD_COLORS.skyBottom]} />
      <ambientLight intensity={0.22} color={WORLD_COLORS.skyTop} />
      <directionalLight position={[25, 32, -12]} intensity={1.25} color={sunColor} />
      <pointLight position={[10, 19, -16]} intensity={2.2} distance={140} color="#ff5b4f" />
      <SunDisc />
    </>
  );
}

function FogLayers({ count, emphasis }: { count: number; emphasis: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const y = 0.8 + index * 1.2;
        const opacity = 0.08 + index * 0.03 + emphasis * 0.1;
        return (
          <mesh key={`fog-${index}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, -6 - index * 7]}>
            <planeGeometry args={[190 - index * 10, 190 - index * 10, 1, 1]} />
            <meshBasicMaterial color="#4a1010" transparent opacity={opacity} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
}

function DataStreaks({
  speedBoost,
  travelDirection,
}: {
  speedBoost: number;
  travelDirection: THREE.Vector2;
}) {
  const linesRef = useRef<THREE.LineSegments>(null);
  const lineCount = 120;
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(lineCount * 6);
    for (let i = 0; i < lineCount; i++) {
      const x = (Math.random() - 0.5) * 130;
      const y = 8 + Math.random() * 28;
      const z = -10 - Math.random() * 100;
      arr[i * 6] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x + (Math.random() - 0.5) * 8;
      arr[i * 6 + 4] = y - Math.random() * 8;
      arr[i * 6 + 5] = z + Math.random() * 5;
    }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    const lines = linesRef.current;
    if (!lines) return;
    const attr = lines.geometry.attributes.position as THREE.BufferAttribute;
    const drift = delta * (5 + speedBoost * 14);
    const sideDrift = delta * travelDirection.x * (2 + speedBoost * 2.5);
    for (let i = 0; i < lineCount; i++) {
      const x1 = attr.getX(i * 2) + sideDrift;
      const x2 = attr.getX(i * 2 + 1) + sideDrift;
      const z1 = attr.getZ(i * 2) + drift;
      const z2 = attr.getZ(i * 2 + 1) + drift;
      if (z1 > 26 || z2 > 26) {
        const baseZ = -90 - Math.random() * 60;
        const baseX = (Math.random() - 0.5) * 130;
        attr.setX(i * 2, baseX);
        attr.setX(i * 2 + 1, baseX + (Math.random() - 0.5) * 8);
        attr.setZ(i * 2, baseZ);
        attr.setZ(i * 2 + 1, baseZ + 4 + Math.random() * 5);
      } else {
        attr.setX(i * 2, x1);
        attr.setX(i * 2 + 1, x2);
        attr.setZ(i * 2, z1);
        attr.setZ(i * 2 + 1, z2);
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial color="#ff735f" transparent opacity={0.34} />
    </lineSegments>
  );
}

function ParticleLayers({
  count,
  speedBoost,
  travelDirection,
}: {
  count: number;
  speedBoost: number;
  travelDirection: THREE.Vector2;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const layerSplit = useMemo(() => [Math.floor(count * 0.55), Math.floor(count * 0.3), count - Math.floor(count * 0.55) - Math.floor(count * 0.3)], [count]);
  const total = layerSplit[0] + layerSplit[1] + layerSplit[2];

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(total * 3);
    const vel = new Float32Array(total * 3);
    for (let i = 0; i < total; i++) {
      const layer = i < layerSplit[0] ? 0 : i < layerSplit[0] + layerSplit[1] ? 1 : 2;
      const radius = layer === 0 ? 36 : layer === 1 ? 54 : 74;
      pos[i * 3] = (Math.random() - 0.5) * radius;
      pos[i * 3 + 1] = -2 + Math.random() * 24;
      pos[i * 3 + 2] = (Math.random() - 0.5) * radius;
      vel[i * 3] = (Math.random() - 0.5) * 0.14;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      vel[i * 3 + 2] = 0.18 + Math.random() * 0.35;
    }
    return { positions: pos, velocities: vel };
  }, [layerSplit, total]);

  const posRef = useRef(positions.slice());
  const velRef = useRef(velocities);

  useFrame(({ camera }, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const attr = points.geometry.attributes.position as THREE.BufferAttribute;
    const cameraPos = camera.position;
    const speedFactor = 1 + speedBoost * 1.5;
    const transitionPushX = travelDirection.x * delta * (2.4 + speedBoost * 3.8);
    const transitionPushZ = travelDirection.y * delta * (1.4 + speedBoost * 1.8);
    for (let i = 0; i < total; i++) {
      const idx = i * 3;
      const x = posRef.current[idx];
      const y = posRef.current[idx + 1];
      const z = posRef.current[idx + 2];
      const dx = x - cameraPos.x;
      const dy = y - cameraPos.y;
      const dz = z - cameraPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      // 镜头附近粒子扰动：越靠近相机排斥越明显，形成“风压”感觉
      const repel = distSq < 80 ? (80 - distSq) * 0.0008 : 0;
      posRef.current[idx] = x + velRef.current[idx] * speedFactor + dx * repel * delta * 60 + transitionPushX;
      posRef.current[idx + 1] = y + velRef.current[idx + 1] * speedFactor + dy * repel * delta * 60;
      posRef.current[idx + 2] = z + velRef.current[idx + 2] * speedFactor + dz * repel * delta * 60 + transitionPushZ;

      if (Math.abs(posRef.current[idx]) > 88 || Math.abs(posRef.current[idx + 2]) > 88 || posRef.current[idx + 1] < -8 || posRef.current[idx + 1] > 40) {
        posRef.current[idx] = (Math.random() - 0.5) * 70;
        posRef.current[idx + 1] = -2 + Math.random() * 24;
        posRef.current[idx + 2] = (Math.random() - 0.5) * 70;
      }

      attr.setXYZ(i, posRef.current[idx], posRef.current[idx + 1], posRef.current[idx + 2]);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posRef.current, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ff6b5d" size={0.12} transparent opacity={0.72} depthWrite={false} />
    </points>
  );
}

function DebrisField({ reveal }: { reveal: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const debris = useMemo(() => {
    const instances: Array<{ pos: THREE.Vector3Tuple; rot: THREE.Vector3Tuple; scale: number }> = [];
    for (let i = 0; i < 34; i++) {
      instances.push({
        pos: [(Math.random() - 0.5) * 160, 4 + Math.random() * 22, -20 - Math.random() * 160],
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        scale: 0.6 + Math.random() * 2.8,
      });
    }
    return instances;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.02;
    groupRef.current.children.forEach((child, index) => {
      child.rotation.x += delta * (0.02 + (index % 3) * 0.01);
      child.rotation.y += delta * (0.03 + (index % 5) * 0.01);
    });
  });

  return (
    <group ref={groupRef}>
      {debris.map((item, index) => (
        <mesh key={`debris-${index}`} position={item.pos} rotation={item.rot} scale={item.scale}>
          <tetrahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#2a0c0f"
            emissive="#ff4f42"
            emissiveIntensity={0.08 + reveal * 0.5}
            metalness={0.78}
            roughness={0.36}
            transparent
            opacity={0.1 + reveal * 0.62}
          />
        </mesh>
      ))}
    </group>
  );
}

function Terrain({
  segments,
  tierScale,
  speedBoost,
  transitionBoost,
  hoverPoint,
  hoverStrength,
  landingRipple,
  registerTerrain,
}: {
  segments: number;
  tierScale: number;
  speedBoost: number;
  transitionBoost: number;
  hoverPoint: THREE.Vector2;
  hoverStrength: number;
  landingRipple: number;
  registerTerrain: (mesh: THREE.Mesh | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useTerrainUniforms(tierScale);
  const material = useMemo(() => createTerrainMaterial(uniforms), [uniforms]);

  useEffect(() => {
    registerTerrain(meshRef.current);
    return () => registerTerrain(null);
  }, [registerTerrain]);

  useFrame(({ clock }, delta) => {
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uHoverXZ.value.lerp(hoverPoint, Math.min(1, delta * 8));
    uniforms.uHoverForce.value += (hoverStrength - uniforms.uHoverForce.value) * Math.min(1, delta * 7);
    const emissiveTarget = speedBoost * 0.9 + landingRipple * 0.5;
    uniforms.uEmissiveBoost.value += (emissiveTarget - uniforms.uEmissiveBoost.value) * Math.min(1, delta * 5);
    uniforms.uTransitionBoost.value += (transitionBoost - uniforms.uTransitionBoost.value) * Math.min(1, delta * 5);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]} receiveShadow>
      <planeGeometry args={[200, 200, segments, segments]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function WarningGrid({ pulse }: { pulse: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.28, 0]}>
      <planeGeometry args={[194, 194, 1, 1]} />
      <meshBasicMaterial color={WORLD_COLORS.warning} transparent opacity={pulse * 0.25} wireframe />
    </mesh>
  );
}

const STRUCTURE_LABELS: Record<StructureId, string> = {
  core: 'CORE / HOME',
  forge: 'FORGE / PROJECTS',
  archive: 'ARCHIVE / BLOG',
  mirror: 'MIRROR / ABOUT',
  bridge: 'BRIDGE / CONTACT',
  void: 'VOID / 404',
};

function Scene({
  routePath,
  perf,
  onWarningPulse,
}: {
  routePath: WorldRoutePath;
  perf: PerfState;
  onWarningPulse: (value: number) => void;
}) {
  const { camera } = useThree();
  const [hoveredStructure, setHoveredStructure] = useState<StructureId | null>(null);
  const [focusStructure, setFocusStructure] = useState<StructureId | null>(null);
  const [metrics, setMetrics] = useState<TransitionMetrics>({
    speed: 0,
    transitionProgress: 0,
    warningPulse: 0,
    landingRipple: 0,
    focusBoost: 0,
    travelDirection: new THREE.Vector2(0, -1),
  });
  const hoverPointRef = useRef(new THREE.Vector2(0, 0));
  const hoverStrengthRef = useRef(0);
  const terrainRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2(0, 0));

  const focusPoint = focusStructure ? STRUCTURE_POSITIONS[focusStructure] : null;
  const destinationStructure = useMemo(() => {
    return (Object.keys(STRUCTURE_ROUTE_MAP) as StructureId[]).find((id) => STRUCTURE_ROUTE_MAP[id] === routePath) ?? null;
  }, [routePath]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pointerRef.current.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  useEffect(() => {
    onWarningPulse(metrics.warningPulse);
  }, [metrics.warningPulse, onWarningPulse]);

  useEffect(() => {
    if (!focusStructure) return;
    const timer = window.setTimeout(() => {
      setFocusStructure(null);
    }, TRANSITION_CONFIG.quickFocusSec * 1000 + 120);
    return () => window.clearTimeout(timer);
  }, [focusStructure]);

  useFrame((_, delta) => {
    const terrain = terrainRef.current;
    if (!terrain) {
      hoverStrengthRef.current *= 0.95;
      return;
    }
    raycasterRef.current.setFromCamera(pointerRef.current, camera);
    const hit = raycasterRef.current.intersectObject(terrain, false)[0];
    if (hit) {
      hoverPointRef.current.set(hit.point.x, hit.point.z);
      hoverStrengthRef.current += (1 - hoverStrengthRef.current) * Math.min(1, delta * 9);
    } else {
      hoverStrengthRef.current += (0 - hoverStrengthRef.current) * Math.min(1, delta * 6);
    }
  });

  return (
    <>
      <Atmosphere fogBias={metrics.focusBoost + metrics.transitionProgress * 0.35} />
      <FogLayers count={perf.fogPlanes} emphasis={metrics.focusBoost} />
      <Terrain
        segments={perf.terrainSegments}
        tierScale={perf.tier === 'low' ? 0.75 : perf.tier === 'mobile' ? 0.88 : 1}
        speedBoost={metrics.speed}
        transitionBoost={metrics.transitionProgress + metrics.focusBoost}
        hoverPoint={hoverPointRef.current}
        hoverStrength={hoverStrengthRef.current}
        landingRipple={metrics.landingRipple}
        registerTerrain={(mesh) => {
          terrainRef.current = mesh;
        }}
      />
      <WarningGrid pulse={metrics.warningPulse} />
      <DataStreaks speedBoost={metrics.speed + metrics.transitionProgress * 0.4} travelDirection={metrics.travelDirection} />
      <ParticleLayers
        count={perf.particleCount}
        speedBoost={metrics.speed + metrics.transitionProgress * 0.6}
        travelDirection={metrics.travelDirection}
      />
      <DebrisField reveal={metrics.transitionProgress * 0.7 + metrics.focusBoost * 0.9} />

      {perf.enabledStructures.includes('core') && (
        <CoreStructure
          id="core"
          position={STRUCTURE_POSITIONS.core}
          emphasis={destinationStructure === 'core' ? 1 + metrics.transitionProgress * 0.8 : 0}
          highlighted={hoveredStructure === 'core'}
          focused={focusStructure === 'core'}
          showLabel={hoveredStructure === 'core'}
          onHover={setHoveredStructure}
          onSelect={setFocusStructure}
          label={STRUCTURE_LABELS.core}
        />
      )}
      {perf.enabledStructures.includes('forge') && (
        <ForgeStructure
          id="forge"
          position={STRUCTURE_POSITIONS.forge}
          emphasis={destinationStructure === 'forge' ? 1 + metrics.transitionProgress * 0.8 : 0}
          highlighted={hoveredStructure === 'forge'}
          focused={focusStructure === 'forge'}
          showLabel={hoveredStructure === 'forge'}
          onHover={setHoveredStructure}
          onSelect={setFocusStructure}
          label={STRUCTURE_LABELS.forge}
        />
      )}
      {perf.enabledStructures.includes('archive') && (
        <ArchiveStructure
          id="archive"
          position={STRUCTURE_POSITIONS.archive}
          emphasis={destinationStructure === 'archive' ? 1 + metrics.transitionProgress * 0.8 : 0}
          highlighted={hoveredStructure === 'archive'}
          focused={focusStructure === 'archive'}
          showLabel={hoveredStructure === 'archive'}
          onHover={setHoveredStructure}
          onSelect={setFocusStructure}
          label={STRUCTURE_LABELS.archive}
        />
      )}
      {perf.enabledStructures.includes('mirror') && (
        <MirrorStructure
          id="mirror"
          position={STRUCTURE_POSITIONS.mirror}
          emphasis={destinationStructure === 'mirror' ? 1 + metrics.transitionProgress * 0.8 : 0}
          highlighted={hoveredStructure === 'mirror'}
          focused={focusStructure === 'mirror'}
          showLabel={hoveredStructure === 'mirror'}
          onHover={setHoveredStructure}
          onSelect={setFocusStructure}
          label={STRUCTURE_LABELS.mirror}
        />
      )}
      {perf.enabledStructures.includes('bridge') && (
        <BridgeStructure
          id="bridge"
          position={STRUCTURE_POSITIONS.bridge}
          emphasis={destinationStructure === 'bridge' ? 1 + metrics.transitionProgress * 0.8 : 0}
          highlighted={hoveredStructure === 'bridge'}
          focused={focusStructure === 'bridge'}
          showLabel={hoveredStructure === 'bridge'}
          onHover={setHoveredStructure}
          onSelect={setFocusStructure}
          label={STRUCTURE_LABELS.bridge}
        />
      )}
      {perf.enabledStructures.includes('void') && (
        <VoidStructure
          id="void"
          position={STRUCTURE_POSITIONS.void}
          emphasis={destinationStructure === 'void' ? 1 + metrics.transitionProgress * 0.8 : 0}
          highlighted={hoveredStructure === 'void'}
          focused={focusStructure === 'void'}
          showLabel={hoveredStructure === 'void'}
          onHover={setHoveredStructure}
          onSelect={setFocusStructure}
          label={STRUCTURE_LABELS.void}
        />
      )}

      <CameraController routePath={routePath} focusStructure={focusStructure} focusPoint={focusPoint} onMetrics={setMetrics} />
    </>
  );
}

export default function CyberWorld({ routePath }: CyberWorldProps) {
  const [perf, setPerf] = useState<PerfState | null>(null);
  const [warningPulse, setWarningPulse] = useState(0);

  useEffect(() => {
    setPerf(detectPerfTier());
  }, []);

  if (!perf) return null;

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={perf.tier === 'desktop' ? [1, 1.5] : [1, 1.25]}
        gl={{ antialias: perf.tier !== 'low', alpha: false, powerPreference: 'high-performance' }}
        camera={{
          position: ROUTE_VIEWPOINTS['/'].position,
          fov: ROUTE_VIEWPOINTS['/'].fov,
          near: 0.1,
          far: 260,
        }}
      >
        <Scene routePath={routePath} perf={perf} onWarningPulse={setWarningPulse} />
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0 z-[5] transition-opacity duration-200"
        style={{
          opacity: warningPulse,
          background:
            'radial-gradient(circle at center, rgba(255,80,74,0.00) 45%, rgba(255,72,65,0.08) 100%)',
        }}
      >
        <div className="absolute right-8 top-24 border border-[#ff6a60]/50 bg-[#1f0808]/65 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-[#ff9a95]">
          BOUNDARY LIMIT
        </div>
      </div>
    </div>
  );
}

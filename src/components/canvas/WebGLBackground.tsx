import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  useBitChan,
  type FragmentId,
  type WebGLEffects,
} from '@/contexts/BitChanContext';

/** 记忆碎片配置 */
const FRAGMENTS: Array<{
  id: FragmentId;
  name: string;
  color: string;
  position: [number, number, number];
  kind: 'birth' | 'learn' | 'error' | 'connect' | 'wait' | 'future';
}> = [
  { id: 'birth', name: '诞生', color: '#ff2a2a', position: [5.5, 1.2, 3.2], kind: 'birth' },
  { id: 'learn', name: '学习', color: '#d4af37', position: [-6.2, 0.8, 4.1], kind: 'learn' },
  { id: 'error', name: '错误', color: '#71717a', position: [3.8, 3.1, -5.8], kind: 'error' },
  { id: 'connect', name: '连接', color: '#00f0ff', position: [-4.5, 2.4, -6.5], kind: 'connect' },
  { id: 'wait', name: '等待', color: '#2a0a0a', position: [7.2, -0.5, -2.1], kind: 'wait' },
  { id: 'future', name: '未来', color: '#ff006e', position: [-5.8, 3.8, 2.5], kind: 'future' },
];

const GROUND_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uWaveAmp;
  uniform float uWaveFreq;
  varying vec2 vUv;
  varying float vElev;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(uTime * uWaveFreq + pos.x * 0.3) * cos(uTime * uWaveFreq * 0.6 + pos.y * 0.3) * uWaveAmp;
    pos.z += wave;
    vElev = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const GROUND_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElev;
  void main() {
    vec2 grid = abs(fract(vUv * 80.0 - 0.5) - 0.5);
    float line = min(grid.x, grid.y);
    float gridLine = 1.0 - smoothstep(0.0, 0.04, line);
    float node = (1.0 - smoothstep(0.0, 0.08, line)) * step(0.92, gridLine);
    vec3 base = vec3(0.02, 0.0, 0.0);
    vec3 gridCol = vec3(1.0, 0.16, 0.16) * gridLine * 0.03;
    vec3 nodeCol = vec3(1.0, 0.2, 0.2) * node * 0.35;
    vec3 col = base + gridCol + nodeCol + vec3(vElev * 0.08);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const PLATFORM_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uRipple;
  uniform int uPattern;
  varying vec2 vUv;
  varying float vRipple;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float d = length(uv - 0.5) * 2.0;
    float ripple = sin(d * 8.0 - uTime * 3.0) * uRipple * 0.08;
    if (uPattern == 1) ripple = sin(d * 12.0 - uTime * 4.0) * uRipple * 0.1;
    if (uPattern == 2) ripple = sin(vUv.x * 20.0 - uTime * 2.0) * sin(vUv.y * 20.0 - uTime * 2.0) * uRipple * 0.06;
    if (uPattern == 3) ripple = sin(d * 6.0 + atan(vUv.y - 0.5, vUv.x - 0.5) * 4.0 - uTime * 2.0) * uRipple * 0.09;
    if (uPattern == 4) ripple = sin(uTime * 0.5) * uRipple * 0.02;
    if (uPattern == 5) ripple = max(0.0, 1.0 - d) * sin(uTime * 2.0) * uRipple * 0.12;
    pos.z += ripple;
    vRipple = ripple;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const PLATFORM_FRAG = /* glsl */ `
  uniform vec3 uEdgeColor;
  varying vec2 vUv;
  varying float vRipple;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    vec3 base = vec3(0.04, 0.0, 0.0);
    vec3 edge = uEdgeColor * smoothstep(0.85, 0.95, d) * 0.6;
    gl_FragColor = vec4(base + edge + vec3(vRipple * 2.0), 1.0);
  }
`;

function patternToInt(pattern: WebGLEffects['platformRipplePattern']): number {
  const map: Record<WebGLEffects['platformRipplePattern'], number> = {
    default: 0,
    concentric: 1,
    grid: 2,
    chaos: 3,
    helix: 4,
    calm: 5,
    arrow: 6,
  };
  return map[pattern];
}

/** 动态代码纹理 */
function useCodeTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0a0000';
    ctx.fillRect(0, 0, 128, 128);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#d4af37';
    const chars = '01アイウエオ{}[]<>;/=';
    for (let y = 0; y < 128; y += 12) {
      for (let x = 0; x < 128; x += 8) {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);
}

/** 裂纹纹理（surprised 时） */
function useCrackTexture(enabled: boolean) {
  return useMemo(() => {
    if (!enabled) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(32, 32);
      ctx.lineTo(32 + (Math.random() - 0.5) * 60, 32 + (Math.random() - 0.5) * 60);
      ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
  }, [enabled]);
}

function SceneAtmosphere() {
  const { effects } = useBitChan();
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#050000', effects.fogDensity);
  }, [scene]);

  useFrame(() => {
    scene.background = new THREE.Color(effects.backgroundColor);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = effects.fogDensity;
    }
  });

  return <ambientLight intensity={effects.ambientIntensity} />;
}

function DataSea() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { effects } = useBitChan();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaveAmp: { value: 0.1 },
      uWaveFreq: { value: 0.5 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const u = (meshRef.current.material as THREE.ShaderMaterial).uniforms;
    const t = clock.getElapsedTime();
    const scale = effects.timeFrozen ? 0 : effects.timeScale * effects.timeCompensation;
    u.uTime.value = t * scale;
    u.uWaveAmp.value = effects.groundWaveAmplitude;
    u.uWaveFreq.value = effects.groundWaveFrequency;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[100, 100, 80, 80]} />
      <shaderMaterial uniforms={uniforms} vertexShader={GROUND_VERT} fragmentShader={GROUND_FRAG} />
    </mesh>
  );
}

function ThronePlatform() {
  const topRef = useRef<THREE.Mesh>(null);
  const edgeRef = useRef<THREE.Mesh>(null);
  const { effects } = useBitChan();

  const topUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRipple: { value: 0.1 },
      uPattern: { value: 0 },
      uEdgeColor: { value: new THREE.Color('#ff2a2a') },
    }),
    [],
  );

  const edgeCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 2.65, 0, Math.sin(a) * 2.65));
    }
    return new THREE.CatmullRomCurve3(pts, true);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scale = effects.timeFrozen ? 0 : effects.timeScale * effects.timeCompensation;

    if (topRef.current) {
      const u = (topRef.current.material as THREE.ShaderMaterial).uniforms;
      u.uTime.value = t * scale;
      u.uRipple.value = effects.platformRippleIntensity;
      u.uPattern.value = patternToInt(effects.platformRipplePattern);
      u.uEdgeColor.value.set(effects.platformEdgeColor);
    }
    if (edgeRef.current) {
      edgeRef.current.rotation.y += 0.002 * scale;
      const mat = edgeRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(effects.platformEdgeColor);
      mat.opacity = 0.35 + effects.platformRippleIntensity * 0.5;
    }
  });

  return (
    <group position={[0, -2, 0]}>
      <mesh>
        <cylinderGeometry args={[2.5, 2.8, 0.15, 6]} />
        <meshPhysicalMaterial color="#0a0000" metalness={0.95} roughness={0.2} />
      </mesh>
      <mesh ref={topRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <circleGeometry args={[2.5, 48]} />
        <shaderMaterial
          uniforms={topUniforms}
          vertexShader={PLATFORM_VERT}
          fragmentShader={PLATFORM_FRAG}
        />
      </mesh>
      <mesh ref={edgeRef}>
        <tubeGeometry args={[edgeCurve, 64, 0.04, 8, true]} />
        <meshBasicMaterial color="#ff2a2a" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function MemoryFragmentMesh({
  frag,
  codeTex,
  crackTex,
}: {
  frag: (typeof FRAGMENTS)[number];
  codeTex: THREE.CanvasTexture;
  crackTex: THREE.CanvasTexture | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const { effects, activateFragment } = useBitChan();
  const pushRef = useRef(0);
  const scaleRef = useRef(1);
  const jitterRef = useRef({ x: 0, y: 0, z: 0 });

  const isActive = effects.activatedFragmentId === frag.id;
  const isHighlight = effects.fragmentHighlightId === frag.id;
  const flashRef = useRef(0);

  useEffect(() => {
    if (isActive) flashRef.current = 0.3;
  }, [isActive]);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const scale = effects.timeFrozen ? 0 : effects.timeScale * effects.timeCompensation;

    if (frag.kind === 'error') {
      jitterRef.current.x = (Math.random() - 0.5) * 0.04;
      jitterRef.current.y = (Math.random() - 0.5) * 0.04;
      jitterRef.current.z = (Math.random() - 0.5) * 0.04;
      g.position.set(
        frag.position[0] + jitterRef.current.x,
        frag.position[1] + jitterRef.current.y,
        frag.position[2] + jitterRef.current.z,
      );
    } else {
      g.position.set(...frag.position);
    }

    const targetScale = isActive ? 1.5 : 1;
    scaleRef.current += (targetScale - scaleRef.current) * 0.08;
    g.scale.setScalar(scaleRef.current);

    g.rotation.y += 0.008 * effects.fragmentSpeedMult * scale;
    g.rotation.x += 0.004 * effects.fragmentSpeedMult * scale;

    if (frag.kind === 'birth' && innerRef.current) {
      const pulse = 1 + Math.sin(t * 2) * 0.08;
      innerRef.current.scale.setScalar(pulse);
    }

    if (frag.kind === 'connect' && ringRef.current) {
      ringRef.current.rotation.y -= 0.02 * scale;
      ringRef.current.rotation.x = Math.sin(t) * 0.2;
    }

    if (frag.kind === 'future' && particlesRef.current) {
      const attr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        attr.setY(i, attr.getY(i) + 0.02 * scale);
        if (attr.getY(i) > 2) attr.setY(i, 0);
      }
      attr.needsUpdate = true;
    }

    if (effects.fragmentPush > 0 && frag.id === effects.shockwaveTarget) {
      pushRef.current = effects.fragmentPush;
    }
    pushRef.current *= 0.92;
    if (pushRef.current > 0.01) {
      const dir = g.position.clone().normalize();
      g.position.add(dir.multiplyScalar(pushRef.current * 0.05));
    }

    if (innerRef.current) {
      const mat = innerRef.current.material as THREE.MeshPhysicalMaterial;
      if (flashRef.current > 0) {
        mat.emissive.set('#ffffff');
        mat.emissiveIntensity = 2;
        flashRef.current -= 0.016;
      } else {
        mat.emissive.set(frag.color);
        mat.emissiveIntensity = isHighlight ? 3 : isActive ? 1.8 : frag.kind === 'wait' ? 0.05 : 0.6;
      }
      mat.color.set(frag.color);
      if (crackTex && effects.fragmentCrack) {
        mat.map = crackTex;
      } else if (frag.kind === 'learn') {
        mat.map = codeTex;
      } else {
        mat.map = null;
      }
    }
  });

  const futureParticles = useMemo(() => {
    const arr = new Float32Array(30);
    for (let i = 0; i < 10; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.3;
      arr[i * 3 + 1] = Math.random() * 1.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    return arr;
  }, []);

  const geometry = useMemo(() => {
    switch (frag.kind) {
      case 'birth':
        return <icosahedronGeometry args={[1.2, 0]} />;
      case 'learn':
        return <octahedronGeometry args={[0.8, 0]} />;
      case 'error':
        return <torusKnotGeometry args={[0.6, 0.2, 64, 8]} />;
      case 'connect':
        return <torusGeometry args={[0.7, 0.15, 16, 32]} />;
      case 'wait':
        return <sphereGeometry args={[0.5, 16, 16]} />;
      case 'future':
        return <coneGeometry args={[0.4, 1, 8]} />;
    }
  }, [frag.kind]);

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        activateFragment(frag.id);
      }}
    >
      <mesh ref={innerRef}>{geometry}</mesh>
      {frag.kind === 'connect' && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.95, 0.06, 8, 24]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.5} />
        </mesh>
      )}
      {frag.kind === 'future' && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[futureParticles, 3]} />
          </bufferGeometry>
          <pointsMaterial color="#ff006e" size={0.06} transparent opacity={0.8} />
        </points>
      )}
      {effects.showFragmentLabel === frag.id && (
        <Text position={[0, 1.4, 0]} fontSize={0.35} color="#ffffff" anchorX="center" anchorY="middle">
          {frag.name}
        </Text>
      )}
    </group>
  );
}

function MemoryFragments({
  codeTex,
  crackTex,
}: {
  codeTex: THREE.CanvasTexture;
  crackTex: THREE.CanvasTexture | null;
}) {
  return (
    <>
      {FRAGMENTS.map((f) => (
        <MemoryFragmentMesh key={f.id} frag={f} codeTex={codeTex} crackTex={crackTex} />
      ))}
    </>
  );
}

function NeuralLinks() {
  const { effects } = useBitChan();
  const linesRef = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);

  useFrame(() => {
    if (!linesRef.current || effects.neuralLinks.length === 0) {
      if (linesRef.current) linesRef.current.visible = false;
      return;
    }
    linesRef.current.visible = true;
    const verts: number[] = [];
    effects.neuralLinks.forEach((link) => {
      const from = FRAGMENTS.find((f) => f.id === link.from);
      const to = FRAGMENTS.find((f) => f.id === link.to);
      if (from && to) {
        verts.push(...from.position, ...to.position);
      }
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  });

  if (effects.neuralLinks.length === 0) return null;

  return (
    <lineSegments ref={linesRef} geometry={geo}>
      <lineBasicMaterial color="#ff2a2a" transparent opacity={0.6} />
    </lineSegments>
  );
}

function InfoStream() {
  const pointsRef = useRef<THREE.Points>(null);
  const { effects } = useBitChan();
  const count = 500;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = -5 + Math.random() * 20;
      pos[i * 3 + 2] = -20 - Math.random() * 30;
      vel[i * 3] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 2] = 0.04 + Math.random() * 0.04;
    }
    return { positions: pos, velocities: vel };
  }, []);

  const posRef = useRef(positions.slice());
  const velRef = useRef(velocities.slice());

  useFrame(({ clock, camera }) => {
    const pts = pointsRef.current;
    if (!pts || effects.timeFrozen) return;

    const attr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posRef.current;
    const vels = velRef.current;
    const speed = effects.particleSpeed * effects.timeScale * effects.timeCompensation;
    const mode = effects.particleMode;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let vx = vels[idx];
      let vy = vels[idx + 1];
      let vz = vels[idx + 2];

      if (mode === 'up') vy = 0.06 * speed;
      else if (mode === 'explode') {
        vx = (arr[idx] - camera.position.x) * 0.002 * speed;
        vy = (arr[idx + 1] - camera.position.y) * 0.002 * speed;
        vz = (arr[idx + 2] - camera.position.z) * 0.002 * speed;
      } else if (mode === 'still') {
        vx *= 0.1;
        vy = 0.001;
        vz *= 0.1;
      } else if (mode === 'gather' || mode === 'attract') {
        const target = FRAGMENTS.find((f) => f.id === (effects.fragmentHighlightId ?? 'learn'));
        if (target) {
          vx += (target.position[0] - arr[idx]) * 0.001 * speed;
          vy += (target.position[1] - arr[idx + 1]) * 0.001 * speed;
          vz += (target.position[2] - arr[idx + 2]) * 0.001 * speed;
        }
      } else if (mode === 'stream') {
        vx = 0.04 * speed;
        vy = Math.sin(clock.getElapsedTime() + i) * 0.005;
        vz = 0.01;
      } else {
        vx = vels[idx] * speed;
        vy = vels[idx + 1] * speed + Math.sin(clock.getElapsedTime() * 0.5 + i) * 0.002;
        vz = vels[idx + 2] * speed;
      }

      arr[idx] += vx;
      arr[idx + 1] += vy;
      arr[idx + 2] += vz;

      if (arr[idx + 2] > camera.position.z + 5) {
        arr[idx] = (Math.random() - 0.5) * 40;
        arr[idx + 1] = -5 + Math.random() * 15;
        arr[idx + 2] = -25 - Math.random() * 20;
      }
      attr.setXYZ(i, arr[idx], arr[idx + 1], arr[idx + 2]);
    }
    attr.needsUpdate = true;
  });

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posRef.current, 3));
    return g;
  }, []);

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial color="#ff2a2a" size={0.04} transparent opacity={0.65} sizeAttenuation />
    </points>
  );
}

function BoundaryLasers() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const { effects } = useBitChan();

  const corners: [number, number, number][] = [
    [-12, 4, -12],
    [12, 4, -12],
    [-12, 4, 12],
    [12, 4, 12],
  ];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scale = effects.timeFrozen ? 0 : effects.timeScale * effects.timeCompensation;
    refs.current.forEach((group, i) => {
      if (!group) return;
      const speed = effects.laserChaos
        ? effects.laserScanSpeed * (1 + Math.sin(t + i) * 0.5)
        : effects.laserScanSpeed;
      group.rotation.y = t * speed * Math.PI * 2 + i * (Math.PI / 2);

      const beam = group.children[0] as THREE.Mesh;
      const mat = beam.material as THREE.MeshBasicMaterial;
      if (effects.laserFullBright) {
        mat.opacity = 0.9;
      } else {
        const scan = Math.sin(t * speed * Math.PI * 4 + i) * 0.5 + 0.5;
        mat.opacity = 0.05 + scan * 0.25;
      }
    });
  });

  return (
    <>
      {corners.map((pos, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} position={pos}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 20, 8]} />
            <meshBasicMaterial color="#ff2a2a" transparent opacity={0.1} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function GoldenFlashes() {
  const ref = useRef<THREE.PointLight>(null);
  const { effects } = useBitChan();
  const posRef = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    if (!ref.current || !effects.goldenFlashes) {
      if (ref.current) ref.current.intensity = 0;
      return;
    }
    if (Math.random() > 0.97) {
      posRef.current.set(
        (Math.random() - 0.5) * 20,
        2 + Math.random() * 6,
        (Math.random() - 0.5) * 20,
      );
      ref.current.intensity = 1.5;
    } else {
      ref.current.intensity *= 0.92;
    }
    ref.current.position.copy(posRef.current);
  });

  return <pointLight ref={ref} color="#ffd700" intensity={0} distance={8} />;
}

function EmotionShockwave() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { effects } = useBitChan();

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!effects.shockwaveActive) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const s = 1 + (1 - effects.shockwaveStrength) * 8;
    mesh.scale.setScalar(s);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.set(effects.shockwaveColor);
    mat.opacity = effects.shockwaveStrength * 0.4;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.85, 0]}>
      <ringGeometry args={[0.5, 0.8, 48]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

function CameraRig() {
  const { camera } = useThree();
  const { effects, mouse, mood } = useBitChan();
  const orbitAngle = useRef(0);
  const lastMouseMove = useRef(Date.now());
  const shakeOffset = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    camera.position.set(0, 3, 14);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 45;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  useFrame(() => {
    if (Math.abs(mouse.x) > 0.01 || Math.abs(mouse.y) > 0.01) {
      lastMouseMove.current = Date.now();
    }

    let focusPos: THREE.Vector3 | null = null;
    if (effects.cameraFocusFragment) {
      const frag = FRAGMENTS.find((f) => f.id === effects.cameraFocusFragment);
      if (frag) focusPos = new THREE.Vector3(...frag.position);
    }

    if (focusPos) {
      target.current.lerp(focusPos, 0.02);
    } else {
      target.current.lerp(new THREE.Vector3(0, 0, 0), 0.04);
    }

    const bias = effects.cameraPetBias;
    const targetX = mouse.x * 0.5 + bias.x;
    const targetY = 3 + mouse.y * 0.3 + bias.y;

    if (effects.cameraShake > 0.01) {
      shakeOffset.current.set(
        (Math.random() - 0.5) * effects.cameraShake,
        (Math.random() - 0.5) * effects.cameraShake,
        (Math.random() - 0.5) * effects.cameraShake * 0.5,
      );
    } else {
      shakeOffset.current.multiplyScalar(0.85);
    }

    camera.position.x += (targetX - camera.position.x) * 0.04;
    camera.position.y += (targetY - camera.position.y) * 0.04;
    camera.position.add(shakeOffset.current);

    const idleMs = Date.now() - lastMouseMove.current;
    if (idleMs > 5000 && mood !== 'curious') {
      orbitAngle.current += 0.0003 * effects.driftSpeedMult;
      camera.position.x += Math.sin(orbitAngle.current) * 0.002;
      camera.position.z = 14 + Math.cos(orbitAngle.current) * 0.5;
    }

    camera.lookAt(target.current);
  });

  return null;
}

function WebGLScene() {
  const codeTex = useCodeTexture();
  const { effects } = useBitChan();
  const crackTex = useCrackTexture(effects.fragmentCrack);

  return (
    <>
      <SceneAtmosphere />
      <CameraRig />
      <DataSea />
      <ThronePlatform />
      <MemoryFragments codeTex={codeTex} crackTex={crackTex} />
      <NeuralLinks />
      <InfoStream />
      <BoundaryLasers />
      <GoldenFlashes />
      <EmotionShockwave />
      <pointLight position={[0, 5, 0]} color="#ff2a2a" intensity={0.4} distance={25} />
    </>
  );
}

/** Bit-chan 梦境记忆空间 — WebGL 背景层 */
export default function WebGLBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 3, 14], fov: 45, near: 0.1, far: 200 }}
      >
        <WebGLScene />
      </Canvas>
    </div>
  );
}

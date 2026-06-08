import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysicsWorld, GROUND_HALF_EXTENT, type PhysicsWorldBundle } from '@/physics/createPhysicsWorld';
import { getPerformancePreset, detectPerformanceTier } from '@/utils/performanceTier';
import { FirstPersonController } from '@/physics/firstPersonController';
import { CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS, CAMERA_BASE_FOV, FIXED_TIMESTEP } from '@/physics/rapier-config';
import ExploreGroundReflection from '@/components/canvas/ExploreGroundReflection';
import ExploreSceneLighting from '@/components/canvas/ExploreSceneLighting';
import ExploreToneMapping from '@/components/canvas/ExploreToneMapping';
import ExploreCyberCity from '@/components/canvas/ExploreCyberCity';
import ExploreWorldAtmosphere from '@/components/canvas/ExploreWorldAtmosphere';
import ExplorePostEffects from '@/components/canvas/ExplorePostEffects';
import ExploreRebeccaHologram from '@/components/canvas/ExploreRebeccaHologram';
import ExploreIntroCamera, {
  EXPLORE_INTRO_CAMERA_FOV,
  EXPLORE_INTRO_CAMERA_START,
} from '@/components/canvas/ExploreIntroCamera';

function PlayerDebugMesh({ bundleRef }: { bundleRef: React.RefObject<PhysicsWorldBundle | null> }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const body = bundleRef.current?.playerBody;
    const mesh = meshRef.current;
    if (!body || !mesh) return;
    const t = body.translation();
    mesh.position.set(t.x, t.y, t.z);
  });

  return (
    <mesh ref={meshRef} visible={false}>
      <capsuleGeometry args={[CAPSULE_RADIUS, CAPSULE_HALF_HEIGHT * 2, 8, 16]} />
      <meshBasicMaterial color="#ff5357" wireframe transparent opacity={0.35} />
    </mesh>
  );
}

function PhysicsLoop({
  bundleRef,
  controllerRef,
  interactive,
  introActiveRef,
}: {
  bundleRef: React.RefObject<PhysicsWorldBundle | null>;
  controllerRef: React.RefObject<FirstPersonController | null>;
  interactive: boolean;
  introActiveRef: React.RefObject<boolean>;
}) {
  const { camera, gl } = useThree();
  const accumulatorRef = useRef(0);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (!bundleRef.current) return;
    camera.near = 0.1;
    camera.far = 500;
    camera.fov = CAMERA_BASE_FOV;
    camera.updateProjectionMatrix();

    const controller = new FirstPersonController({
      domElement: gl.domElement,
      bundle: bundleRef.current,
      inputEnabled: interactive,
    });
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [camera, gl.domElement, bundleRef, controllerRef]);

  useEffect(() => {
    controllerRef.current?.setInputEnabled(interactive);
  }, [interactive, controllerRef]);

  useFrame((_, delta) => {
    const controller = controllerRef.current;
    const bundle = bundleRef.current;
    if (!controller || !bundle || !(camera instanceof THREE.PerspectiveCamera)) return;
    if (introActiveRef.current) return;

    accumulatorRef.current += Math.min(delta, 0.1);
    while (accumulatorRef.current >= FIXED_TIMESTEP) {
      controller.fixedUpdate();
      accumulatorRef.current -= FIXED_TIMESTEP;
    }

    const physicsAlpha =
      FIXED_TIMESTEP > 0 ? accumulatorRef.current / FIXED_TIMESTEP : 1;
    controller.syncCamera(camera, delta, physicsAlpha);
  });

  return null;
}

function SceneContent({
  bundleRef,
  controllerRef,
  interactive,
  physicsReady,
  introActive,
  onIntroComplete,
}: {
  bundleRef: React.RefObject<PhysicsWorldBundle | null>;
  controllerRef: React.RefObject<FirstPersonController | null>;
  interactive: boolean;
  physicsReady: boolean;
  introActive: boolean;
  onIntroComplete: () => void;
}) {
  const introActiveRef = useRef(introActive);
  introActiveRef.current = introActive;

  return (
    <>
      <ExploreWorldAtmosphere />
      <ExploreSceneLighting />
      <ExploreToneMapping />
      <ExploreCyberCity />
      <Suspense fallback={null}>
        <ExploreRebeccaHologram />
      </Suspense>
      {physicsReady && bundleRef.current && (
        <ExploreGroundReflection bundleRef={bundleRef} />
      )}
      <ExplorePostEffects />
      {physicsReady && bundleRef.current && (
        <>
          <PlayerDebugMesh bundleRef={bundleRef} />
          <PhysicsLoop
            bundleRef={bundleRef}
            controllerRef={controllerRef}
            interactive={interactive}
            introActiveRef={introActiveRef}
          />
        </>
      )}
      {introActive && (
        <ExploreIntroCamera
          active={introActive}
          onComplete={onIntroComplete}
          controllerRef={controllerRef}
          introActiveRef={introActiveRef}
        />
      )}
    </>
  );
}

function FirstPersonCanvas({
  bundleRef,
  controllerRef,
  interactive,
  physicsReady,
  introActive,
  onIntroComplete,
}: {
  bundleRef: React.RefObject<PhysicsWorldBundle | null>;
  controllerRef: React.RefObject<FirstPersonController | null>;
  interactive: boolean;
  physicsReady: boolean;
  introActive: boolean;
  onIntroComplete: () => void;
}) {
  const dprMax = useMemo(() => getPerformancePreset(detectPerformanceTier()).dprMax, []);

  return (
    <Canvas
      className="h-full w-full"
      dpr={[1, dprMax]}
      camera={{
        position: [EXPLORE_INTRO_CAMERA_START.x, EXPLORE_INTRO_CAMERA_START.y, EXPLORE_INTRO_CAMERA_START.z],
        fov: EXPLORE_INTRO_CAMERA_FOV,
        near: 0.1,
        far: 500,
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
    >
      <SceneContent
        bundleRef={bundleRef}
        controllerRef={controllerRef}
        interactive={interactive}
        physicsReady={physicsReady}
        introActive={introActive}
        onIntroComplete={onIntroComplete}
      />
    </Canvas>
  );
}

let rapierInitPromise: Promise<void> | null = null;

function ensureRapierInit(): Promise<void> {
  if (!rapierInitPromise) {
    rapierInitPromise = RAPIER.init();
  }
  return rapierInitPromise;
}

export default function FirstPersonScene({
  interactive = true,
  introActive = false,
  onIntroComplete,
}: {
  interactive?: boolean;
  introActive?: boolean;
  onIntroComplete?: () => void;
}) {
  const bundleRef = useRef<PhysicsWorldBundle | null>(null);
  const controllerRef = useRef<FirstPersonController | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureRapierInit();
        if (cancelled) return;
        bundleRef.current = createPhysicsWorld();
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Rapier 初始化失败');
        }
      }
    })();

    return () => {
      cancelled = true;
      controllerRef.current?.dispose();
      controllerRef.current = null;
      if (bundleRef.current) {
        bundleRef.current.world.free();
        bundleRef.current = null;
      }
    };
  }, []);

  const handleIntroComplete = useCallback(() => {
    onIntroComplete?.();
  }, [onIntroComplete]);

  if (error) {
    return (
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-[#0e0a0a] text-[#ff5357] font-mono text-sm">
        {error}
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[5] ${
        interactive ? 'cursor-grab active:cursor-grabbing touch-none select-none' : 'pointer-events-none'
      }`}
    >
      <FirstPersonCanvas
        bundleRef={bundleRef}
        controllerRef={controllerRef}
        interactive={interactive}
        physicsReady={ready}
        introActive={introActive}
        onIntroComplete={handleIntroComplete}
      />
    </div>
  );
}

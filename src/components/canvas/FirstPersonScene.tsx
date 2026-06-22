import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysicsWorld, GROUND_HALF_EXTENT, type PhysicsWorldBundle } from '@/physics/createPhysicsWorld';
import { getPerformancePreset, detectPerformanceTier } from '@/utils/performanceTier';
import { FirstPersonController } from '@/physics/firstPersonController';
import { CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS, CAMERA_BASE_FOV, FIXED_TIMESTEP } from '@/physics/rapier-config';
import ExploreSceneLighting from '@/components/canvas/ExploreSceneLighting';
import ExploreToneMapping from '@/components/canvas/ExploreToneMapping';
import ExploreWorldAtmosphere from '@/components/canvas/ExploreWorldAtmosphere';
import WorldVoidBase from '@/components/canvas/WorldVoidBase';
import type { ActivePage } from '@/lib/types';
import ExploreIntroCamera, {
  EXPLORE_INTRO_CAMERA_FOV,
  EXPLORE_INTRO_CAMERA_START,
  EXPLORE_INTRO_END_ORIENT,
} from '@/components/canvas/ExploreIntroCamera';
import type { ObakeAvatarController } from '@/components/canvas/obake-avatar/ObakeAvatarController';
import WorldScene from '@/world/WorldScene';
import CitySystem from '@/world/systems/CitySystem';
import CharacterSystem from '@/world/systems/CharacterSystem';
import HologramSystem from '@/world/systems/HologramSystem';
import NavigationSystem from '@/world/systems/NavigationSystem';
import NeonSystem from '@/world/systems/NeonSystem';
import PagePanelSystem from '@/world/systems/PagePanelSystem';
import PostFXSystem from '@/world/systems/PostFXSystem';
import { getWorldFeatureFlags } from '@/lib/world-feature-flags';
import { useRenderBudget } from '@/world/RenderBudgetSystem';

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
  obakeAvatarControllerRef,
  interactive,
  introActiveRef,
  exploreEntryActiveRef,
  activeSection,
  physicsAlphaRef,
}: {
  bundleRef: React.RefObject<PhysicsWorldBundle | null>;
  controllerRef: React.RefObject<FirstPersonController | null>;
  obakeAvatarControllerRef: React.RefObject<ObakeAvatarController | null>;
  interactive: boolean;
  introActiveRef: React.RefObject<boolean>;
  exploreEntryActiveRef: React.RefObject<boolean>;
  activeSection: ActivePage;
  physicsAlphaRef: React.RefObject<number>;
}) {
  const { camera, gl } = useThree();
  const accumulatorRef = useRef(0);
  const initialActiveSectionRef = useRef(activeSection);

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
    if (
      initialActiveSectionRef.current === 'EXPLORE' &&
      !introActiveRef.current &&
      !controller.isExploreStateReady()
    ) {
      controller.commitIntroHandoff(EXPLORE_INTRO_END_ORIENT.yaw, EXPLORE_INTRO_END_ORIENT.pitch);
    }
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [camera, gl.domElement, bundleRef, controllerRef, introActiveRef]);

  useEffect(() => {
    controllerRef.current?.setInputEnabled(interactive);
  }, [interactive, controllerRef]);

  // Priority > drei Html (0) so syncCamera runs before DOM matrix3d projection in EXPLORE FPS.
  useFrame((_, delta) => {
    const controller = controllerRef.current;
    const bundle = bundleRef.current;
    if (!controller || !bundle || !(camera instanceof THREE.PerspectiveCamera)) return;
    if (introActiveRef.current || exploreEntryActiveRef.current) return;
    if (!interactive) return;

    accumulatorRef.current += Math.min(delta, 0.1);
    while (accumulatorRef.current >= FIXED_TIMESTEP) {
      controller.fixedUpdate();
      accumulatorRef.current -= FIXED_TIMESTEP;
    }

    const physicsAlpha =
      FIXED_TIMESTEP > 0 ? accumulatorRef.current / FIXED_TIMESTEP : 1;
    physicsAlphaRef.current = physicsAlpha;
    controller.syncCamera(camera, delta, physicsAlpha);

    const obake = obakeAvatarControllerRef.current;
    if (obake?.isReady()) {
      const showObake =
        interactive && !introActiveRef.current && !exploreEntryActiveRef.current;
      obake.setVisible(showObake);
      if (showObake) {
        obake.update(delta, controller, physicsAlpha);
      }
    }
  }, 10);

  return null;
}

function MotionDprRegressor() {
  const { camera, performance } = useThree();
  const lastPositionRef = useRef(new THREE.Vector3());
  const lastQuaternionRef = useRef(new THREE.Quaternion());
  const initializedRef = useRef(false);

  useFrame(() => {
    if (!initializedRef.current) {
      lastPositionRef.current.copy(camera.position);
      lastQuaternionRef.current.copy(camera.quaternion);
      initializedRef.current = true;
      return;
    }

    const positionDeltaSq = lastPositionRef.current.distanceToSquared(camera.position);
    const rotationDelta = 1 - Math.abs(lastQuaternionRef.current.dot(camera.quaternion));
    if (positionDeltaSq > 0.00002 || rotationDelta > 0.000002) {
      performance.regress();
      lastPositionRef.current.copy(camera.position);
      lastQuaternionRef.current.copy(camera.quaternion);
    }
  });

  return null;
}

function isWorldAuditEnabled() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('worldAudit') === '1';
}

function WorldAuditProbe({ activeSection }: { activeSection: ActivePage }) {
  const enabled = useMemo(() => isWorldAuditEnabled(), []);
  const { scene, camera, gl } = useThree();
  const budget = useRenderBudget();
  const nextLogAtRef = useRef(0);
  const lastErrorAtRef = useRef(0);

  useFrame(({ clock }) => {
    if (!enabled || clock.elapsedTime < nextLogAtRef.current) return;
    nextLogAtRef.current = clock.elapsedTime + 2;

    const counts = {
      sceneChildren: scene.children.length,
      objects: 0,
      meshes: 0,
      visibleMeshes: 0,
      invisibleMeshes: 0,
      instancedMeshes: 0,
      zeroOpacityMaterials: 0,
      htmlAnchors: 0,
      named: [] as string[],
    };
    const badObjects: string[] = [];

    scene.traverse((object) => {
      counts.objects += 1;
      if (object.name) counts.named.push(object.name);
      if (object.type === 'Group' && object.name.includes('Html')) counts.htmlAnchors += 1;
      if ((object as THREE.Mesh).isMesh) {
        counts.meshes += 1;
        if (object.visible) counts.visibleMeshes += 1;
        else counts.invisibleMeshes += 1;
        const mesh = object as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        if (materials.some((mat) => mat && 'opacity' in mat && (mat.opacity as number) <= 0.001)) {
          counts.zeroOpacityMaterials += 1;
        }
      }
      if ((object as THREE.InstancedMesh).isInstancedMesh) counts.instancedMeshes += 1;
      const p = object.position;
      const s = object.scale;
      if (
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        !Number.isFinite(p.z) ||
        !Number.isFinite(s.x) ||
        !Number.isFinite(s.y) ||
        !Number.isFinite(s.z)
      ) {
        badObjects.push(object.name || object.type);
      }
    });

    const clearColor = gl.getClearColor(new THREE.Color());
    const fog =
      scene.fog instanceof THREE.FogExp2
        ? { type: 'FogExp2', color: `#${scene.fog.color.getHexString()}`, density: scene.fog.density }
        : scene.fog instanceof THREE.Fog
          ? { type: 'Fog', color: `#${scene.fog.color.getHexString()}`, near: scene.fog.near, far: scene.fog.far }
          : null;
    const snapshot = {
      t: Number(clock.elapsedTime.toFixed(2)),
      activeSection,
      camera: {
        position: camera.position.toArray().map((v) => Number(v.toFixed(3))),
        rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z].map((v) => Number(v.toFixed(3))),
      },
      fog,
      background:
        scene.background instanceof THREE.Color ? `#${scene.background.getHexString()}` : scene.background?.type ?? null,
      clearColor: `#${clearColor.getHexString()}`,
      renderBudget: {
        movementPhase: budget.movementPhase,
        qualityPhase: budget.qualityPhase,
        bloomScale: Number(budget.bloomScale.toFixed(3)),
        glowScale: Number(budget.glowScale.toFixed(3)),
        farGlowEnabled: budget.farGlowEnabled,
        farAnimationEnabled: budget.farAnimationEnabled,
      },
      counts: {
        ...counts,
        named: counts.named.slice(0, 24),
      },
      badObjects,
    };

    const win = window as typeof window & { __worldAuditSnapshots?: unknown[] };
    win.__worldAuditSnapshots = [...(win.__worldAuditSnapshots ?? []), snapshot].slice(-20);
    console.info('[WorldAudit]', snapshot);

    if (badObjects.length > 0 && clock.elapsedTime - lastErrorAtRef.current > 2) {
      lastErrorAtRef.current = clock.elapsedTime;
      console.error('[WorldNaN]', badObjects);
    }
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
  activeSection,
}: {
  bundleRef: React.RefObject<PhysicsWorldBundle | null>;
  controllerRef: React.RefObject<FirstPersonController | null>;
  interactive: boolean;
  physicsReady: boolean;
  introActive: boolean;
  onIntroComplete: () => void;
  activeSection: ActivePage;
}) {
  const introActiveRef = useRef(introActive);
  introActiveRef.current = introActive;
  const exploreEntryActiveRef = useRef(false);
  const physicsAlphaRef = useRef(1);
  const obakeAvatarControllerRef = useRef<ObakeAvatarController | null>(null);

  const worldFlags = getWorldFeatureFlags();

  return (
    <>
      <WorldScene activeSection={activeSection} interactive={interactive}>
        <ExploreWorldAtmosphere />
        <ExploreSceneLighting />
        <WorldVoidBase />
        <ExploreToneMapping />
        <AdaptiveDpr pixelated={false} />
        <MotionDprRegressor />
        <WorldAuditProbe activeSection={activeSection} />
        <NavigationSystem
          activeSection={activeSection}
          introActive={introActive}
          controllerRef={controllerRef}
          exploreEntryActiveRef={exploreEntryActiveRef}
        />
        <CitySystem />
        {worldFlags.useNewNeonSystem && <NeonSystem />}
        <PagePanelSystem activeSection={activeSection} />
        <HologramSystem />
        <PostFXSystem />
        {physicsReady && bundleRef.current && (
          <>
            <PlayerDebugMesh bundleRef={bundleRef} />
            <PhysicsLoop
              bundleRef={bundleRef}
              controllerRef={controllerRef}
              obakeAvatarControllerRef={obakeAvatarControllerRef}
              interactive={interactive}
              introActiveRef={introActiveRef}
              exploreEntryActiveRef={exploreEntryActiveRef}
              activeSection={activeSection}
              physicsAlphaRef={physicsAlphaRef}
            />
            <CharacterSystem avatarControllerRef={obakeAvatarControllerRef} />
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
      </WorldScene>
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
  activeSection,
}: {
  bundleRef: React.RefObject<PhysicsWorldBundle | null>;
  controllerRef: React.RefObject<FirstPersonController | null>;
  interactive: boolean;
  physicsReady: boolean;
  introActive: boolean;
  onIntroComplete: () => void;
  activeSection: ActivePage;
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
      performance={{ min: 0.72, max: 1, debounce: 360 }}
    >
      <SceneContent
        bundleRef={bundleRef}
        controllerRef={controllerRef}
        interactive={interactive}
        physicsReady={physicsReady}
        introActive={introActive}
        onIntroComplete={onIntroComplete}
        activeSection={activeSection}
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
  activeSection = 'EXPLORE',
}: {
  interactive?: boolean;
  introActive?: boolean;
  onIntroComplete?: () => void;
  activeSection?: ActivePage;
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
  const canvasPointerEnabled = interactive || activeSection === 'WORKS';

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
        canvasPointerEnabled
          ? `${interactive ? 'cursor-grab active:cursor-grabbing touch-none' : ''} select-none`
          : 'pointer-events-none'
      }`}
    >
      <FirstPersonCanvas
        bundleRef={bundleRef}
        controllerRef={controllerRef}
        interactive={interactive}
        physicsReady={ready}
        introActive={introActive}
        onIntroComplete={handleIntroComplete}
        activeSection={activeSection}
      />
    </div>
  );
}

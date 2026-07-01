import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysicsWorld, GROUND_HALF_EXTENT, type PhysicsWorldBundle } from '@/physics/createPhysicsWorld';
import { getPerformancePreset, detectPerformanceTier } from '@/utils/performanceTier';
import { FirstPersonController } from '@/physics/firstPersonController';
import { CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS, FIXED_TIMESTEP } from '@/physics/rapier-config';
import ExploreSceneLighting from '@/components/canvas/ExploreSceneLighting';
import ExploreToneMapping from '@/components/canvas/ExploreToneMapping';
import ExploreWorldAtmosphere from '@/components/canvas/ExploreWorldAtmosphere';
import WorldVoidBase from '@/components/canvas/WorldVoidBase';
import type { ActivePage } from '@/lib/types';
import {
  EXPLORE_SPAWN_ORIENT,
  getExploreSpawnThirdPersonCamera,
} from '@/components/canvas/ExploreIntroCamera';
import { EXPLORE_ENTRY_TRANSITION } from '@/lib/section-camera-presets';
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
  exploreEntryActiveRef,
  activeSection,
  physicsAlphaRef,
}: {
  bundleRef: React.RefObject<PhysicsWorldBundle | null>;
  controllerRef: React.RefObject<FirstPersonController | null>;
  obakeAvatarControllerRef: React.RefObject<ObakeAvatarController | null>;
  interactive: boolean;
  exploreEntryActiveRef: React.RefObject<boolean>;
  activeSection: ActivePage;
  physicsAlphaRef: React.RefObject<number>;
}) {
  const { camera, gl } = useThree();
  const accumulatorRef = useRef(0);
  const initialActiveSectionRef = useRef(activeSection);
  const initialExploreEntryDoneRef = useRef(false);
  const spawnPrewarmDoneRef = useRef(false);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (!bundleRef.current) return;
    camera.near = 0.1;
    camera.far = 500;
    camera.fov = EXPLORE_ENTRY_TRANSITION.startFov;
    camera.updateProjectionMatrix();

    const controller = new FirstPersonController({
      domElement: gl.domElement,
      bundle: bundleRef.current,
      inputEnabled: false,
    });
    if (initialActiveSectionRef.current === 'EXPLORE') {
      controller.commitIntroHandoff(EXPLORE_SPAWN_ORIENT.yaw, EXPLORE_SPAWN_ORIENT.pitch);
      controller.settleSpawnPhysics();
    }
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
      initialExploreEntryDoneRef.current = false;
      spawnPrewarmDoneRef.current = false;
    };
  }, [camera, gl.domElement, bundleRef, controllerRef]);

  useLayoutEffect(() => {
    const controller = controllerRef.current;
    if (!interactive || !controller || !(camera instanceof THREE.PerspectiveCamera)) {
      return;
    }

    controller.settleSpawnPhysics(8);

    if (!initialExploreEntryDoneRef.current) {
      exploreEntryActiveRef.current = true;
      initialExploreEntryDoneRef.current = true;
    }
  }, [camera, controllerRef, exploreEntryActiveRef, interactive]);

  useEffect(() => {
    controllerRef.current?.setInputEnabled(interactive);
  }, [interactive, controllerRef]);

  // Priority > drei Html (0) so syncCamera runs before DOM matrix3d projection in EXPLORE FPS.
  useFrame((_, delta) => {
    const controller = controllerRef.current;
    const bundle = bundleRef.current;
    const obake = obakeAvatarControllerRef.current;
    if (!controller || !bundle || !(camera instanceof THREE.PerspectiveCamera)) return;

    const entryActive = exploreEntryActiveRef.current;
    const poseReady = obake?.isReady() && controller.isExploreStateReady();

    const prewarmHiddenSpawnPose = () => {
      if (!poseReady) return;
      if (!spawnPrewarmDoneRef.current) {
        controller.settleSpawnPhysics(12);
        spawnPrewarmDoneRef.current = true;
      }
      obake!.setVisible(false);
      obake!.prepareSpawnPose(controller);
    };

    const showSpawnPose = () => {
      if (!poseReady) return;
      obake!.setVisible(true);
      obake!.update(delta, controller, 1);
    };

    // 黑屏加载期：在幕布后预置落地位姿与朝向
    if (!interactive) {
      prewarmHiddenSpawnPose();
      return;
    }

    // 视野拉伸过渡：角色已在加载期就位，随镜头一起出现
    if (entryActive) {
      showSpawnPose();
      return;
    }

    accumulatorRef.current += Math.min(delta, 0.1);
    while (accumulatorRef.current >= FIXED_TIMESTEP) {
      controller.fixedUpdate();
      accumulatorRef.current -= FIXED_TIMESTEP;
    }

    const physicsAlpha =
      FIXED_TIMESTEP > 0 ? accumulatorRef.current / FIXED_TIMESTEP : 1;
    physicsAlphaRef.current = physicsAlpha;
    controller.syncCamera(camera, delta, physicsAlpha);

    if (poseReady) {
      obake!.setVisible(true);
      obake!.update(delta, controller, physicsAlpha);
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
  activeSection,
}: {
  bundleRef: React.RefObject<PhysicsWorldBundle | null>;
  controllerRef: React.RefObject<FirstPersonController | null>;
  interactive: boolean;
  physicsReady: boolean;
  activeSection: ActivePage;
}) {
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
              exploreEntryActiveRef={exploreEntryActiveRef}
              activeSection={activeSection}
              physicsAlphaRef={physicsAlphaRef}
            />
            <CharacterSystem avatarControllerRef={obakeAvatarControllerRef} />
          </>
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
  activeSection,
}: {
  bundleRef: React.RefObject<PhysicsWorldBundle | null>;
  controllerRef: React.RefObject<FirstPersonController | null>;
  interactive: boolean;
  physicsReady: boolean;
  activeSection: ActivePage;
}) {
  const dprMax = useMemo(() => getPerformancePreset(detectPerformanceTier()).dprMax, []);
  const spawnCamera = useMemo(() => getExploreSpawnThirdPersonCamera(), []);

  return (
    <Canvas
      className="h-full w-full"
      dpr={[1, dprMax]}
      camera={{
        position: spawnCamera.position.toArray(),
        fov: spawnCamera.fov,
        near: 0.1,
        far: 500,
      }}
      onCreated={({ camera }) => {
        if (!(camera instanceof THREE.PerspectiveCamera)) return;
        camera.position.copy(spawnCamera.position);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = spawnCamera.yaw;
        camera.rotation.x = spawnCamera.cameraPitch;
        camera.updateProjectionMatrix();
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
  activeSection = 'EXPLORE',
}: {
  interactive?: boolean;
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
        activeSection={activeSection}
      />
    </div>
  );
}

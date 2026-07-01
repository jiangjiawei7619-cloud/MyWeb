import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ActivePage } from '@/lib/types';
import type { FirstPersonController } from '@/physics/firstPersonController';
import { CAMERA_BASE_FOV } from '@/physics/rapier-config';
import {
  SECTION_CAMERA_PRESETS,
  SECTION_CAMERA_TRANSITION,
  WORKS_CAMERA_SWAY,
  WORKS_FOV_ENTRY,
  EXPLORE_ENTRY_TRANSITION,
  easeInOutCubic,
  easeOutCubic,
} from '@/lib/section-camera-presets';
import {
  lookTargetFromYawPitch,
  yawPitchFromLookAt,
} from '@/components/canvas/ExploreIntroCamera';

type SectionCameraRigProps = {
  activeSection: ActivePage;
  controllerRef?: RefObject<FirstPersonController | null>;
  exploreEntryActiveRef?: RefObject<boolean>;
};

type CameraTransition = {
  active: boolean;
  section: ActivePage;
  startTime: number;
  startPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  startFov: number;
  endPosition: THREE.Vector3;
  endTarget: THREE.Vector3;
  endFov: number;
};

type FovTransition = {
  active: boolean;
  startTime: number;
  startFov: number;
  endFov: number;
};

type ExploreEntryTransition = {
  active: boolean;
  startTime: number;
  startPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endPosition: THREE.Vector3;
  endTarget: THREE.Vector3;
  endYaw: number;
  endPitch: number;
  endFov: number;
};

const _exploreEyeScratch = new THREE.Vector3();
const FREE_CAMERA_SECTIONS = new Set<ActivePage>(['LOGS', 'ABOUT']);

function resolveExploreEntryEndpoints(
  controller: FirstPersonController | null | undefined,
  outEndPosition: THREE.Vector3,
  outEndTarget: THREE.Vector3,
): { yaw: number; pitch: number; fov: number } {
  if (controller) {
    const { yaw, pitch, fov } = controller.getExploreViewState(_exploreEyeScratch);
    outEndPosition.copy(_exploreEyeScratch);
    lookTargetFromYawPitch(_exploreEyeScratch, yaw, pitch, 14, outEndTarget);
    return { yaw, pitch, fov };
  }

  const preset = SECTION_CAMERA_PRESETS.EXPLORE;
  outEndPosition.set(...preset.position);
  outEndTarget.set(...preset.target);
  return { ...yawPitchFromLookAt(outEndPosition, outEndTarget), fov: CAMERA_BASE_FOV };
}

function commitExploreFpsHandoff(
  camera: THREE.PerspectiveCamera,
  controller: FirstPersonController,
  yaw: number,
  cameraPitch: number,
  targetFov = CAMERA_BASE_FOV,
  hydrateStretch = false,
) {
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = cameraPitch;
  camera.rotation.z = 0;
  camera.fov = targetFov;
  camera.updateProjectionMatrix();
  controller.commitExploreCameraHandoff(yaw, cameraPitch, hydrateStretch);
  controller.settleSpawnPhysics(6);
  controller.syncCamera(camera, 0, 1);
}

export default function SectionCameraRig({
  activeSection,
  controllerRef,
  exploreEntryActiveRef,
}: SectionCameraRigProps) {
  const { camera } = useThree();
  const basePositionRef = useRef(new THREE.Vector3());
  const baseTargetRef = useRef(new THREE.Vector3());
  const currentTargetRef = useRef(new THREE.Vector3());
  const targetMouseRef = useRef(new THREE.Vector2());
  const smoothMouseRef = useRef(new THREE.Vector2());
  const lastPointerMoveRef = useRef(0);
  const lastSectionRef = useRef<ActivePage>(activeSection);
  const transitionRef = useRef<CameraTransition | null>(null);
  const fovTransitionRef = useRef<FovTransition | null>(null);
  const exploreEntryRef = useRef<ExploreEntryTransition | null>(null);

  const scratch = useMemo(
    () => ({
      startTarget: new THREE.Vector3(),
      idle: new THREE.Vector3(),
      mouseTarget: new THREE.Vector3(),
      finalPosition: new THREE.Vector3(),
      finalTarget: new THREE.Vector3(),
      orbitOffset: new THREE.Vector3(),
      spherical: new THREE.Spherical(),
      pivot: new THREE.Vector3(),
      zeroMouse: new THREE.Vector2(),
      lookDir: new THREE.Vector3(),
    }),
    [],
  );

  useLayoutEffect(() => {
    if (!exploreEntryActiveRef) return;
    // Block physics on the same frame we switch to EXPLORE (before useFrame starts the transition).
    if (activeSection === 'EXPLORE' && lastSectionRef.current !== 'EXPLORE') {
      exploreEntryActiveRef.current = true;
    }
  }, [activeSection, exploreEntryActiveRef]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (activeSection !== 'WORKS') return;
      lastPointerMoveRef.current = performance.now();
      targetMouseRef.current.set(
        (event.clientX / window.innerWidth - 0.5) * 2,
        (event.clientY / window.innerHeight - 0.5) * 2,
      );
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [activeSection]);

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    const perspCamera = camera instanceof THREE.PerspectiveCamera ? camera : null;

    if (activeSection === 'EXPLORE') {
      const enteredFromOther =
        lastSectionRef.current !== 'EXPLORE' && exploreEntryRef.current === null;
      const entryPending =
        Boolean(exploreEntryActiveRef?.current) && exploreEntryRef.current === null;

      if ((enteredFromOther || entryPending) && perspCamera) {
        const endPosition = new THREE.Vector3();
        const endTarget = new THREE.Vector3();
        const { yaw: endYaw, pitch: endPitch, fov: endFov } = resolveExploreEntryEndpoints(
          controllerRef?.current,
          endPosition,
          endTarget,
        );

        scratch.lookDir.copy(endTarget).sub(endPosition).normalize();
        const startPosition = endPosition
          .clone()
          .addScaledVector(scratch.lookDir, -EXPLORE_ENTRY_TRANSITION.pullBackDistance);

        exploreEntryRef.current = {
          active: true,
          startTime: now,
          startPosition,
          startTarget: endTarget.clone(),
          endPosition,
          endTarget,
          endYaw,
          endPitch,
          endFov,
        };
        if (exploreEntryActiveRef) exploreEntryActiveRef.current = true;
        lastSectionRef.current = 'EXPLORE';

        camera.position.copy(startPosition);
        camera.lookAt(endTarget);
        perspCamera.fov = EXPLORE_ENTRY_TRANSITION.startFov;
        perspCamera.updateProjectionMatrix();
      }

      const entry = exploreEntryRef.current;
      if (entry?.active && perspCamera) {
        const progress = THREE.MathUtils.clamp(
          (now - entry.startTime) / EXPLORE_ENTRY_TRANSITION.duration,
          0,
          1,
        );
        const eased = easeOutCubic(progress);

        scratch.finalPosition.copy(entry.startPosition).lerp(entry.endPosition, eased);
        scratch.finalTarget.copy(entry.endTarget);
        camera.position.copy(scratch.finalPosition);
        camera.lookAt(scratch.finalTarget);

        perspCamera.fov = THREE.MathUtils.lerp(
          EXPLORE_ENTRY_TRANSITION.startFov,
          entry.endFov,
          eased,
        );
        perspCamera.updateProjectionMatrix();

        if (progress >= 1) {
          entry.active = false;
          exploreEntryRef.current = null;
          if (exploreEntryActiveRef) exploreEntryActiveRef.current = false;

          const controller = controllerRef?.current;
          if (controller) {
            commitExploreFpsHandoff(
              perspCamera,
              controller,
              entry.endYaw,
              entry.endPitch,
              entry.endFov,
              true,
            );
          }
        }
        return;
      }

      if (exploreEntryActiveRef?.current) {
        exploreEntryActiveRef.current = false;
        const controller = controllerRef?.current;
        if (controller && perspCamera) {
          const endPosition = new THREE.Vector3();
          const endTarget = new THREE.Vector3();
          const { yaw, pitch, fov } = resolveExploreEntryEndpoints(
            controller,
            endPosition,
            endTarget,
          );
          commitExploreFpsHandoff(perspCamera, controller, yaw, pitch, fov, true);
        }
      }

      lastSectionRef.current = 'EXPLORE';
      transitionRef.current = null;
      fovTransitionRef.current = null;
      return;
    }

    exploreEntryRef.current = null;
    if (exploreEntryActiveRef) exploreEntryActiveRef.current = false;

    if (FREE_CAMERA_SECTIONS.has(activeSection)) {
      lastSectionRef.current = activeSection;
      transitionRef.current = null;
      fovTransitionRef.current = null;
      targetMouseRef.current.set(0, 0);
      smoothMouseRef.current.lerp(targetMouseRef.current, 1 - Math.exp(-delta * 4));
      return;
    }

    if (activeSection !== lastSectionRef.current || !transitionRef.current) {
      const preset = SECTION_CAMERA_PRESETS[activeSection];
      const endPosition = new THREE.Vector3(...preset.position);
      const endTarget = new THREE.Vector3(...preset.target);
      transitionRef.current = {
        active: false,
        section: activeSection,
        startTime: now,
        startPosition: endPosition.clone(),
        startTarget: endTarget.clone(),
        startFov: preset.fov,
        endPosition,
        endTarget,
        endFov: preset.fov,
      };
      basePositionRef.current.copy(endPosition);
      baseTargetRef.current.copy(endTarget);
      camera.position.copy(endPosition);
      camera.lookAt(endTarget);
      if (activeSection === 'WORKS') {
        fovTransitionRef.current = {
          active: true,
          startTime: now,
          startFov: WORKS_FOV_ENTRY.startFov,
          endFov: preset.fov,
        };
        if (perspCamera) {
          perspCamera.fov = WORKS_FOV_ENTRY.startFov;
          perspCamera.updateProjectionMatrix();
        }
        lastPointerMoveRef.current = 0;
        targetMouseRef.current.set(0, 0);
        smoothMouseRef.current.set(0, 0);
      } else {
        fovTransitionRef.current = null;
        if (perspCamera) {
          perspCamera.fov = preset.fov;
          perspCamera.updateProjectionMatrix();
        }
      }
      lastSectionRef.current = activeSection;
    }

    const transition = transitionRef.current;
    const progress = transition.active
      ? THREE.MathUtils.clamp(
          (now - transition.startTime) / SECTION_CAMERA_TRANSITION.duration,
          0,
          1,
        )
      : 1;
    const eased = easeInOutCubic(progress);

    basePositionRef.current.copy(transition.startPosition).lerp(transition.endPosition, eased);
    baseTargetRef.current.copy(transition.startTarget).lerp(transition.endTarget, eased);
    const baseFov = THREE.MathUtils.lerp(transition.startFov, transition.endFov, eased);

    if (progress >= 1 && transition.active) {
      transition.active = false;
      basePositionRef.current.copy(transition.endPosition);
      baseTargetRef.current.copy(transition.endTarget);
    }

    const swayEnabled = !transition.active;
    const isWorks = activeSection === 'WORKS';
    const ambientCameraMotionEnabled = activeSection !== 'LOGS' && activeSection !== 'ABOUT';

    if (isWorks && swayEnabled) {
      const pointerIdle =
        performance.now() - lastPointerMoveRef.current > WORKS_CAMERA_SWAY.mouseIdleMs;
      if (pointerIdle) {
        targetMouseRef.current.lerp(
          scratch.zeroMouse,
          1 - Math.exp(-delta * WORKS_CAMERA_SWAY.mouseReturnSpeed),
        );
      }
    }

    smoothMouseRef.current.lerp(targetMouseRef.current, 1 - Math.exp(-delta * 5));

    if (isWorks && swayEnabled) {
      /** WORKS：绕面板 pivot 做 yaw/pitch 角度轨道，相机距离不变 */
      scratch.pivot.copy(baseTargetRef.current);
      scratch.orbitOffset.copy(basePositionRef.current).sub(scratch.pivot);
      scratch.spherical.setFromVector3(scratch.orbitOffset);

      const idleYaw =
        Math.sin(now * WORKS_CAMERA_SWAY.idleYawSpeed) * WORKS_CAMERA_SWAY.idleYaw;
      const idlePitch =
        Math.sin(now * WORKS_CAMERA_SWAY.idlePitchSpeed) * WORKS_CAMERA_SWAY.idlePitch;
      const mouseYaw = smoothMouseRef.current.x * WORKS_CAMERA_SWAY.mouseYaw;
      const mousePitch = -smoothMouseRef.current.y * WORKS_CAMERA_SWAY.mousePitch;

      scratch.spherical.theta += idleYaw + mouseYaw;
      scratch.spherical.phi = THREE.MathUtils.clamp(
        scratch.spherical.phi + idlePitch + mousePitch,
        0.12,
        Math.PI - 0.12,
      );

      scratch.finalPosition.setFromSpherical(scratch.spherical).add(scratch.pivot);
      currentTargetRef.current.copy(scratch.pivot);
      camera.position.copy(scratch.finalPosition);
      camera.lookAt(scratch.pivot);
    } else {
      scratch.idle.set(
        swayEnabled && ambientCameraMotionEnabled
          ? Math.sin(now * 0.35) * SECTION_CAMERA_TRANSITION.idleAmplitude.x
          : 0,
        swayEnabled && ambientCameraMotionEnabled
          ? Math.sin(now * 0.5) * SECTION_CAMERA_TRANSITION.idleAmplitude.y
          : 0,
        swayEnabled && ambientCameraMotionEnabled
          ? Math.cos(now * 0.25) * SECTION_CAMERA_TRANSITION.idleAmplitude.z
          : 0,
      );
      scratch.mouseTarget.set(
        swayEnabled && ambientCameraMotionEnabled
          ? smoothMouseRef.current.x * SECTION_CAMERA_TRANSITION.mouseTargetAmplitude.x
          : 0,
        swayEnabled && ambientCameraMotionEnabled
          ? -smoothMouseRef.current.y * SECTION_CAMERA_TRANSITION.mouseTargetAmplitude.y
          : 0,
        0,
      );

      scratch.finalPosition.copy(basePositionRef.current).add(scratch.idle);
      scratch.finalTarget.copy(baseTargetRef.current).add(scratch.mouseTarget);
      currentTargetRef.current.copy(scratch.finalTarget);
      camera.position.copy(scratch.finalPosition);
      camera.lookAt(currentTargetRef.current);
    }
    if (perspCamera) {
      const fovTransition = fovTransitionRef.current;
      let targetFov = baseFov;
      if (fovTransition?.active) {
        const fovProgress = THREE.MathUtils.clamp(
          (now - fovTransition.startTime) / WORKS_FOV_ENTRY.duration,
          0,
          1,
        );
        targetFov = THREE.MathUtils.lerp(
          fovTransition.startFov,
          fovTransition.endFov,
          easeInOutCubic(fovProgress),
        );
        if (fovProgress >= 1) {
          fovTransition.active = false;
        }
      }
      perspCamera.fov += (targetFov - perspCamera.fov) * (1 - Math.exp(-delta * 8));
      perspCamera.updateProjectionMatrix();
    }
  }, 20);

  return null;
}

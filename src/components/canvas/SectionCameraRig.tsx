import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ActivePage } from '@/lib/types';
import {
  SECTION_CAMERA_PRESETS,
  SECTION_CAMERA_TRANSITION,
  easeInOutCubic,
} from '@/lib/section-camera-presets';

type SectionCameraRigProps = {
  activeSection: ActivePage;
  introActive: boolean;
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

function targetFromCamera(camera: THREE.Camera, out: THREE.Vector3) {
  camera.getWorldDirection(out);
  out.multiplyScalar(12).add(camera.position);
  return out;
}

export default function SectionCameraRig({ activeSection, introActive }: SectionCameraRigProps) {
  const { camera } = useThree();
  const basePositionRef = useRef(new THREE.Vector3());
  const baseTargetRef = useRef(new THREE.Vector3());
  const currentTargetRef = useRef(new THREE.Vector3());
  const targetMouseRef = useRef(new THREE.Vector2());
  const smoothMouseRef = useRef(new THREE.Vector2());
  const lastSectionRef = useRef<ActivePage>(activeSection);
  const transitionRef = useRef<CameraTransition | null>(null);

  const scratch = useMemo(
    () => ({
      startTarget: new THREE.Vector3(),
      idle: new THREE.Vector3(),
      mouseTarget: new THREE.Vector3(),
      finalPosition: new THREE.Vector3(),
      finalTarget: new THREE.Vector3(),
    }),
    [],
  );

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (activeSection === 'EXPLORE') return;
      targetMouseRef.current.set(
        (event.clientX / window.innerWidth - 0.5) * 2,
        (event.clientY / window.innerHeight - 0.5) * 2,
      );
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [activeSection]);

  useFrame(({ clock }, delta) => {
    if (introActive || activeSection === 'EXPLORE') {
      lastSectionRef.current = activeSection;
      transitionRef.current = null;
      targetMouseRef.current.set(0, 0);
      smoothMouseRef.current.lerp(targetMouseRef.current, 1 - Math.exp(-delta * 4));
      return;
    }

    const now = clock.elapsedTime;
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
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = preset.fov;
        camera.updateProjectionMatrix();
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

    smoothMouseRef.current.lerp(targetMouseRef.current, 1 - Math.exp(-delta * 5));

    const idleEnabled = !transition.active;
    scratch.idle.set(
      idleEnabled ? Math.sin(now * 0.35) * SECTION_CAMERA_TRANSITION.idleAmplitude.x : 0,
      idleEnabled ? Math.sin(now * 0.5) * SECTION_CAMERA_TRANSITION.idleAmplitude.y : 0,
      idleEnabled ? Math.cos(now * 0.25) * SECTION_CAMERA_TRANSITION.idleAmplitude.z : 0,
    );
    scratch.mouseTarget.set(
      smoothMouseRef.current.x * SECTION_CAMERA_TRANSITION.mouseTargetAmplitude.x,
      -smoothMouseRef.current.y * SECTION_CAMERA_TRANSITION.mouseTargetAmplitude.y,
      0,
    );

    scratch.finalPosition.copy(basePositionRef.current).add(scratch.idle);
    scratch.finalTarget.copy(baseTargetRef.current).add(scratch.mouseTarget);
    currentTargetRef.current.copy(scratch.finalTarget);

    camera.position.copy(scratch.finalPosition);
    camera.lookAt(currentTargetRef.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov += (baseFov - camera.fov) * (1 - Math.exp(-delta * 8));
      camera.updateProjectionMatrix();
    }
  }, 20);

  return null;
}

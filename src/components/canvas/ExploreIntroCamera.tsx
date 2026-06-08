import { useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { FirstPersonController } from '@/physics/firstPersonController';
import { CAMERA_BASE_FOV, CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS, EYE_OFFSET_Y } from '@/physics/rapier-config';

export const EXPLORE_INTRO_DURATION = 0.95;

const spawnY = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;
const eyeY = spawnY + EYE_OFFSET_Y;

/** 略高于站位、略靠后 — 只做轻微推进 */
const START = new THREE.Vector3(0, eyeY + 0.55, 2.6);
const END = new THREE.Vector3(0, eyeY, 0);

/** 与 FirstPersonController 相同的 YXZ 朝向模型 */
const START_LOOK = new THREE.Vector3(0, eyeY + 0.08, -14);
const END_LOOK = new THREE.Vector3(0, eyeY, -14);

const START_FOV = CAMERA_BASE_FOV + 2.5;

function easeOutQuad(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - c) * (1 - c);
}

/** 与 syncCamera 一致的 yaw/pitch（Y 轴 yaw，X 轴 pitch） */
export function yawPitchFromLookAt(from: THREE.Vector3, to: THREE.Vector3) {
  const dir = to.clone().sub(from).normalize();
  const pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
  const yaw = Math.atan2(-dir.x, -dir.z);
  return { yaw, pitch };
}

const START_ORIENT = yawPitchFromLookAt(START, START_LOOK);
const END_ORIENT = yawPitchFromLookAt(END, END_LOOK);

function applyYawPitch(camera: THREE.PerspectiveCamera, yaw: number, pitch: number) {
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
  camera.rotation.z = 0;
}

type ExploreIntroCameraProps = {
  active: boolean;
  onComplete: () => void;
  controllerRef: RefObject<FirstPersonController | null>;
  introActiveRef: RefObject<boolean>;
};

export default function ExploreIntroCamera({
  active,
  onComplete,
  controllerRef,
  introActiveRef,
}: ExploreIntroCameraProps) {
  const { camera } = useThree();
  const startedAt = useRef<number | null>(null);
  const finished = useRef(false);

  useFrame(({ clock }) => {
    if (!active || finished.current) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    if (startedAt.current === null) startedAt.current = clock.elapsedTime;

    const raw = (clock.elapsedTime - startedAt.current) / EXPLORE_INTRO_DURATION;
    const t = easeOutQuad(raw);

    const yaw = THREE.MathUtils.lerp(START_ORIENT.yaw, END_ORIENT.yaw, t);
    const pitch = THREE.MathUtils.lerp(START_ORIENT.pitch, END_ORIENT.pitch, t);

    camera.position.lerpVectors(START, END, t);
    applyYawPitch(camera, yaw, pitch);

    camera.fov = THREE.MathUtils.lerp(START_FOV, CAMERA_BASE_FOV, t);
    camera.updateProjectionMatrix();

    if (raw >= 1) {
      finished.current = true;

      camera.position.copy(END);
      applyYawPitch(camera, END_ORIENT.yaw, END_ORIENT.pitch);
      camera.fov = CAMERA_BASE_FOV;
      camera.updateProjectionMatrix();

      const controller = controllerRef.current;
      if (controller) {
        controller.commitIntroHandoff(END_ORIENT.yaw, END_ORIENT.pitch);
        controller.syncCamera(camera, 0, 1);
      }

      introActiveRef.current = false;

      requestAnimationFrame(() => {
        onComplete();
      });
    }
  }, 2);

  return null;
}

export { START as EXPLORE_INTRO_CAMERA_START, START_FOV as EXPLORE_INTRO_CAMERA_FOV };

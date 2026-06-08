import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ROUTE_VIEWPOINTS,
  TRANSITION_CONFIG,
  type StructureId,
  type WorldRoutePath,
} from '@/lib/world-config';

interface TransitionMetrics {
  speed: number;
  transitionProgress: number;
  warningPulse: number;
  landingRipple: number;
  focusBoost: number;
  travelDirection: THREE.Vector2;
}

interface CameraControllerProps {
  routePath: WorldRoutePath;
  focusStructure: StructureId | null;
  focusPoint: THREE.Vector3Tuple | null;
  onMetrics: (metrics: TransitionMetrics) => void;
}

interface ActiveTransition {
  active: boolean;
  startTime: number;
  duration: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  controlPosA: THREE.Vector3;
  controlPosB: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  controlTargetA: THREE.Vector3;
  controlTargetB: THREE.Vector3;
  startFov: number;
  endFov: number;
  travelDirection: THREE.Vector2;
}

interface InputState {
  keyW: boolean;
  keyA: boolean;
  keyS: boolean;
  keyD: boolean;
  arrowUp: boolean;
  arrowDown: boolean;
  arrowLeft: boolean;
  arrowRight: boolean;
  shift: boolean;
}

function cubicBezierPoint(
  t: number,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  out: THREE.Vector3,
): THREE.Vector3 {
  const it = 1 - t;
  const it2 = it * it;
  const t2 = t * t;
  out
    .copy(p0)
    .multiplyScalar(it2 * it)
    .addScaledVector(p1, 3 * it2 * t)
    .addScaledVector(p2, 3 * it * t2)
    .addScaledVector(p3, t2 * t);
  return out;
}

function createTransition(
  currentPos: THREE.Vector3,
  currentTarget: THREE.Vector3,
  currentFov: number,
  routePath: WorldRoutePath,
  now: number,
  quickFocus: boolean,
): ActiveTransition {
  const next = ROUTE_VIEWPOINTS[routePath];
  const endPos = new THREE.Vector3(...next.position);
  if (routePath === '/404') {
    const randomScale = 8 + Math.random() * 16;
    endPos.x += (Math.random() - 0.5) * randomScale;
    endPos.y += Math.random() * 4;
    endPos.z += (Math.random() - 0.5) * randomScale;
  }
  const delta = endPos.clone().sub(currentPos);
  const horizontalDistance = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
  const lift = Math.max(6, TRANSITION_CONFIG.arcLift + horizontalDistance * 0.08);
  const controlPosA = currentPos.clone().addScaledVector(delta, 0.25);
  controlPosA.y += lift;
  const controlPosB = currentPos.clone().addScaledVector(delta, 0.72);
  controlPosB.y += lift * 0.44;

  const endTarget = new THREE.Vector3(...next.target);
  const targetDelta = endTarget.clone().sub(currentTarget);
  const controlTargetA = currentTarget.clone().addScaledVector(targetDelta, 0.28);
  controlTargetA.y += lift * 0.36;
  const controlTargetB = currentTarget.clone().addScaledVector(targetDelta, 0.68);
  controlTargetB.y += lift * 0.2;

  const travelDirection = new THREE.Vector2(delta.x, delta.z);
  if (travelDirection.lengthSq() > 0.0001) {
    travelDirection.normalize();
  } else {
    travelDirection.set(0, -1);
  }

  return {
    active: true,
    startTime: now,
    duration: quickFocus ? TRANSITION_CONFIG.quickFocusSec : TRANSITION_CONFIG.durationSec,
    startPos: currentPos.clone(),
    endPos,
    controlPosA,
    controlPosB,
    startTarget: currentTarget.clone(),
    endTarget,
    controlTargetA,
    controlTargetB,
    startFov: currentFov,
    endFov: quickFocus ? Math.max(40, next.fov - 6) : next.fov,
    travelDirection,
  };
}

export default function CameraController({
  routePath,
  focusStructure,
  focusPoint,
  onMetrics,
}: CameraControllerProps) {
  const { camera } = useThree();
  const currentPosRef = useRef(new THREE.Vector3(...ROUTE_VIEWPOINTS['/'].position));
  const currentTargetRef = useRef(new THREE.Vector3(...ROUTE_VIEWPOINTS['/'].target));
  const basePosRef = useRef(currentPosRef.current.clone());
  const baseTargetRef = useRef(currentTargetRef.current.clone());
  const currentFovRef = useRef(ROUTE_VIEWPOINTS['/'].fov);
  const scrollOffsetRef = useRef(0);
  const warningPulseRef = useRef(0);
  const movementOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const jumpVelocityRef = useRef(0);
  const jumpOffsetRef = useRef(0);
  const landingRippleRef = useRef(0);
  const lastCameraPositionRef = useRef(new THREE.Vector3(...ROUTE_VIEWPOINTS['/'].position));
  const inputRef = useRef<InputState>({
    keyW: false,
    keyA: false,
    keyS: false,
    keyD: false,
    arrowUp: false,
    arrowDown: false,
    arrowLeft: false,
    arrowRight: false,
    shift: false,
  });
  const mouseParallaxRef = useRef(new THREE.Vector2(0, 0));
  const transitionRef = useRef<ActiveTransition>({
    active: false,
    startTime: 0,
    duration: TRANSITION_CONFIG.durationSec,
    startPos: currentPosRef.current.clone(),
    endPos: currentPosRef.current.clone(),
    controlPosA: currentPosRef.current.clone(),
    controlPosB: currentPosRef.current.clone(),
    startTarget: currentTargetRef.current.clone(),
    endTarget: currentTargetRef.current.clone(),
    controlTargetA: currentTargetRef.current.clone(),
    controlTargetB: currentTargetRef.current.clone(),
    startFov: currentFovRef.current,
    endFov: currentFovRef.current,
    travelDirection: new THREE.Vector2(0, -1),
  });
  const lastRouteRef = useRef<WorldRoutePath>('/');
  const lastFocusRef = useRef<StructureId | null>(null);

  const scratch = useMemo(
    () => ({
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
      plannedPos: new THREE.Vector3(),
      plannedTarget: new THREE.Vector3(),
      parallax: new THREE.Vector3(),
      screenShake: new THREE.Vector3(),
      pushPull: new THREE.Vector3(),
      bezierPos: new THREE.Vector3(),
      bezierTarget: new THREE.Vector3(),
      travelDirection: new THREE.Vector2(0, -1),
    }),
    [],
  );

  useEffect(() => {
    camera.position.copy(currentPosRef.current);
    camera.lookAt(currentTargetRef.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = currentFovRef.current;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      mouseParallaxRef.current.set((x - 0.5) * 2, (y - 0.5) * 2);
    };

    const onWheel = (event: WheelEvent) => {
      const delta = event.deltaY * 0.01;
      const next = THREE.MathUtils.clamp(scrollOffsetRef.current + delta, -9, 13);
      if (next === -9 || next === 13) {
        warningPulseRef.current = 1;
      }
      scrollOffsetRef.current = next;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyW') inputRef.current.keyW = true;
      if (event.code === 'KeyA') inputRef.current.keyA = true;
      if (event.code === 'KeyS') inputRef.current.keyS = true;
      if (event.code === 'KeyD') inputRef.current.keyD = true;
      if (event.code === 'ArrowUp') inputRef.current.arrowUp = true;
      if (event.code === 'ArrowDown') inputRef.current.arrowDown = true;
      if (event.code === 'ArrowLeft') inputRef.current.arrowLeft = true;
      if (event.code === 'ArrowRight') inputRef.current.arrowRight = true;
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') inputRef.current.shift = true;
      if (event.code === 'Space' && jumpOffsetRef.current === 0) {
        // 跳跃使用简化重力模型：只在落地状态允许起跳，避免空中二次触发
        jumpVelocityRef.current = 8.6;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'KeyW') inputRef.current.keyW = false;
      if (event.code === 'KeyA') inputRef.current.keyA = false;
      if (event.code === 'KeyS') inputRef.current.keyS = false;
      if (event.code === 'KeyD') inputRef.current.keyD = false;
      if (event.code === 'ArrowUp') inputRef.current.arrowUp = false;
      if (event.code === 'ArrowDown') inputRef.current.arrowDown = false;
      if (event.code === 'ArrowLeft') inputRef.current.arrowLeft = false;
      if (event.code === 'ArrowRight') inputRef.current.arrowRight = false;
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') inputRef.current.shift = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const now = clock.getElapsedTime();
    if (routePath !== lastRouteRef.current) {
      transitionRef.current = createTransition(
        currentPosRef.current,
        currentTargetRef.current,
        currentFovRef.current,
        routePath,
        now,
        false,
      );
      lastRouteRef.current = routePath;
    }

    if (focusStructure && focusStructure !== lastFocusRef.current && focusPoint) {
      const focusPos = new THREE.Vector3(focusPoint[0] + 8, focusPoint[1] + 4, focusPoint[2] + 8);
      const focusTarget = new THREE.Vector3(...focusPoint);
      const focusDir = new THREE.Vector2(focusPos.x - currentPosRef.current.x, focusPos.z - currentPosRef.current.z);
      if (focusDir.lengthSq() > 0.0001) focusDir.normalize();
      const controlPosA = currentPosRef.current.clone().lerp(focusPos, 0.28).add(new THREE.Vector3(0, 4.2, 0));
      const controlPosB = currentPosRef.current.clone().lerp(focusPos, 0.72).add(new THREE.Vector3(0, 1.7, 0));
      const controlTargetA = currentTargetRef.current.clone().lerp(focusTarget, 0.3).add(new THREE.Vector3(0, 2.6, 0));
      const controlTargetB = currentTargetRef.current.clone().lerp(focusTarget, 0.7).add(new THREE.Vector3(0, 1.2, 0));
      transitionRef.current = {
        active: true,
        startTime: now,
        duration: TRANSITION_CONFIG.quickFocusSec,
        startPos: currentPosRef.current.clone(),
        endPos: focusPos,
        controlPosA,
        controlPosB,
        startTarget: currentTargetRef.current.clone(),
        endTarget: focusTarget,
        controlTargetA,
        controlTargetB,
        startFov: currentFovRef.current,
        endFov: 42,
        travelDirection: focusDir,
      };
      lastFocusRef.current = focusStructure;
    } else if (!focusStructure) {
      lastFocusRef.current = null;
    }

    let transitionProgress = 0;
    let focusBoost = 0;
    scratch.travelDirection.set(0, -1);
    const transition = transitionRef.current;
    if (transition.active) {
      const linear = THREE.MathUtils.clamp((now - transition.startTime) / transition.duration, 0, 1);
      transitionProgress = linear;
      const eased = TRANSITION_CONFIG.easeInOutCubic(linear);

      cubicBezierPoint(
        eased,
        transition.startPos,
        transition.controlPosA,
        transition.controlPosB,
        transition.endPos,
        scratch.bezierPos,
      );
      cubicBezierPoint(
        eased,
        transition.startTarget,
        transition.controlTargetA,
        transition.controlTargetB,
        transition.endTarget,
        scratch.bezierTarget,
      );

      basePosRef.current.copy(scratch.bezierPos);
      baseTargetRef.current.copy(scratch.bezierTarget);
      currentFovRef.current = THREE.MathUtils.lerp(transition.startFov, transition.endFov, eased);
      scratch.travelDirection.copy(transition.travelDirection);

      focusBoost = (1 - Math.abs(0.5 - eased) * 2) * (focusStructure ? 0.7 : 0.45);
      if (linear >= 1) {
        transition.active = false;
      }
    }

    const input = inputRef.current;
    const inputX = (input.keyD || input.arrowRight ? 1 : 0) - (input.keyA || input.arrowLeft ? 1 : 0);
    const inputZ = (input.keyW || input.arrowUp ? 1 : 0) - (input.keyS || input.arrowDown ? 1 : 0);
    const inputVec = new THREE.Vector2(inputX, inputZ);
    if (inputVec.lengthSq() > 0) inputVec.normalize();
    const maxSpeed = input.shift ? 17 : 9;
    const accel = input.shift ? 30 : 20;

    scratch.forward.copy(baseTargetRef.current).sub(basePosRef.current).setY(0).normalize();
    if (scratch.forward.lengthSq() < 0.0001) scratch.forward.set(0, 0, -1);
    scratch.right.crossVectors(scratch.forward, new THREE.Vector3(0, 1, 0)).normalize();

    const desired = new THREE.Vector3()
      .addScaledVector(scratch.right, inputVec.x * maxSpeed)
      .addScaledVector(scratch.forward, inputVec.y * maxSpeed);

    // 惯性移动：先向目标速度加速，再阻尼衰减，避免 WASD 生硬启停
    velocityRef.current.lerp(desired, THREE.MathUtils.clamp(accel * delta, 0, 1));
    velocityRef.current.multiplyScalar(0.88);
    movementOffsetRef.current.addScaledVector(velocityRef.current, delta);
    movementOffsetRef.current.x = THREE.MathUtils.clamp(movementOffsetRef.current.x, -26, 26);
    movementOffsetRef.current.z = THREE.MathUtils.clamp(movementOffsetRef.current.z, -26, 26);

    jumpVelocityRef.current -= 19.8 * delta;
    jumpOffsetRef.current += jumpVelocityRef.current * delta;
    if (jumpOffsetRef.current < 0) {
      if (jumpVelocityRef.current < -2.5) landingRippleRef.current = 1;
      jumpOffsetRef.current = 0;
      jumpVelocityRef.current = 0;
    }
    landingRippleRef.current = Math.max(0, landingRippleRef.current - delta * 1.5);

    warningPulseRef.current = Math.max(0, warningPulseRef.current - delta * 1.2);

    scratch.pushPull.copy(scratch.forward).multiplyScalar(scrollOffsetRef.current);
    scratch.parallax.set(-mouseParallaxRef.current.x * 1.4, mouseParallaxRef.current.y * 0.8, 0);

    const is404 = routePath === '/404';
    if (is404) {
      scratch.screenShake.set(
        (Math.random() - 0.5) * 0.25,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.25,
      );
    } else {
      scratch.screenShake.multiplyScalar(0.7);
    }

    scratch.plannedPos
      .copy(basePosRef.current)
      .add(movementOffsetRef.current)
      .add(scratch.pushPull)
      .add(scratch.parallax)
      .add(scratch.screenShake);
    scratch.plannedPos.y += jumpOffsetRef.current;

    scratch.plannedTarget.copy(baseTargetRef.current).add(movementOffsetRef.current);

    currentPosRef.current.lerp(scratch.plannedPos, 0.22);
    currentTargetRef.current.lerp(scratch.plannedTarget, 0.24);

    camera.position.copy(currentPosRef.current);
    camera.lookAt(currentTargetRef.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov += (currentFovRef.current - camera.fov) * 0.18;
      camera.updateProjectionMatrix();
    }

    const distance = camera.position.distanceTo(lastCameraPositionRef.current);
    const speed = THREE.MathUtils.clamp(distance / Math.max(0.0001, delta) / 28, 0, 2.2);
    lastCameraPositionRef.current.copy(camera.position);

    onMetrics({
      speed,
      transitionProgress,
      warningPulse: warningPulseRef.current,
      landingRipple: landingRippleRef.current,
      focusBoost,
      travelDirection: scratch.travelDirection.clone(),
    });
  });

  return null;
}

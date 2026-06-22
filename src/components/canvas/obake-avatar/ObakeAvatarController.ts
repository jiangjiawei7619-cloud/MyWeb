import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import type { FirstPersonController } from '@/physics/firstPersonController';
import { MOVE_SPEED } from '@/physics/rapier-config';
import { getObakeAvatarConfig, OBAKE_AVATAR_LAYER, type ObakeAvatarDebugConfig } from '@/lib/obake-avatar-config';
import { ghostRunConfig, ghostRunToggles, OBAKE_MOTION } from '@/components/canvas/obake-avatar/obake-motion-profile';
import {
  ENABLE_OBAKE_CLOTH_MOTION,
  applyObakeHumanoidPose,
  updateObakeVrm,
} from '@/components/canvas/obake-avatar/obake-vrm-rig';

export type AvatarVisualState = 'move' | 'jump' | 'doubleJump' | 'fall' | 'land';

type TimedAction =
  | { kind: 'jumpSquash'; start: number; phase: 'squash' | 'stretch' }
  | {
      kind: 'takeoff';
      start: number;
      duration: number;
      leanCarry: number;
      rollCarry: number;
      armCarry: number;
    }
  | { kind: 'doubleJump'; start: number; duration: number }
  | { kind: 'land'; start: number; duration: number };

type GhostRunPoseV2 = {
  bobY: number;
  pitchX: number;
  rollZ: number;
};

const _scratchPos = new THREE.Vector3();
const _scratchVel = new THREE.Vector3();
const _facing = new THREE.Vector3();
const _velocityFacing = new THREE.Vector3();
const _baseScale = new THREE.Vector3(1, 1, 1);
const _bounds = new THREE.Box3();
const _boundsCenter = new THREE.Vector3();
const _boundsSize = new THREE.Vector3();
const _flipPivotDesired = new THREE.Vector3();
const _flipPivotActual = new THREE.Vector3();
const _flipBaseEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _flipActualEuler = new THREE.Euler(0, 0, 0, 'YXZ');

/** VRM rotationOffset=π 时取反后与参考录屏前倾一致 */
const LEAN_SIGN = -1;
const DOUBLE_JUMP_FLIP_ROTATION = Math.PI * 2;
const DOUBLE_JUMP_FLIP_DURATION = 0.42 * 1.2;
const DOUBLE_JUMP_FLIP_FORWARD_PIVOT_RATIO = 0.28;
const DOUBLE_JUMP_FLIP_SEGMENT_SPEEDS = [1, 0.85, 0.85 * 0.85 * 1.3 * 1.2] as const;
const DOUBLE_JUMP_FLIP_SPEED_TOTAL =
  DOUBLE_JUMP_FLIP_SEGMENT_SPEEDS[0] +
  DOUBLE_JUMP_FLIP_SEGMENT_SPEEDS[1] +
  DOUBLE_JUMP_FLIP_SEGMENT_SPEEDS[2];
const SKIP_LAND_ANIMATION_SPEED = MOVE_SPEED * 0.08;
const AIRBORNE_RUN_PHASE_SCALE = 0.448;

function directionToYaw(dir: THREE.Vector3): number {
  return Math.atan2(-dir.x, -dir.z);
}

function shortestAngleDelta(target: number, current: number): number {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function smoothstep01(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function dampAlpha(rate: number, delta: number) {
  return THREE.MathUtils.clamp(1 - Math.exp(-rate * delta), 0, 1);
}

function segmentedFlipProgress01(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  const segmentProgress = x * DOUBLE_JUMP_FLIP_SEGMENT_SPEEDS.length;
  const segmentIndex = Math.min(
    DOUBLE_JUMP_FLIP_SEGMENT_SPEEDS.length - 1,
    Math.floor(segmentProgress),
  );
  const localProgress = segmentProgress - segmentIndex;
  let weightedProgress = 0;

  for (let i = 0; i < segmentIndex; i += 1) {
    weightedProgress += DOUBLE_JUMP_FLIP_SEGMENT_SPEEDS[i];
  }
  weightedProgress += DOUBLE_JUMP_FLIP_SEGMENT_SPEEDS[segmentIndex] * localProgress;

  return weightedProgress / DOUBLE_JUMP_FLIP_SPEED_TOTAL;
}

function landingAbsorb01(t: number) {
  const p = THREE.MathUtils.clamp(t, 0, 1);
  const attack = smoothstep01(p / 0.16);
  const release = 1 - smoothstep01((p - 0.2) / 0.42);
  return THREE.MathUtils.clamp(attack * release, 0, 1);
}

function landingRebound01(t: number) {
  const p = THREE.MathUtils.clamp((t - 0.32) / 0.38, 0, 1);
  return Math.sin(p * Math.PI) * (1 - smoothstep01((p - 0.58) / 0.32));
}

function landingSettle01(t: number) {
  return smoothstep01((t - 0.68) / 0.28);
}

function takeoffEase01(t: number) {
  const p = THREE.MathUtils.clamp(t, 0, 1);
  return p * p * (3 - 2 * p);
}

function resolveAvatarState(
  grounded: boolean,
  _hasMoveInput: boolean,
  _horizontalSpeed: number,
  verticalVelocity: number,
  activeAction: TimedAction | null,
): AvatarVisualState {
  if (activeAction?.kind === 'land') return 'land';
  if (activeAction?.kind === 'doubleJump') return 'doubleJump';
  if (activeAction?.kind === 'takeoff') return 'jump';
  if (activeAction?.kind === 'jumpSquash') return 'jump';

  if (!grounded) {
    if (verticalVelocity > 0.35) return 'jump';
    return 'fall';
  }

  return 'move';
}

export class ObakeAvatarController {
  readonly root = new THREE.Group();
  readonly visual = new THREE.Group();
  readonly debug = {
    animDt: 0,
    horizontalSpeed: 0,
    smoothSpeedRatio: 0,
    phaseSpeed: 0,
    visualPitch: 0,
    visualRoll: 0,
    smoothYaw: 0,
    targetYaw: null as number | null,
    yawDelta: 0,
    clothEnabled: ENABLE_OBAKE_CLOTH_MOTION,
  };
  private vrm: VRM | null = null;
  private config: ObakeAvatarDebugConfig = getObakeAvatarConfig();

  private smoothYaw = 0;
  private facingInitialized = false;
  private smoothLeanX = 0;
  private smoothSwayY = 0;
  private smoothRollZ = 0;
  private smoothAirborneMotionStrength = 0;
  private smoothArmSwingStrength = 0;
  private smoothSpeedRatio = 0;
  private ghostRunBlend = 0;
  private smoothBobY = 0;
  private smoothRunScaleX = 1;
  private smoothRunScaleY = 1;
  private smoothRunScaleZ = 1;
  private runPhase = 0;
  private airbornePosePhase = 0;
  private smoothTurnLean = 0;
  private rootLeanForBones = 0;
  private rootRollForBones = 0;
  private readonly previousHorizontalVelocity = new THREE.Vector3();
  private readonly horizontalAcceleration = new THREE.Vector3();
  private readonly smoothedVelocityDirection = new THREE.Vector3(0, 0, -1);
  private velocityDirectionInitialized = false;
  private preTurnYaw: number | null = null;
  private preTurnTimer = 0;
  private action: TimedAction | null = null;
  private time = 0;
  private hoverScale = 1;
  private clickPulse = 0;
  private readonly flipPivot = new THREE.Vector3(0, 0.7, 0);

  constructor() {
    this.visual.rotation.order = 'YXZ';
    this.root.layers.set(OBAKE_AVATAR_LAYER);
    this.visual.layers.set(OBAKE_AVATAR_LAYER);
    this.root.add(this.visual);
  }

  attachVrm(vrm: VRM, config = getObakeAvatarConfig()) {
    this.detachVrm();
    this.config = config;
    this.vrm = vrm;

    vrm.scene.rotation.y = config.rotationOffset;
    const s = config.scale;
    vrm.scene.scale.setScalar(s);
    _baseScale.set(s, s, s);
    this.visual.add(vrm.scene);
    vrm.scene.updateMatrixWorld(true);
    _bounds.setFromObject(vrm.scene);
    if (!_bounds.isEmpty()) {
      _bounds.getCenter(_boundsCenter);
      _bounds.getSize(_boundsSize);
      this.flipPivot.set(
        _boundsCenter.x,
        _bounds.min.y,
        _boundsCenter.z - _boundsSize.z * DOUBLE_JUMP_FLIP_FORWARD_PIVOT_RATIO,
      );
    }

    this.facingInitialized = false;
    this.smoothLeanX = 0;
    this.smoothSwayY = 0;
    this.smoothRollZ = 0;
    this.smoothAirborneMotionStrength = 0;
    this.smoothArmSwingStrength = 0;
    this.smoothSpeedRatio = 0;
    this.ghostRunBlend = 0;
    this.smoothBobY = 0;
    this.smoothRunScaleX = 1;
    this.smoothRunScaleY = 1;
    this.smoothRunScaleZ = 1;
    this.runPhase = 0;
    this.airbornePosePhase = 0;
    this.smoothTurnLean = 0;
    this.rootLeanForBones = 0;
    this.rootRollForBones = 0;
    this.previousHorizontalVelocity.set(0, 0, 0);
    this.horizontalAcceleration.set(0, 0, 0);
    this.smoothedVelocityDirection.set(0, 0, -1);
    this.velocityDirectionInitialized = false;
    this.preTurnYaw = null;
    this.preTurnTimer = 0;
    this.action = null;
  }

  detachVrm() {
    if (this.vrm) {
      this.visual.remove(this.vrm.scene);
      this.vrm = null;
    }
    this.action = null;
  }

  dispose() {
    this.detachVrm();
    this.root.clear();
  }

  setHovered(hovered: boolean) {
    this.hoverScale = hovered ? 1.02 : 1;
  }

  setVisible(visible: boolean) {
    this.root.visible = visible;
  }

  isReady() {
    return this.vrm !== null;
  }

  triggerClickPulse() {
    this.clickPulse = 1;
  }

  update(delta: number, controller: FirstPersonController, physicsAlpha: number) {
    if (!this.vrm) return;

    const animDt = THREE.MathUtils.clamp(delta, 1 / 120, 1 / 30);
    this.time += animDt;
    const cfg = this.config;
    const pulses = controller.consumeAvatarPulses();
    const grounded = controller.isPlayerGrounded();
    const hasMoveInput = controller.hasMoveInput();
    const verticalVelocity = controller.getVerticalVelocity();
    const horizontalSpeed = controller.getHorizontalSpeed();
    controller.getHorizontalVelocity(_scratchVel);
    const accelDelta = Math.max(animDt, 1 / 120);
    this.horizontalAcceleration
      .copy(_scratchVel)
      .sub(this.previousHorizontalVelocity)
      .multiplyScalar(1 / accelDelta);
    this.previousHorizontalVelocity.copy(_scratchVel);
    controller.getDisplayBodyPosition(_scratchPos, physicsAlpha);

    if (pulses.land) {
      const movingOnLanding = hasMoveInput || horizontalSpeed > SKIP_LAND_ANIMATION_SPEED;
      if (movingOnLanding) {
        this.action = null;
        this.smoothAirborneMotionStrength = 0;
      } else {
        this.action = { kind: 'land', start: this.time, duration: OBAKE_MOTION.landDuration };
      }
    } else if (pulses.jump && cfg.enableJumpSquash) {
      this.action = {
        kind: 'takeoff',
        start: this.time,
        duration: OBAKE_MOTION.takeoffDuration,
        leanCarry: this.smoothLeanX,
        rollCarry: this.smoothRollZ,
        armCarry: this.smoothArmSwingStrength,
      };
    } else if (pulses.doubleJump && cfg.enableDoubleJumpAction) {
      this.action = { kind: 'doubleJump', start: this.time, duration: DOUBLE_JUMP_FLIP_DURATION };
    }

    this.debug.animDt = animDt;
    this.debug.horizontalSpeed = horizontalSpeed;
    this.debug.clothEnabled = ENABLE_OBAKE_CLOTH_MOTION;

    this.advanceAction(animDt);

    const avatarState = resolveAvatarState(
      grounded,
      hasMoveInput,
      horizontalSpeed,
      verticalVelocity,
      this.action,
    );
    if (avatarState === 'jump' || avatarState === 'fall' || avatarState === 'doubleJump') {
      this.airbornePosePhase += Math.PI * 2 * ghostRunConfig.airborneTwistHz * animDt;
    } else {
      this.airbornePosePhase = this.runPhase * AIRBORNE_RUN_PHASE_SCALE;
    }

    this.root.position.set(
      _scratchPos.x + cfg.positionOffset[0],
      _scratchPos.y + cfg.yOffset + cfg.positionOffset[1],
      _scratchPos.z + cfg.positionOffset[2],
    );

    this.updateFacing(animDt, controller, _scratchVel, horizontalSpeed, hasMoveInput);
    this.root.rotation.y = this.smoothYaw;

    this.applyReferenceMotion(
      animDt,
      avatarState,
      horizontalSpeed,
      hasMoveInput,
      grounded,
      controller.getCameraFxBlend(),
    );

    applyObakeHumanoidPose(this.vrm, {
      time: this.time,
      moveStrength: this.smoothArmSwingStrength,
      airborne: !grounded,
      runPhase: this.runPhase,
      airbornePhase: this.airbornePosePhase,
      speedRatio: this.smoothSpeedRatio,
      rootLean: this.rootLeanForBones,
      rootRoll: this.rootRollForBones,
      turnLean: this.smoothTurnLean,
      ...this.getHumanoidMotionState(avatarState),
    });
    updateObakeVrm(this.vrm, animDt, {
      horizontalVelocity: _scratchVel,
      horizontalAcceleration: this.horizontalAcceleration,
      runPhase: this.runPhase,
      speedRatio: this.smoothSpeedRatio,
      runBlend: this.ghostRunBlend,
      turnLean: this.smoothTurnLean,
    });
  }

  private getHumanoidMotionState(state: AvatarVisualState) {
    if (this.action?.kind === 'doubleJump') {
      const flipPhase = THREE.MathUtils.clamp(
        (this.time - this.action.start) / this.action.duration,
        0,
        1,
      );
      return {
        jumpStrength: 0.25,
        doubleJumpStrength: 1,
        flipPhase,
        airborneStrength: Math.max(this.smoothAirborneMotionStrength, 0.35),
        landStrength: 0,
      };
    }

    if (this.action?.kind === 'jumpSquash') {
      return {
        jumpStrength: this.action.phase === 'squash' ? 0.55 : 1,
        doubleJumpStrength: 0,
        flipPhase: 0,
        airborneStrength: Math.max(this.smoothAirborneMotionStrength, 0.75),
        landStrength: 0,
      };
    }

    if (this.action?.kind === 'takeoff') {
      const p = takeoffEase01(
        (this.time - this.action.start) / this.action.duration,
      );
      return {
        jumpStrength: THREE.MathUtils.lerp(0.12, 0.45, p),
        doubleJumpStrength: 0,
        flipPhase: 0,
        airborneStrength: Math.max(
          this.smoothAirborneMotionStrength * p,
          OBAKE_MOTION.takeoffAirborneStart * p,
        ),
        landStrength: 0,
      };
    }

    if (this.action?.kind === 'land') {
      const p = THREE.MathUtils.clamp(
        (this.time - this.action.start) / this.action.duration,
        0,
        1,
      );
      return {
        jumpStrength: 0,
        doubleJumpStrength: 0,
        flipPhase: 0,
        airborneStrength: 0,
        landStrength: landingAbsorb01(p),
      };
    }

    if (state === 'jump') {
      return {
        jumpStrength: 0.45,
        doubleJumpStrength: 0,
        flipPhase: 0,
        airborneStrength: this.smoothAirborneMotionStrength,
        landStrength: 0,
      };
    }

    if (state === 'fall') {
      return {
        jumpStrength: 0.16,
        doubleJumpStrength: 0,
        flipPhase: 0,
        airborneStrength: this.smoothAirborneMotionStrength,
        landStrength: 0,
      };
    }

    return {
      jumpStrength: 0,
      doubleJumpStrength: 0,
      flipPhase: 0,
      airborneStrength: this.smoothAirborneMotionStrength,
      landStrength: 0,
    };
  }

  private advanceAction(delta: number) {
    const action = this.action;
    if (!action) return;

    const elapsed = this.time - action.start;
    switch (action.kind) {
      case 'jumpSquash':
        if (action.phase === 'squash' && elapsed > 0.07) {
          this.action = { kind: 'jumpSquash', start: this.time, phase: 'stretch' };
        } else if (action.phase === 'stretch' && elapsed > 0.1) {
          this.action = null;
        }
        break;
      case 'takeoff':
        if (elapsed >= action.duration) this.action = null;
        break;
      case 'doubleJump':
        if (elapsed >= action.duration + delta) this.action = null;
        break;
      case 'land':
        if (elapsed >= action.duration) this.action = null;
        break;
      default:
        break;
    }
  }

  private updateFacing(
    delta: number,
    controller: FirstPersonController,
    horizontalVel: THREE.Vector3,
    horizontalSpeed: number,
    hasMoveInput: boolean,
  ) {
    let targetYaw: number | null = null;
    let turnSpeed = 8;
    let maxYawStep = 0.14;
    const hasWishDirection = hasMoveInput && controller.getWishDirectionHorizontal(_facing);
    const wishYaw = hasWishDirection ? directionToYaw(_facing) : null;
    let rawVelocityYaw: number | null = null;
    let velocityYaw: number | null = null;

    if (horizontalSpeed > 0.25 && horizontalVel.lengthSq() > 0.0001) {
      _velocityFacing.copy(horizontalVel).normalize();
      rawVelocityYaw = directionToYaw(_velocityFacing);
      if (!this.velocityDirectionInitialized) {
        this.smoothedVelocityDirection.copy(_velocityFacing);
        this.velocityDirectionInitialized = true;
      } else {
        this.smoothedVelocityDirection
          .lerp(_velocityFacing, dampAlpha(8, delta))
          .normalize();
      }
      velocityYaw = directionToYaw(this.smoothedVelocityDirection);
    } else {
      this.velocityDirectionInitialized = false;
    }

    if (wishYaw === null) {
      this.preTurnYaw = null;
      this.preTurnTimer = 0;
    } else if (rawVelocityYaw !== null) {
      const wishVelocityDelta = Math.abs(shortestAngleDelta(wishYaw, rawVelocityYaw));
      const wishCurrentDelta = Math.abs(shortestAngleDelta(wishYaw, this.smoothYaw));
      if (wishVelocityDelta > Math.PI * 0.42 || wishCurrentDelta > Math.PI * 0.46) {
        this.preTurnYaw = wishYaw;
        this.preTurnTimer = Math.max(this.preTurnTimer, 0.26);
      } else if (
        this.preTurnYaw !== null &&
        Math.abs(shortestAngleDelta(wishYaw, this.preTurnYaw)) > Math.PI * 0.18
      ) {
        this.preTurnYaw = wishYaw;
        this.preTurnTimer = Math.max(this.preTurnTimer, 0.18);
      }
    }

    if (this.preTurnYaw !== null && wishYaw !== null) {
      this.preTurnTimer = Math.max(0, this.preTurnTimer - delta);
      const velocityStillOpposed =
        rawVelocityYaw !== null &&
        horizontalSpeed > 0.25 &&
        Math.abs(shortestAngleDelta(wishYaw, rawVelocityYaw)) > Math.PI * 0.3;
      const yawNotSettled = Math.abs(shortestAngleDelta(this.preTurnYaw, this.smoothYaw)) > 0.08;
      if (this.preTurnTimer > 0 || velocityStillOpposed || yawNotSettled) {
        targetYaw = this.preTurnYaw;
        turnSpeed = 18;
        maxYawStep = 0.22;
      } else {
        this.preTurnYaw = null;
      }
    }

    if (targetYaw === null) {
      if (velocityYaw !== null) {
        targetYaw = velocityYaw;
        turnSpeed = ghostRunConfig.facingTurnSpeed;
        maxYawStep = 0.14;
      } else if (wishYaw !== null) {
        targetYaw = wishYaw;
        turnSpeed = 14;
        maxYawStep = 0.18;
      }
    }

    this.debug.targetYaw = targetYaw;
    if (targetYaw === null) {
      const relaxT = dampAlpha(8, delta);
      this.smoothTurnLean = THREE.MathUtils.lerp(this.smoothTurnLean, 0, relaxT);
      this.debug.yawDelta = 0;
      this.debug.smoothYaw = this.smoothYaw;
      return;
    }

    if (!this.facingInitialized) {
      this.smoothYaw = targetYaw;
      this.facingInitialized = true;
      this.smoothTurnLean = 0;
      this.debug.yawDelta = 0;
      this.debug.smoothYaw = this.smoothYaw;
      return;
    }

    const deltaAngle = shortestAngleDelta(targetYaw, this.smoothYaw);
    const yawStep = THREE.MathUtils.clamp(
      deltaAngle * dampAlpha(turnSpeed, delta),
      -maxYawStep,
      maxYawStep,
    );
    this.smoothYaw += yawStep;
    const turnLeanTarget = 0;
    const turnLeanT = dampAlpha(9, delta);
    this.smoothTurnLean = THREE.MathUtils.lerp(this.smoothTurnLean, turnLeanTarget, turnLeanT);
    this.debug.yawDelta = deltaAngle;
    this.debug.smoothYaw = this.smoothYaw;
  }

  /**
   * 参考录屏：适度前倾 + 左右侧身；无 roll 摇头。
   */
  private applyReferenceMotion(
    delta: number,
    state: AvatarVisualState,
    horizontalSpeed: number,
    hasMoveInput: boolean,
    grounded: boolean,
    cameraFx: number,
  ) {
    const cfg = this.config;
    const speedNorm = THREE.MathUtils.clamp(horizontalSpeed / MOVE_SPEED, 0, 1);
    const moving = hasMoveInput || speedNorm > 0.04;
    const speedT = dampAlpha(ghostRunConfig.speedSmooth, delta);
    this.smoothSpeedRatio = THREE.MathUtils.lerp(
      this.smoothSpeedRatio,
      moving ? speedNorm : 0,
      speedT,
    );
    const moveStrengthTarget = moving
      ? smoothstep01(Math.max(this.smoothSpeedRatio, hasMoveInput ? 0.18 : 0))
      : 0;
    const blendT = dampAlpha(ghostRunConfig.blendSmooth, delta);
    this.ghostRunBlend = THREE.MathUtils.lerp(this.ghostRunBlend, moveStrengthTarget, blendT);
    const moveStrength = this.ghostRunBlend;
    const phaseSpeed = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(
        ghostRunConfig.phaseSpeedMin,
        ghostRunConfig.phaseSpeedMax,
        this.smoothSpeedRatio,
      ),
      0,
      14.75,
    );
    this.runPhase += phaseSpeed * delta;
    if (this.runPhase > Math.PI * 2000) this.runPhase %= Math.PI * 2;
    this.debug.smoothSpeedRatio = this.smoothSpeedRatio;
    this.debug.phaseSpeed = phaseSpeed;

    const takeoffAction = this.action?.kind === 'takeoff' ? this.action : null;
    const takeoffProgress = takeoffAction
      ? takeoffEase01((this.time - takeoffAction.start) / takeoffAction.duration)
      : 1;
    const takeoffAirborneGate = takeoffAction
      ? THREE.MathUtils.lerp(OBAKE_MOTION.takeoffAirborneStart, 1, takeoffProgress)
      : 1;
    const targetAirborneMotionStrength =
      (!grounded && state !== 'land' ? (state === 'doubleJump' ? 0.25 : 1) : 0) * takeoffAirborneGate;
    const airborneMotionSmooth =
      targetAirborneMotionStrength > this.smoothAirborneMotionStrength
        ? takeoffAction
          ? 18
          : 10
        : 3.2;
    const airborneMotionT = dampAlpha(airborneMotionSmooth, delta);
    this.smoothAirborneMotionStrength = THREE.MathUtils.lerp(
      this.smoothAirborneMotionStrength,
      targetAirborneMotionStrength,
      airborneMotionT,
    );
    const airborneMotionStrength = this.smoothAirborneMotionStrength;
    const airbornePhase = this.airbornePosePhase;

    let targetLeanX = 0;
    let targetSwayY = 0;
    let targetRollZ = 0;
    let bobY = 0;
    let scaleX = 1;
    let scaleY = 1;
    let scaleZ = 1;
    let flipRotationX = 0;
    let landSettle = 0;

    switch (state) {
      case 'move':
        if (moving && cfg.enableMoveTilt && ghostRunToggles.enableGhostRunV2) {
          const runPose = this.applySprintRunPose({
            animDt: delta,
            speedRatio: speedNorm,
            smoothSpeedRatio: this.smoothSpeedRatio,
            runPhase: this.runPhase,
            grounded,
            airborneBlend: airborneMotionStrength,
            runBlend: moveStrength,
          });
          targetLeanX = runPose.pitchX;
          bobY = runPose.bobY;
          targetSwayY = 0;
          targetRollZ = runPose.rollZ;
        }
        scaleX = 1;
        scaleY = 1;
        scaleZ = 1;
        break;

      case 'jump':
        targetLeanX =
          OBAKE_MOTION.airborneLean +
          Math.sin(airbornePhase) * OBAKE_MOTION.airborneBodyLeanAmp * airborneMotionStrength;
        if (takeoffAction) {
          targetLeanX = THREE.MathUtils.lerp(takeoffAction.leanCarry, targetLeanX, takeoffProgress);
        }
        targetSwayY =
          Math.sin(airbornePhase + Math.PI * 0.55) *
          OBAKE_MOTION.airborneBodyYawAmp *
          0.45 *
          airborneMotionStrength;
        targetRollZ =
          Math.sin(airbornePhase + Math.PI * 0.25) *
          OBAKE_MOTION.airborneBodyRollAmp *
          0.62 *
          airborneMotionStrength;
        if (takeoffAction) {
          targetRollZ = THREE.MathUtils.lerp(takeoffAction.rollCarry, targetRollZ, takeoffProgress);
        }
        break;

      case 'doubleJump':
        if (cfg.enableDoubleJumpAction && this.action?.kind === 'doubleJump') {
          const p = THREE.MathUtils.clamp(
            (this.time - this.action.start) / this.action.duration,
            0,
            1,
          );
          const flipProgress = segmentedFlipProgress01(p);
          const wave = Math.sin(p * Math.PI);
          scaleY = 1 + wave * 0.04;
          scaleX = scaleZ = 1 - wave * 0.02;
          flipRotationX = LEAN_SIGN * DOUBLE_JUMP_FLIP_ROTATION * flipProgress;
        }
        targetLeanX =
          OBAKE_MOTION.airborneLean +
          Math.sin(airbornePhase) * OBAKE_MOTION.airborneBodyLeanAmp * airborneMotionStrength;
        targetSwayY =
          Math.sin(airbornePhase + Math.PI * 0.55) *
          OBAKE_MOTION.airborneBodyYawAmp *
          0.45 *
          airborneMotionStrength;
        targetRollZ =
          Math.sin(airbornePhase + Math.PI * 0.25) *
          OBAKE_MOTION.airborneBodyRollAmp *
          0.62 *
          airborneMotionStrength;
        break;

      case 'fall':
        targetLeanX =
          OBAKE_MOTION.airborneLean +
          Math.sin(airbornePhase) * OBAKE_MOTION.airborneBodyLeanAmp * airborneMotionStrength;
        targetSwayY =
          Math.sin(airbornePhase + Math.PI * 0.55) *
          OBAKE_MOTION.airborneBodyYawAmp *
          0.45 *
          airborneMotionStrength;
        targetRollZ =
          Math.sin(airbornePhase + Math.PI * 0.25) *
          OBAKE_MOTION.airborneBodyRollAmp *
          0.62 *
          airborneMotionStrength;
        break;

      case 'land':
        if (this.action?.kind === 'land') {
          const p = THREE.MathUtils.clamp(
            (this.time - this.action.start) / this.action.duration,
            0,
            1,
          );
          const absorb = landingAbsorb01(p);
          const rebound = landingRebound01(p);
          landSettle = landingSettle01(p);
          const settleFade = 1 - landSettle;
          const airborneCarry = OBAKE_MOTION.airborneLean * (1 - smoothstep01(p / 0.18));
          targetLeanX = (airborneCarry + OBAKE_MOTION.landLean * absorb) * settleFade;
          bobY = (-OBAKE_MOTION.landDipY * absorb + OBAKE_MOTION.landReboundY * rebound) * settleFade;
          scaleX = 1 + (OBAKE_MOTION.landSpreadX * absorb - OBAKE_MOTION.landSpreadX * 0.22 * rebound) * settleFade;
          scaleY = 1 + (-OBAKE_MOTION.landSquashY * absorb + OBAKE_MOTION.landReboundY * 0.75 * rebound) * settleFade;
          scaleZ = 1 + (OBAKE_MOTION.landSpreadZ * absorb - OBAKE_MOTION.landSpreadZ * 0.18 * rebound) * settleFade;
        } else {
          targetLeanX = 0;
        }
        targetSwayY = 0;
        targetRollZ = 0;
        break;

      default:
        break;
    }

    const motionSmooth =
      state === 'land'
        ? THREE.MathUtils.lerp(OBAKE_MOTION.tiltSmooth * 1.25, OBAKE_MOTION.tiltSmooth * 2.4, landSettle)
        : OBAKE_MOTION.tiltSmooth;
    const motionT = dampAlpha(motionSmooth, delta);
    this.smoothLeanX = THREE.MathUtils.lerp(this.smoothLeanX, targetLeanX, motionT);
    this.smoothSwayY = 0;
    const rollLimit = state === 'move' ? 0.02 : 0.04;
    this.smoothRollZ = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(this.smoothRollZ, targetRollZ, motionT),
      -rollLimit,
      rollLimit,
    );

    let targetArmSwing =
      ghostRunToggles.enableArmSwing && grounded && moving
        ? moveStrength
        : airborneMotionStrength * 0.28;
    if (takeoffAction) {
      targetArmSwing = THREE.MathUtils.lerp(
        takeoffAction.armCarry * OBAKE_MOTION.takeoffRunArmCarry,
        targetArmSwing,
        takeoffProgress,
      );
    }
    const armT = dampAlpha(OBAKE_MOTION.armSwingSmooth, delta);
    this.smoothArmSwingStrength = THREE.MathUtils.lerp(this.smoothArmSwingStrength, targetArmSwing, armT);

    let clickScaleX = 1;
    let clickScaleY = 1;
    let clickScaleZ = 1;
    if (this.clickPulse > 0) {
      this.clickPulse = Math.max(0, this.clickPulse - delta * 3.5);
      const clickT = 1 - this.clickPulse;
      const bounce = Math.sin(clickT * Math.PI) * 0.04;
      clickScaleY = 1 + bounce;
      clickScaleX = clickScaleZ = 1 - bounce * 0.2;
    }

    const stretchForward = 1 + cameraFx * OBAKE_MOTION.cameraStretchForward;
    const stretchSquash = 1 - cameraFx * OBAKE_MOTION.cameraStretchSquash;
    const stretchWidth = 1 + cameraFx * OBAKE_MOTION.cameraStretchWidth;
    const stretchSurge = 0;
    const rootEase = state === 'land' ? THREE.MathUtils.lerp(20, 34, landSettle) : 16;
    const rootT = dampAlpha(rootEase, delta);
    this.smoothBobY = THREE.MathUtils.lerp(this.smoothBobY, bobY, rootT);
    this.smoothRunScaleX = THREE.MathUtils.lerp(this.smoothRunScaleX, scaleX, rootT);
    this.smoothRunScaleY = THREE.MathUtils.lerp(this.smoothRunScaleY, scaleY, rootT);
    this.smoothRunScaleZ = THREE.MathUtils.lerp(this.smoothRunScaleZ, scaleZ, rootT);
    const finalScaleX =
      _baseScale.x * this.smoothRunScaleX * this.hoverScale * clickScaleX * stretchWidth;
    const finalScaleY =
      _baseScale.y * this.smoothRunScaleY * this.hoverScale * clickScaleY * stretchSquash;
    const finalScaleZ =
      _baseScale.z * this.smoothRunScaleZ * this.hoverScale * clickScaleZ * stretchForward;
    const leanRotationX = LEAN_SIGN * this.smoothLeanX;
    const totalRotationX = leanRotationX + flipRotationX;
    this.rootLeanForBones = this.smoothLeanX;
    this.rootRollForBones = this.smoothRollZ;

    this.visual.position.set(0, this.smoothBobY, -stretchSurge);
    this.visual.rotation.y = 0;
    this.visual.rotation.x = totalRotationX;
    this.visual.rotation.z = this.smoothRollZ;
    this.visual.scale.set(finalScaleX, finalScaleY, finalScaleZ);
    this.debug.visualPitch = totalRotationX;
    this.debug.visualRoll = this.smoothRollZ;

    if (Math.abs(flipRotationX) > 0.0001) {
      _flipPivotDesired
        .set(
          this.flipPivot.x * finalScaleX,
          this.flipPivot.y * finalScaleY,
          this.flipPivot.z * finalScaleZ,
        )
        .applyEuler(_flipBaseEuler.set(leanRotationX, this.smoothSwayY, this.smoothRollZ, 'YXZ'));
      _flipPivotActual
        .set(
          this.flipPivot.x * finalScaleX,
          this.flipPivot.y * finalScaleY,
          this.flipPivot.z * finalScaleZ,
        )
        .applyEuler(_flipActualEuler.set(totalRotationX, this.smoothSwayY, this.smoothRollZ, 'YXZ'));
      this.visual.position.add(_flipPivotDesired.sub(_flipPivotActual));
    }
  }

  private applySprintRunPose({
    animDt,
    speedRatio,
    smoothSpeedRatio,
    runPhase,
    grounded,
    airborneBlend,
    runBlend,
  }: {
    animDt: number;
    speedRatio: number;
    smoothSpeedRatio: number;
    runPhase: number;
    grounded: boolean;
    airborneBlend: number;
    runBlend: number;
  }): GhostRunPoseV2 {
    const safeDt = THREE.MathUtils.clamp(animDt, 1 / 120, 1 / 30);
    const groundedRun = grounded ? runBlend * (1 - THREE.MathUtils.clamp(airborneBlend, 0, 1)) : 0;
    const speed = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(smoothSpeedRatio, speedRatio, Math.min(safeDt * 2, 0.05)),
      0,
      1,
    );
    const bobWave = Math.abs(Math.sin(runPhase));
    const bobEase = smoothstep01(bobWave);
    const bobAmp = THREE.MathUtils.lerp(ghostRunConfig.bobAmp.min, ghostRunConfig.bobAmp.max, speed);
    const bobY = ghostRunToggles.enableRootBob ? bobEase * bobAmp * groundedRun : 0;
    const pitchX = ghostRunToggles.enableRootPitch
      ? THREE.MathUtils.lerp(ghostRunConfig.rootLean.min, ghostRunConfig.rootLean.max, speed) *
        groundedRun
      : 0;
    const rollZ = ghostRunToggles.enableTinyRoll
      ? THREE.MathUtils.clamp(Math.sin(runPhase * 0.5) * ghostRunConfig.rollAmp * groundedRun, -0.01, 0.01)
      : 0;

    return {
      bobY,
      pitchX,
      rollZ,
    };
  }
}

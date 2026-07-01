import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {
  AIR_ACCEL,
  AIR_JUMP_VELOCITY,
  CAMERA_BASE_FOV,
  CAMERA_FX_SMOOTH,
  CAMERA_PITCH_STRETCH_MAX,
  CAMERA_PITCH_STRETCH_THRESHOLD,
  CAMERA_STRETCH_CONTRAST,
  CAMERA_STRETCH_PITCH_SMOOTH,
  CAMERA_WALK_FOV_BOOST,
  CAPSULE_HALF_HEIGHT,
  CAPSULE_RADIUS,
  EYE_OFFSET_Y,
  FIXED_TIMESTEP,
  GROUND_ACCEL,
  GROUND_FRICTION,
  GROUNDED_VY_THRESHOLD,
  JUMP_VELOCITY,
  MAX_JUMPS,
  LOOK_DIRECT_BLEND,
  LOOK_MOMENTUM_DECAY,
  LOOK_MOMENTUM_MAX,
  LOOK_MOMENTUM_SAMPLE,
  LOOK_STATIONARY_DECAY_MULT,
  LOOK_STATIONARY_MS,
  MOUSE_SENSITIVITY,
  MOVE_SPEED,
  PITCH_MAX,
  PITCH_MIN,
  THIRD_PERSON_DISTANCE,
  THIRD_PERSON_PITCH_BIAS,
  THIRD_PERSON_PIVOT_Y,
} from '@/physics/rapier-config';
import type { PhysicsWorldBundle } from '@/physics/createPhysicsWorld';
import { playCyberDoubleJumpSound, playCyberJumpSound } from '@/utils/audio';

export interface FirstPersonControllerOptions {
  domElement: HTMLElement;
  bundle: PhysicsWorldBundle;
  /** 为 false 时不响应键鼠，用于 WORKS / LOGS / ABOUT 等仅作背景的场景 */
  inputEnabled?: boolean;
}

export class FirstPersonController {
  readonly world: RAPIER.World;
  readonly playerBody: RAPIER.RigidBody;
  readonly playerCollider: RAPIER.Collider;

  private readonly domElement: HTMLElement;
  private inputEnabled: boolean;
  private inputListenersAttached = false;
  private readonly keys = new Set<string>();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly wishDir = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  yaw = 0;
  pitch = 0;

  private lookDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private lastLookSampleMs = 0;
  private lastPointerMotionMs = 0;
  private yawVel = 0;
  private pitchVel = 0;
  private jumpQueued = false;
  private jumpsRemaining = MAX_JUMPS;
  private disposed = false;
  private grounded = false;

  /** 镜头 FX 平滑状态 */
  private fxBlend = 0;
  private smoothPitchStretch = 0;
  private smoothFovBoost = 0;
  private smoothPush = 0;
  private smoothBobY = 0;
  private bobPhase = 0;
  private readonly viewForward = new THREE.Vector3();
  private readonly baseCameraPos = new THREE.Vector3();
  private readonly prevBodyPos = new THREE.Vector3();
  private readonly currBodyPos = new THREE.Vector3();
  private bodyPosInitialized = false;
  private smoothBodyY = 0;
  private readonly horizontalVel = new THREE.Vector3();
  private readonly interpBodyPos = new THREE.Vector3();
  private readonly cameraPivotPos = new THREE.Vector3();
  private prevGroundedForAvatar = false;
  private avatarLandPulse = false;
  private avatarJumpPulse = false;
  private avatarDoubleJumpPulse = false;

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.inputEnabled) return;
    if (this.isTypingTarget(event.target)) return;
    this.keys.add(event.code);
    if (event.code === 'Space') {
      event.preventDefault();
      this.jumpQueued = true;
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (!this.inputEnabled) return;
    this.keys.delete(event.code);
  };

  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.inputEnabled) return;
    if (event.button !== 0) return;
    if (this.isTypingTarget(event.target)) return;

    this.lookDragging = true;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    const now = performance.now();
    this.lastLookSampleMs = now;
    this.lastPointerMotionMs = now;
    this.yawVel = 0;
    this.pitchVel = 0;
    this.domElement.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.lookDragging) return;

    let dx = event.movementX;
    let dy = event.movementY;
    if (dx === 0 && dy === 0) {
      dx = event.clientX - this.lastPointerX;
      dy = event.clientY - this.lastPointerY;
    }

    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;

    const now = performance.now();
    const dt = Math.max(1 / 240, Math.min(0.05, (now - this.lastLookSampleMs) / 1000));
    this.lastLookSampleMs = now;
    this.applyLookDelta(dx, dy, dt);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    if (!this.lookDragging) return;
    this.endLookDrag(event);
  };

  private readonly onPointerCancel = (event: PointerEvent) => {
    if (!this.lookDragging) return;
    this.endLookDrag(event);
  };

  private readonly onLostPointerCapture = () => {
    this.lookDragging = false;
  };

  constructor({ domElement, bundle, inputEnabled = true }: FirstPersonControllerOptions) {
    this.domElement = domElement;
    this.world = bundle.world;
    this.playerBody = bundle.playerBody;
    this.playerCollider = bundle.playerCollider;
    this.inputEnabled = inputEnabled;
    if (inputEnabled) this.attachInputListeners();
  }

  setInputEnabled(enabled: boolean) {
    if (enabled === this.inputEnabled) return;
    this.inputEnabled = enabled;
    if (enabled) {
      this.attachInputListeners();
      return;
    }
    this.detachInputListeners();
    this.keys.clear();
    this.lookDragging = false;
    this.yawVel = 0;
    this.pitchVel = 0;
  }

  /** 玩家是否已有可恢复的 EXPLORE 视角（intro 交接或至少一帧物理步进后） */
  isExploreStateReady(): boolean {
    return this.bodyPosInitialized;
  }

  /** 上次 EXPLORE 第三人称相机位与朝向 — 用于分区切回时的镜头过渡 */
  getExploreViewState(outCamera: THREE.Vector3): { yaw: number; pitch: number; fov: number } {
    this.getInterpolatedBodyPosition(outCamera, 1);
    const cameraPitch = this.pitch + THIRD_PERSON_PITCH_BIAS;
    this.writeThirdPersonCameraPosition(outCamera, this.yaw, cameraPitch);
    const fxBlend = this.getCameraStretchFxBlendForPitch(this.pitch, this.getMoveIntensity());
    const fovBoost = CAMERA_WALK_FOV_BOOST * fxBlend;
    const push = this.getDollyPushForFovBoost(fovBoost);
    outCamera.addScaledVector(this.viewForward, push);
    return { yaw: this.yaw, pitch: cameraPitch, fov: CAMERA_BASE_FOV + fovBoost };
  }

  /** 第三人称相机世界坐标（pivot 沿视线反向后退） */
  private writeThirdPersonCameraPosition(out: THREE.Vector3, yaw: number, pitch: number) {
    this.viewForward.set(
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    );
    out.y += THIRD_PERSON_PIVOT_Y;
    out.addScaledVector(this.viewForward, -THIRD_PERSON_DISTANCE);
  }

  /** 与 intro 镜头交接：对齐 yaw/pitch 并预热相机/物理插值状态，避免首帧跳变 */
  commitIntroHandoff(yaw: number, playerPitch: number) {
    const t = this.playerBody.translation();
    this.yaw = yaw;
    this.pitch = playerPitch;
    this.yawVel = 0;
    this.pitchVel = 0;
    this.prevBodyPos.set(t.x, t.y, t.z);
    this.currBodyPos.copy(this.prevBodyPos);
    this.smoothBodyY = t.y;
    this.bodyPosInitialized = true;
    this.interpBodyPos.set(t.x, t.y, t.z);
    this.cameraPivotPos.copy(this.interpBodyPos).setY(t.y + THIRD_PERSON_PIVOT_Y);
    this.baseCameraPos.copy(this.cameraPivotPos);
    this.fxBlend = 0;
    this.smoothPitchStretch = 0;
    this.smoothFovBoost = 0;
    this.smoothPush = 0;
    this.smoothBobY = 0;
    this.bobPhase = 0;
    this.syncAvatarGroundedBaseline();
  }

  /** 对齐着地基准，避免入场/切页恢复物理时误触发落地动作 */
  private syncAvatarGroundedBaseline() {
    this.grounded = this.isGrounded();
    this.prevGroundedForAvatar = this.grounded;
    this.avatarLandPulse = false;
  }

  private syncBodyDisplayState() {
    const t = this.playerBody.translation();
    this.prevBodyPos.set(t.x, t.y, t.z);
    this.currBodyPos.copy(this.prevBodyPos);
    this.smoothBodyY = t.y;
    this.bodyPosInitialized = true;
    this.interpBodyPos.set(t.x, t.y, t.z);
    this.cameraPivotPos.copy(this.interpBodyPos).setY(t.y + THIRD_PERSON_PIVOT_Y);
    this.syncAvatarGroundedBaseline();
  }

  /** 加载/入场前预模拟落地，避免角色从半空掉下来 */
  settleSpawnPhysics(stepCount = 20) {
    for (let i = 0; i < stepCount; i += 1) {
      this.fixedUpdate();
    }
    this.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.syncBodyDisplayState();
  }

  /** 过渡终点交接：传入已含 THIRD_PERSON_PITCH_BIAS 的相机 pitch */
  commitExploreCameraHandoff(yaw: number, cameraPitch: number, hydrateStretch = false) {
    this.commitIntroHandoff(yaw, cameraPitch - THIRD_PERSON_PITCH_BIAS);
    if (!hydrateStretch) return;

    const pitchStretch = this.getPitchStretchFactorForPitch(this.pitch);
    const fxBlend = this.getCameraStretchFxBlendForPitch(this.pitch, this.getMoveIntensity());
    const fovBoost = CAMERA_WALK_FOV_BOOST * fxBlend;
    this.smoothPitchStretch = pitchStretch;
    this.fxBlend = fxBlend;
    this.smoothFovBoost = fovBoost;
    this.smoothPush = this.getDollyPushForFovBoost(fovBoost);
  }

  private attachInputListeners() {
    if (this.inputListenersAttached || this.disposed) return;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointercancel', this.onPointerCancel);
    this.domElement.addEventListener('lostpointercapture', this.onLostPointerCapture);
    this.inputListenersAttached = true;
  }

  private detachInputListeners() {
    if (!this.inputListenersAttached) return;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointercancel', this.onPointerCancel);
    this.domElement.removeEventListener('lostpointercapture', this.onLostPointerCapture);
    this.inputListenersAttached = false;
  }

  private applyLookDelta(dx: number, dy: number, dt: number) {
    if (dx === 0 && dy === 0) {
      this.yawVel = THREE.MathUtils.lerp(this.yawVel, 0, LOOK_MOMENTUM_SAMPLE);
      this.pitchVel = THREE.MathUtils.lerp(this.pitchVel, 0, LOOK_MOMENTUM_SAMPLE);
      this.clampLookVelocity();
      return;
    }

    this.lastPointerMotionMs = performance.now();

    const dyaw = -dx * MOUSE_SENSITIVITY;
    const dpitch = -dy * MOUSE_SENSITIVITY;

    const direct = LOOK_DIRECT_BLEND;
    this.yaw += dyaw * direct;
    this.pitch += dpitch * direct;
    this.clampPitch();

    const instYawVel = (dyaw * (1 - direct)) / dt;
    const instPitchVel = (dpitch * (1 - direct)) / dt;
    this.yawVel = THREE.MathUtils.lerp(this.yawVel, instYawVel, LOOK_MOMENTUM_SAMPLE);
    this.pitchVel = THREE.MathUtils.lerp(this.pitchVel, instPitchVel, LOOK_MOMENTUM_SAMPLE);
    this.clampLookVelocity();
  }

  private clampLookVelocity() {
    this.yawVel = THREE.MathUtils.clamp(this.yawVel, -LOOK_MOMENTUM_MAX, LOOK_MOMENTUM_MAX);
    this.pitchVel = THREE.MathUtils.clamp(this.pitchVel, -LOOK_MOMENTUM_MAX, LOOK_MOMENTUM_MAX);
  }

  private clampPitch() {
    this.pitch = THREE.MathUtils.clamp(this.pitch, PITCH_MIN, PITCH_MAX);
  }

  /** 仅用拖动产生的角速度积分；松手不额外注入 */
  private updateLook(delta: number) {
    this.yaw += this.yawVel * delta;
    this.pitch += this.pitchVel * delta;
    this.clampPitch();

    let decayRate = LOOK_MOMENTUM_DECAY;
    if (
      this.lookDragging &&
      performance.now() - this.lastPointerMotionMs > LOOK_STATIONARY_MS
    ) {
      decayRate *= LOOK_STATIONARY_DECAY_MULT;
    }
    const decay = Math.exp(-decayRate * delta);
    this.yawVel *= decay;
    this.pitchVel *= decay;

    if (!this.lookDragging && Math.abs(this.yawVel) < 0.00015 && Math.abs(this.pitchVel) < 0.00015) {
      this.yawVel = 0;
      this.pitchVel = 0;
    }
  }

  private endLookDrag(event: PointerEvent) {
    this.lookDragging = false;
    if (this.domElement.hasPointerCapture(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.detachInputListeners();
    this.lookDragging = false;
  }

  /** 固定 1/60s 物理步进 */
  fixedUpdate() {
    this.world.timestep = FIXED_TIMESTEP;

    this.grounded = this.isGrounded();

    if (this.grounded && !this.prevGroundedForAvatar) {
      this.avatarLandPulse = true;
    }
    this.prevGroundedForAvatar = this.grounded;

    if (this.grounded) {
      this.jumpsRemaining = MAX_JUMPS;
    }

    if (this.inputEnabled) {
      this.applyJump();
      this.applyMovement();
    }

    if (this.bodyPosInitialized) {
      this.prevBodyPos.copy(this.currBodyPos);
    }

    this.world.step();

    const t = this.playerBody.translation();
    this.currBodyPos.set(t.x, t.y, t.z);
    if (!this.bodyPosInitialized) {
      this.prevBodyPos.copy(this.currBodyPos);
      this.smoothBodyY = t.y;
      this.bodyPosInitialized = true;
    }
  }

  syncCamera(camera: THREE.PerspectiveCamera, delta: number, physicsAlpha = 1) {
    if (!this.bodyPosInitialized) {
      const t = this.playerBody.translation();
      this.interpBodyPos.set(t.x, t.y, t.z);
    } else {
      const alpha = THREE.MathUtils.clamp(physicsAlpha, 0, 1);
      const interpY = THREE.MathUtils.lerp(this.prevBodyPos.y, this.currBodyPos.y, alpha);
      const bodyYSmoothT = 1 - Math.exp(-18 * delta);
      this.smoothBodyY = THREE.MathUtils.lerp(this.smoothBodyY, interpY, bodyYSmoothT);

      this.interpBodyPos.set(
        THREE.MathUtils.lerp(this.prevBodyPos.x, this.currBodyPos.x, alpha),
        this.smoothBodyY,
        THREE.MathUtils.lerp(this.prevBodyPos.z, this.currBodyPos.z, alpha),
      );
    }

    this.cameraPivotPos.copy(this.interpBodyPos).setY(this.interpBodyPos.y + THIRD_PERSON_PIVOT_Y);
    this.baseCameraPos.copy(this.cameraPivotPos);

    this.updateLook(delta);

    const moveBlend = this.getMoveIntensity();
    const pitchTarget = this.getPitchStretchFactor();

    const pitchSmoothT = 1 - Math.exp(-CAMERA_STRETCH_PITCH_SMOOTH * delta);
    this.smoothPitchStretch = THREE.MathUtils.lerp(this.smoothPitchStretch, pitchTarget, pitchSmoothT);

    const stretchWeight = Math.max(moveBlend, this.smoothPitchStretch);
    const stretchBlend = this.getCameraStretchFxBlendForWeight(stretchWeight);

    const smoothT = 1 - Math.exp(-CAMERA_FX_SMOOTH * delta);
    this.fxBlend = THREE.MathUtils.lerp(this.fxBlend, stretchBlend, smoothT);

    const targetFovBoost = CAMERA_WALK_FOV_BOOST * this.fxBlend;

    const baseTan = Math.tan(THREE.MathUtils.degToRad(CAMERA_BASE_FOV * 0.5));
    const targetTan = Math.tan(
      THREE.MathUtils.degToRad((CAMERA_BASE_FOV + targetFovBoost) * 0.5),
    );
    const targetPush = (1 - baseTan / targetTan) * THIRD_PERSON_DISTANCE;

    this.smoothFovBoost = THREE.MathUtils.lerp(this.smoothFovBoost, targetFovBoost, smoothT);
    this.smoothPush = THREE.MathUtils.lerp(this.smoothPush, targetPush, smoothT);

    this.smoothBobY = THREE.MathUtils.lerp(this.smoothBobY, 0, smoothT);
    this.bobPhase = THREE.MathUtils.lerp(this.bobPhase, 0, smoothT);

    const cameraPitch = this.pitch + THIRD_PERSON_PITCH_BIAS;
    this.viewForward.set(
      -Math.sin(this.yaw) * Math.cos(cameraPitch),
      Math.sin(cameraPitch),
      -Math.cos(this.yaw) * Math.cos(cameraPitch),
    );

    // pivot 沿完整视线方向（含俯仰）后退；dolly 同轴前移，低头/抬头时角色保持瞄在 pivot
    camera.position
      .copy(this.cameraPivotPos)
      .addScaledVector(this.viewForward, this.smoothPush - THIRD_PERSON_DISTANCE);
    camera.position.y += this.smoothBobY;

    camera.rotation.order = 'YXZ';
    camera.rotation.y = this.yaw;
    camera.rotation.x = cameraPitch;
    camera.rotation.z = 0;

    const fov = CAMERA_BASE_FOV + this.smoothFovBoost;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  /** 行走/仰视镜头拉伸混合权（0–1），供角色视觉拉伸同步 */
  getCameraFxBlend(): number {
    return this.fxBlend;
  }

  /**
   * 仰视超过水平时的拉伸权重（0–1）。
   * pitch 为弧度：0 = 水平，正值 = 仰视。
   */
  private getPitchStretchFactor(): number {
    return this.getPitchStretchFactorForPitch(this.pitch);
  }

  private getPitchStretchFactorForPitch(playerPitch: number): number {
    const pitchAbove = playerPitch - CAMERA_PITCH_STRETCH_THRESHOLD;
    if (pitchAbove <= 0) return 0;

    const range = CAMERA_PITCH_STRETCH_MAX - CAMERA_PITCH_STRETCH_THRESHOLD;
    if (range <= 0) return 1;

    const linear = pitchAbove / range;
    const eased = linear * linear * (3 - 2 * linear);
    return THREE.MathUtils.clamp(eased, 0, 1);
  }

  private getCameraStretchFxBlendForPitch(playerPitch: number, moveBlend = 0): number {
    const stretchWeight = Math.max(moveBlend, this.getPitchStretchFactorForPitch(playerPitch));
    return this.getCameraStretchFxBlendForWeight(stretchWeight);
  }

  private getCameraStretchFxBlendForWeight(stretchWeight: number): number {
    const easedBlend = stretchWeight * stretchWeight * (3 - 2 * stretchWeight);
    return Math.pow(easedBlend, CAMERA_STRETCH_CONTRAST);
  }

  private getDollyPushForFovBoost(fovBoost: number): number {
    if (fovBoost <= 0) return 0;
    const baseTan = Math.tan(THREE.MathUtils.degToRad(CAMERA_BASE_FOV * 0.5));
    const targetTan = Math.tan(
      THREE.MathUtils.degToRad((CAMERA_BASE_FOV + fovBoost) * 0.5),
    );
    return (1 - baseTan / targetTan) * THIRD_PERSON_DISTANCE;
  }

  /** 按住移动键时立即给一点拉伸权重，避免刚起步速度未上来时无反馈 */
  private getMoveInputBlend(): number {
    if (!this.inputEnabled) return 0;
    const moving =
      this.keys.has('KeyW') ||
      this.keys.has('KeyA') ||
      this.keys.has('KeyS') ||
      this.keys.has('KeyD');
    return moving ? 0.72 : 0;
  }

  /** 根据水平移动速度计算镜头拉伸强度（前后与左右平移一致） */
  private getMoveIntensity(): number {
    const v = this.playerBody.linvel();
    this.horizontalVel.set(v.x, 0, v.z);
    const horizontalSpeed = this.horizontalVel.length();

    let speedBlend = 0;
    if (horizontalSpeed >= 0.08) {
      speedBlend = THREE.MathUtils.clamp(horizontalSpeed / MOVE_SPEED, 0, 1);
    }

    return Math.max(speedBlend, this.getMoveInputBlend());
  }

  isLookDragging() {
    return this.lookDragging;
  }

  /** 与相机 syncCamera 一致的显示位置（含 smoothBodyY），避免角色卡顿/抖动 */
  getDisplayBodyPosition(out: THREE.Vector3, physicsAlpha = 1) {
    if (!this.bodyPosInitialized) {
      const t = this.playerBody.translation();
      out.set(t.x, t.y, t.z);
      return out;
    }
    const alpha = THREE.MathUtils.clamp(physicsAlpha, 0, 1);
    out.set(
      THREE.MathUtils.lerp(this.prevBodyPos.x, this.currBodyPos.x, alpha),
      this.smoothBodyY,
      THREE.MathUtils.lerp(this.prevBodyPos.z, this.currBodyPos.z, alpha),
    );
    return out;
  }

  /** 插值后的刚体中心位置，供可视角色层跟随 */
  getInterpolatedBodyPosition(out: THREE.Vector3, physicsAlpha = 1) {
    if (!this.bodyPosInitialized) {
      const t = this.playerBody.translation();
      out.set(t.x, t.y, t.z);
      return out;
    }
    const alpha = THREE.MathUtils.clamp(physicsAlpha, 0, 1);
    out.set(
      THREE.MathUtils.lerp(this.prevBodyPos.x, this.currBodyPos.x, alpha),
      THREE.MathUtils.lerp(this.prevBodyPos.y, this.currBodyPos.y, alpha),
      THREE.MathUtils.lerp(this.prevBodyPos.z, this.currBodyPos.z, alpha),
    );
    return out;
  }

  hasMoveInput(): boolean {
    if (!this.inputEnabled) return false;
    return (
      this.keys.has('KeyW') ||
      this.keys.has('KeyA') ||
      this.keys.has('KeyS') ||
      this.keys.has('KeyD')
    );
  }

  isPlayerGrounded(): boolean {
    return this.grounded;
  }

  getLookYaw(): number {
    return this.yaw;
  }

  getVerticalVelocity(): number {
    return this.playerBody.linvel().y;
  }

  getHorizontalVelocity(out: THREE.Vector3) {
    const v = this.playerBody.linvel();
    return out.set(v.x, 0, v.z);
  }

  getHorizontalSpeed(): number {
    this.getHorizontalVelocity(this.horizontalVel);
    return this.horizontalVel.length();
  }

  /** WASD 输入对应的水平移动方向（归一化），无输入时返回 false */
  getWishDirectionHorizontal(out: THREE.Vector3): boolean {
    if (!this.hasMoveInput()) return false;

    let inputX = 0;
    let inputZ = 0;
    if (this.keys.has('KeyW')) inputZ += 1;
    if (this.keys.has('KeyS')) inputZ -= 1;
    if (this.keys.has('KeyA')) inputX -= 1;
    if (this.keys.has('KeyD')) inputX += 1;

    const inputLen = Math.hypot(inputX, inputZ);
    if (inputLen === 0) return false;

    inputX /= inputLen;
    inputZ /= inputLen;

    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.crossVectors(this.forward, this.up).normalize();
    return out
      .copy(this.forward)
      .multiplyScalar(inputZ)
      .addScaledVector(this.right, inputX)
      .normalize()
      .lengthSq() > 0;
  }

  /** 读取并清零单帧视觉脉冲（起跳 / 二段跳 / 落地） */
  consumeAvatarPulses() {
    const pulses = {
      jump: this.avatarJumpPulse,
      doubleJump: this.avatarDoubleJumpPulse,
      land: this.avatarLandPulse,
    };
    this.avatarJumpPulse = false;
    this.avatarDoubleJumpPulse = false;
    this.avatarLandPulse = false;
    return pulses;
  }

  private applyMovement() {
    const onGround = this.grounded;

    let inputX = 0;
    let inputZ = 0;
    if (this.keys.has('KeyW')) inputZ += 1;
    if (this.keys.has('KeyS')) inputZ -= 1;
    if (this.keys.has('KeyA')) inputX -= 1;
    if (this.keys.has('KeyD')) inputX += 1;

    const current = this.playerBody.linvel();
    const inputLen = Math.hypot(inputX, inputZ);

    if (inputLen === 0) {
      if (onGround) {
        const damp = Math.max(0, 1 - GROUND_FRICTION * FIXED_TIMESTEP);
        this.playerBody.setLinvel(
          { x: current.x * damp, y: current.y, z: current.z * damp },
          true,
        );
      }
      return;
    }

    inputX /= inputLen;
    inputZ /= inputLen;

    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.crossVectors(this.forward, this.up).normalize();
    this.wishDir
      .copy(this.forward)
      .multiplyScalar(inputZ)
      .addScaledVector(this.right, inputX)
      .normalize();

    const targetX = this.wishDir.x * MOVE_SPEED;
    const targetZ = this.wishDir.z * MOVE_SPEED;
    const accel = onGround ? GROUND_ACCEL : AIR_ACCEL;
    const t = Math.min(1, accel * FIXED_TIMESTEP);

    this.playerBody.setLinvel(
      {
        x: THREE.MathUtils.lerp(current.x, targetX, t),
        y: current.y,
        z: THREE.MathUtils.lerp(current.z, targetZ, t),
      },
      true,
    );
  }

  private applyJump() {
    if (!this.jumpQueued) return;
    this.jumpQueued = false;

    if (this.jumpsRemaining <= 0) return;

    const current = this.playerBody.linvel();
    const isFirstJump = this.grounded;
    const jumpVy = isFirstJump ? JUMP_VELOCITY : AIR_JUMP_VELOCITY;

    this.playerBody.setLinvel({ x: current.x, y: jumpVy, z: current.z }, true);
    this.jumpsRemaining -= 1;

    if (isFirstJump) {
      this.avatarJumpPulse = true;
      playCyberJumpSound();
    } else {
      this.avatarDoubleJumpPulse = true;
      playCyberDoubleJumpSound();
    }
  }

  private isGrounded(): boolean {
    const current = this.playerBody.linvel();
    if (current.y > GROUNDED_VY_THRESHOLD) return false;

    const t = this.playerBody.translation();
    const ray = new RAPIER.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 });
    const maxToi = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS + 0.08;
    const hit = this.world.castRay(
      ray,
      maxToi,
      true,
      undefined,
      undefined,
      this.playerCollider,
      this.playerBody,
    );
    return hit !== null;
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  }
}

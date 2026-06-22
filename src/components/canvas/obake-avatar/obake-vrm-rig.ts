import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { VRMHumanBoneName } from '@pixiv/three-vrm';
import {
  ghostRunConfig,
  ghostRunToggles,
  OBAKE_MOTION,
  type ObakeArmMotionInput,
} from '@/components/canvas/obake-avatar/obake-motion-profile';

export type ObakeClothMotionInput = {
  horizontalVelocity: THREE.Vector3;
  horizontalAcceleration: THREE.Vector3;
  runPhase: number;
  speedRatio: number;
  runBlend: number;
  turnLean: number;
};

type CachedBone = {
  node: THREE.Object3D;
  restQuaternion: THREE.Quaternion;
  restPosition: THREE.Vector3;
};

type ManualClothBone = {
  node: THREE.Object3D;
  side: number;
  depth: number;
  restQuaternion: THREE.Quaternion;
  angleX: number;
  angleZ: number;
  velocityX: number;
  velocityZ: number;
};

type RigCache = {
  bones: Map<VRMHumanBoneName, CachedBone>;
  clothBones: ManualClothBone[];
};

const rigCache = new WeakMap<VRM, RigCache>();
const _euler = new THREE.Euler(0, 0, 0, 'XYZ');
const _quat = new THREE.Quaternion();

export const ENABLE_OBAKE_CLOTH_MOTION = ghostRunToggles.enableClothMotion;

const ADDITIVE_BONES = [
  VRMHumanBoneName.Hips,
  VRMHumanBoneName.Spine,
  VRMHumanBoneName.Chest,
  VRMHumanBoneName.Head,
  VRMHumanBoneName.LeftShoulder,
  VRMHumanBoneName.RightShoulder,
  VRMHumanBoneName.LeftUpperArm,
  VRMHumanBoneName.RightUpperArm,
  VRMHumanBoneName.LeftLowerArm,
  VRMHumanBoneName.RightLowerArm,
  VRMHumanBoneName.LeftHand,
  VRMHumanBoneName.RightHand,
  VRMHumanBoneName.LeftUpperLeg,
  VRMHumanBoneName.RightUpperLeg,
  VRMHumanBoneName.LeftLowerLeg,
  VRMHumanBoneName.RightLowerLeg,
  VRMHumanBoneName.LeftFoot,
  VRMHumanBoneName.RightFoot,
] as const;

const CLOTH_RE = /^cloth(006|004|003|005|001|002)(?:\.(\d+))?_([LR])$/;
const CLOTH_ORDER = new Map([
  ['006', 0],
  ['004', 1],
  ['003', 2],
  ['005', 3],
  ['001', 4],
  ['002', 5],
]);

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function smoothstep01(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function smootherstep01(value: number) {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function easeForwardArmSwingEndpoint(value: number) {
  const amount = clamp01(value);
  const exponent = Math.max(1, ghostRunConfig.sprintArmEndpointEase);
  return 1 - Math.pow(1 - amount, exponent);
}

function holdForwardArmWave(value: number) {
  if (value <= 0) return value;
  const start = ghostRunConfig.sprintArmFrontHoldStart;
  const holdT = smootherstep01((value - start) / Math.max(0.0001, 1 - start));
  const held = 1 - (1 - value) * (1 - ghostRunConfig.sprintArmFrontHoldStrength * holdT);
  return THREE.MathUtils.clamp(held, 0, 1);
}

function shapeArmSwingWave(value: number) {
  const forwardBias = THREE.MathUtils.clamp(ghostRunConfig.sprintArmForwardBias, 0, 0.45);
  if (value <= -forwardBias) {
    return (value + forwardBias) / (1 - forwardBias);
  }
  const forwardValue = (value + forwardBias) / (1 + forwardBias);
  return holdForwardArmWave(easeForwardArmSwingEndpoint(forwardValue));
}

function cacheRig(vrm: VRM): RigCache {
  const cached = rigCache.get(vrm);
  if (cached) return cached;

  const bones = new Map<VRMHumanBoneName, CachedBone>();
  for (const name of ADDITIVE_BONES) {
    const node = vrm.humanoid.getNormalizedBoneNode(name);
    if (!node) continue;
    bones.set(name, {
      node,
      restQuaternion: node.quaternion.clone(),
      restPosition: node.position.clone(),
    });
  }

  const clothBones: ManualClothBone[] = [];
  vrm.scene.traverse((obj) => {
    const match = obj.name.match(CLOTH_RE);
    if (!match) return;
    const order = CLOTH_ORDER.get(match[1] ?? '') ?? 0;
    const segment = Number(match[2] ?? 0);
    clothBones.push({
      node: obj,
      side: match[3] === 'L' ? -1 : 1,
      depth: THREE.MathUtils.clamp((order + segment * 0.35) / 5.8, 0, 1),
      restQuaternion: obj.quaternion.clone(),
      angleX: 0,
      angleZ: 0,
      velocityX: 0,
      velocityZ: 0,
    });
  });

  const next = { bones, clothBones };
  rigCache.set(vrm, next);
  return next;
}

function resetAdditiveBones(cache: RigCache) {
  for (const bone of cache.bones.values()) {
    bone.node.position.copy(bone.restPosition);
    bone.node.quaternion.copy(bone.restQuaternion);
  }
}

function applyBoneEuler(
  cache: RigCache,
  name: VRMHumanBoneName,
  x: number,
  y: number,
  z: number,
) {
  const bone = cache.bones.get(name);
  if (!bone) return;
  _quat.setFromEuler(_euler.set(x, y, z, 'XYZ'));
  bone.node.quaternion.copy(bone.restQuaternion).multiply(_quat);
}

function applyBonePositionOffset(
  cache: RigCache,
  name: VRMHumanBoneName,
  x: number,
  y: number,
  z: number,
) {
  const bone = cache.bones.get(name);
  if (!bone) return;
  bone.node.position.set(
    bone.restPosition.x + x,
    bone.restPosition.y + y,
    bone.restPosition.z + z,
  );
}

function dampSpring(
  value: number,
  velocity: number,
  target: number,
  delta: number,
  spring: number,
  damping: number,
) {
  const nextVelocity =
    (velocity + (target - value) * spring * spring * delta) * Math.exp(-damping * delta);
  return {
    value: value + nextVelocity * delta,
    velocity: nextVelocity,
  };
}

function applyManualCloth(vrm: VRM, delta: number, input?: ObakeClothMotionInput) {
  const cache = cacheRig(vrm);
  if (cache.clothBones.length === 0) return;

  const speedRatio = clamp01(input?.speedRatio ?? 0);
  const runBlend = clamp01(input?.runBlend ?? 0);
  const runPhase = input?.runPhase ?? 0;
  const turnLean = THREE.MathUtils.clamp(
    (input?.turnLean ?? 0) / Math.max(ghostRunConfig.turnLeanAmp, 0.0001),
    -1,
    1,
  );
  const acceleration = THREE.MathUtils.clamp(
    (input?.horizontalAcceleration.length() ?? 0) / 24,
    0,
    1,
  );
  const stopRebound = (1 - runBlend) * acceleration;
  const baseAmp = ghostRunConfig.clothLagAmp * (0.35 + speedRatio * 0.65);

  for (const cloth of cache.clothBones) {
    const depthAmp = 0.45 + cloth.depth * 0.75;
    const sidePhase = runPhase + cloth.side * Math.PI * 0.38 + cloth.depth * 0.55;
    const runLag = Math.sin(sidePhase - Math.PI * 0.22) * 0.34 * runBlend;
    const sideLag =
      turnLean * ghostRunConfig.clothTurnDrag +
      Math.sin(sidePhase) * 0.18 * runBlend * cloth.side;
    const targetX = THREE.MathUtils.clamp(
      baseAmp * depthAmp * (-0.32 * speedRatio + runLag + stopRebound * 0.18),
      -0.16,
      0.16,
    );
    const targetZ = THREE.MathUtils.clamp(
      baseAmp * depthAmp * sideLag,
      -0.16,
      0.16,
    );
    const nextX = dampSpring(
      cloth.angleX,
      cloth.velocityX,
      targetX,
      delta,
      ghostRunConfig.clothSpring,
      ghostRunConfig.clothDamping,
    );
    const nextZ = dampSpring(
      cloth.angleZ,
      cloth.velocityZ,
      targetZ,
      delta,
      ghostRunConfig.clothSpring,
      ghostRunConfig.clothDamping,
    );
    cloth.angleX = nextX.value;
    cloth.velocityX = nextX.velocity;
    cloth.angleZ = nextZ.value;
    cloth.velocityZ = nextZ.velocity;
    _quat.setFromEuler(_euler.set(cloth.angleX, 0, cloth.angleZ, 'XYZ'));
    cloth.node.quaternion.copy(cloth.restQuaternion).multiply(_quat);
  }
}

function resetManualClothToRest(vrm: VRM) {
  const cache = cacheRig(vrm);
  for (const cloth of cache.clothBones) {
    cloth.angleX = 0;
    cloth.angleZ = 0;
    cloth.velocityX = 0;
    cloth.velocityZ = 0;
    cloth.node.quaternion.copy(cloth.restQuaternion);
  }
}

export function stabilizeObakeVrm(vrm: VRM) {
  if (vrm.lookAt) {
    vrm.lookAt.autoUpdate = false;
    vrm.lookAt.target = null;
    vrm.lookAt.reset();
  }

  const em = vrm.expressionManager;
  if (em) {
    for (const expr of em.expressions) {
      em.setValue(expr.expressionName, 0);
    }
    em.update();
  }

  vrm.springBoneManager?.setInitState();
}

export function applyObakeHumanoidPose(
  vrm: VRM,
  motion: ObakeArmMotionInput = { time: 0, moveStrength: 0, airborne: false },
) {
  const cache = cacheRig(vrm);
  resetAdditiveBones(cache);

  const a = OBAKE_MOTION.armsDown;
  const jump = clamp01(motion.jumpStrength ?? 0);
  const doubleJump = clamp01(motion.doubleJumpStrength ?? 0);
  const flipPhase = clamp01(motion.flipPhase ?? 0);
  const airborne = clamp01(motion.airborneStrength ?? (motion.airborne ? 1 : 0)) * (1 - doubleJump * 0.45);
  const run = clamp01(motion.moveStrength) * (motion.airborne ? 0.35 : 1);
  const speedRatio = clamp01(motion.speedRatio ?? run);
  const phase = motion.runPhase ?? motion.time * Math.PI * 2 * OBAKE_MOTION.armSwingHz;
  const armPhase = phase + ghostRunConfig.runPhaseOffset;
  const torsoRun = ghostRunToggles.enableTorsoMotion ? run : 0;
  const armRun = ghostRunToggles.enableArmSwing ? run : 0;
  const sprintStrength = speedRatio * torsoRun;
  const twistWave = Math.sin(phase - Math.PI * 0.1) * sprintStrength;
  const armWave = Math.sin(armPhase);
  const tuck = doubleJump * Math.sin(flipPhase * Math.PI);
  const airPhase = motion.time * Math.PI * 2 * ghostRunConfig.airborneTwistHz;
  const airWave = Math.sin(airPhase) * airborne;
  const airCounterWave = Math.sin(airPhase + Math.PI * 0.5) * airborne;
  const rootLean = clamp01(motion.rootLean ?? 0);
  const rootRoll = 0;

  const chestYaw = THREE.MathUtils.clamp(twistWave * ghostRunConfig.chestYawAmp + airWave * 0.006, -0.26, 0.26);
  const spineYaw = THREE.MathUtils.clamp(twistWave * ghostRunConfig.sprintSpineTwistAmp, -0.16, 0.16);
  const hipsYaw = THREE.MathUtils.clamp(twistWave * ghostRunConfig.sprintHipTwistAmp, -0.09, 0.09);
  const headFollowYaw = THREE.MathUtils.clamp(
    chestYaw * ghostRunConfig.sprintHeadFollowTwist,
    -0.095,
    0.095,
  );
  const chestRoll = THREE.MathUtils.clamp(
    airCounterWave * 0.008,
    -0.015,
    0.015,
  );
  const chestPitch =
    rootLean * ghostRunConfig.chestPitchFollow +
    OBAKE_MOTION.jumpChestCurlX * jump +
    OBAKE_MOTION.doubleJumpChestCurlX * tuck;
  const hipCounterRoll = -rootRoll * 0.32;
  const hipCounterX = OBAKE_MOTION.doubleJumpHipCounterX * tuck;

  applyBoneEuler(cache, VRMHumanBoneName.Hips, hipCounterX, hipsYaw, hipCounterRoll);
  applyBoneEuler(
    cache,
    VRMHumanBoneName.Spine,
    chestPitch * 0.38,
    spineYaw,
    chestRoll * 0.45,
  );
  applyBoneEuler(cache, VRMHumanBoneName.Chest, chestPitch * 0.62, chestYaw, chestRoll);
  applyBoneEuler(
    cache,
    VRMHumanBoneName.Head,
    -chestPitch * 0.22,
    headFollowYaw,
    0,
  );

  const armStrength = armRun * (0.45 + speedRatio * 0.55);
  const leftArmWave = shapeArmSwingWave(armWave);
  const rightArmWave = shapeArmSwingWave(-armWave);
  const leftForward = Math.max(0, leftArmWave) * armStrength;
  const leftBack = Math.max(0, -leftArmWave) * armStrength;
  const rightForward = Math.max(0, rightArmWave) * armStrength;
  const rightBack = Math.max(0, -rightArmWave) * armStrength;
  const leftGather = smoothstep01((leftArmWave - 0.38) / 0.62) * armStrength;
  const rightGather = smoothstep01((rightArmWave - 0.38) / 0.62) * armStrength;
  const leftUpperArmX =
    a.upperArmX -
    leftForward * ghostRunConfig.sprintArmForwardAmp +
    leftBack * ghostRunConfig.sprintArmBackwardAmp;
  const rightUpperArmX =
    a.upperArmX -
    rightForward * ghostRunConfig.sprintArmForwardAmp +
    rightBack * ghostRunConfig.sprintArmBackwardAmp;
  const leftShoulderPump =
    leftForward * ghostRunConfig.sprintShoulderForwardAmp -
    leftBack * ghostRunConfig.sprintShoulderBackwardAmp;
  const rightShoulderPump =
    rightForward * ghostRunConfig.sprintShoulderForwardAmp -
    rightBack * ghostRunConfig.sprintShoulderBackwardAmp;
  const leftShoulderLead =
    leftForward * ghostRunConfig.sprintShoulderLeadForwardAmp +
    leftGather * ghostRunConfig.sprintShoulderLeadGatherAmp;
  const rightShoulderLead =
    rightForward * ghostRunConfig.sprintShoulderLeadForwardAmp +
    rightGather * ghostRunConfig.sprintShoulderLeadGatherAmp;
  const leftShoulderReachZ =
    leftForward * ghostRunConfig.sprintShoulderReachForward -
    leftBack * ghostRunConfig.sprintShoulderReachBackward +
    leftGather * ghostRunConfig.sprintShoulderReachForward * 0.35;
  const rightShoulderReachZ =
    rightForward * ghostRunConfig.sprintShoulderReachForward -
    rightBack * ghostRunConfig.sprintShoulderReachBackward +
    rightGather * ghostRunConfig.sprintShoulderReachForward * 0.35;
  const leftShoulderLiftY =
    (leftForward + leftGather * 0.45) * ghostRunConfig.sprintShoulderReachLift;
  const rightShoulderLiftY =
    (rightForward + rightGather * 0.45) * ghostRunConfig.sprintShoulderReachLift;
  const jumpArmLiftX = OBAKE_MOTION.jumpArmLiftX * jump;
  const jumpArmOpenZ = OBAKE_MOTION.jumpArmOpenZ * jump;
  const airArmLiftX = OBAKE_MOTION.airborneArmLiftX * 0.72 * airborne;
  const airArmOpenZ = OBAKE_MOTION.airborneArmOpenZ * 0.55 * airCounterWave;
  const airLowerArmCurlX = OBAKE_MOTION.airborneLowerArmCurlX * 0.75 * (0.55 + Math.abs(airWave) * 0.45);
  const tuckArmX = OBAKE_MOTION.doubleJumpArmTuckX * tuck;
  const tuckArmZ = OBAKE_MOTION.doubleJumpArmTuckZ * tuck;
  const tuckLowerArmX = OBAKE_MOTION.doubleJumpLowerArmCurlX * tuck;
  const runLowerArmBend = ghostRunConfig.lowerArmBend * armRun;
  const forearmCurveY = ghostRunConfig.sprintForearmCurveY * armRun;
  const leftElbowSwingBend = (leftForward + leftBack) * ghostRunConfig.sprintElbowSwingBend;
  const rightElbowSwingBend = (rightForward + rightBack) * ghostRunConfig.sprintElbowSwingBend;
  const leftForearmInward =
    forearmCurveY +
    leftForward * ghostRunConfig.armInwardAmp * 0.75 +
    leftGather * ghostRunConfig.sprintArmChestGatherY * 0.55;
  const rightForearmInward =
    forearmCurveY +
    rightForward * ghostRunConfig.armInwardAmp * 0.75 +
    rightGather * ghostRunConfig.sprintArmChestGatherY * 0.55;

  applyBoneEuler(
    cache,
    VRMHumanBoneName.LeftShoulder,
    leftShoulderPump + leftShoulderLead + jump * 0.08 + Math.max(0, -airWave) * 0.08,
    -(
      leftForward * ghostRunConfig.armInwardAmp +
      leftGather * ghostRunConfig.sprintArmChestGatherY +
      leftShoulderLead * 0.28
    ),
    leftForward * 0.065 +
      leftShoulderLead * ghostRunConfig.sprintShoulderRollForwardAmp +
      leftGather * ghostRunConfig.sprintArmChestGatherZ -
      leftBack * 0.025 -
      jumpArmOpenZ * 0.35 -
      airArmOpenZ,
  );
  applyBonePositionOffset(
    cache,
    VRMHumanBoneName.LeftShoulder,
    0,
    leftShoulderLiftY,
    leftShoulderReachZ,
  );
  applyBoneEuler(
    cache,
    VRMHumanBoneName.RightShoulder,
    rightShoulderPump + rightShoulderLead + jump * 0.08 + Math.max(0, airWave) * 0.08,
    rightForward * ghostRunConfig.armInwardAmp +
      rightGather * ghostRunConfig.sprintArmChestGatherY +
      rightShoulderLead * 0.28,
    -rightForward * 0.065 -
      rightShoulderLead * ghostRunConfig.sprintShoulderRollForwardAmp -
      rightGather * ghostRunConfig.sprintArmChestGatherZ +
      rightBack * 0.025 +
      jumpArmOpenZ * 0.35 +
      airArmOpenZ,
  );
  applyBonePositionOffset(
    cache,
    VRMHumanBoneName.RightShoulder,
    0,
    rightShoulderLiftY,
    rightShoulderReachZ,
  );
  applyBoneEuler(
    cache,
    VRMHumanBoneName.LeftUpperArm,
    leftUpperArmX -
      leftShoulderLead * ghostRunConfig.sprintShoulderUpperArmFollow +
      jumpArmLiftX +
      tuckArmX +
      airArmLiftX,
    -(leftForward * ghostRunConfig.armInwardAmp + leftGather * ghostRunConfig.sprintArmChestGatherY),
    -a.upperArmZ +
      leftBack * 0.06 +
      leftForward * 0.1 +
      leftGather * ghostRunConfig.sprintArmChestGatherZ +
      jumpArmOpenZ +
      tuckArmZ +
      airArmOpenZ,
  );
  applyBoneEuler(
    cache,
    VRMHumanBoneName.RightUpperArm,
    rightUpperArmX -
      rightShoulderLead * ghostRunConfig.sprintShoulderUpperArmFollow +
      jumpArmLiftX +
      tuckArmX +
      airArmLiftX,
    rightForward * ghostRunConfig.armInwardAmp + rightGather * ghostRunConfig.sprintArmChestGatherY,
    a.upperArmZ -
      rightBack * 0.06 -
      rightForward * 0.1 -
      rightGather * ghostRunConfig.sprintArmChestGatherZ -
      jumpArmOpenZ -
      tuckArmZ +
      airArmOpenZ,
  );
  applyBoneEuler(
    cache,
    VRMHumanBoneName.LeftLowerArm,
    a.lowerArmX +
      runLowerArmBend -
      leftElbowSwingBend -
      leftForward * Math.abs(ghostRunConfig.sprintLowerArmExtraBend) -
      leftGather * ghostRunConfig.sprintArmChestGatherCurl -
      OBAKE_MOTION.jumpLowerArmCurlX * jump +
      tuckLowerArmX +
      airLowerArmCurlX,
    -leftForearmInward,
    0,
  );
  applyBoneEuler(
    cache,
    VRMHumanBoneName.RightLowerArm,
    a.lowerArmX +
      runLowerArmBend -
      rightElbowSwingBend -
      rightForward * Math.abs(ghostRunConfig.sprintLowerArmExtraBend) -
      rightGather * ghostRunConfig.sprintArmChestGatherCurl -
      OBAKE_MOTION.jumpLowerArmCurlX * jump +
      tuckLowerArmX +
      airLowerArmCurlX,
    rightForearmInward,
    0,
  );
  applyBoneEuler(
    cache,
    VRMHumanBoneName.LeftHand,
    -leftGather * 0.08,
    -leftForearmInward * 0.55,
    0,
  );
  applyBoneEuler(
    cache,
    VRMHumanBoneName.RightHand,
    -rightGather * 0.08,
    rightForearmInward * 0.55,
    0,
  );

  const legTuckX = OBAKE_MOTION.doubleJumpLegTuckX * tuck;
  const kneeCurlX = OBAKE_MOTION.doubleJumpKneeCurlX * tuck;
  const footCurlX = OBAKE_MOTION.doubleJumpFootCurlX * tuck;
  const legWave = Math.sin(phase + Math.PI * 0.5) * torsoRun * speedRatio;
  const subtleRunLeg = legWave * ghostRunConfig.sprintLegAmp;
  const subtleRunKnee = Math.abs(legWave) * 0.045;
  const airLegDrift = OBAKE_MOTION.airborneLegDriftX * 0.7 * (0.5 + airCounterWave * 0.5);
  const airKneeDrift = OBAKE_MOTION.airborneKneeDriftX * 0.7 * (0.5 + Math.abs(airWave) * 0.5);

  applyBoneEuler(cache, VRMHumanBoneName.LeftUpperLeg, legTuckX + airLegDrift - subtleRunLeg, 0, 0.035 * tuck);
  applyBoneEuler(cache, VRMHumanBoneName.RightUpperLeg, legTuckX + airLegDrift + subtleRunLeg, 0, -0.035 * tuck);
  applyBoneEuler(cache, VRMHumanBoneName.LeftLowerLeg, kneeCurlX + airKneeDrift + subtleRunKnee, 0, 0);
  applyBoneEuler(cache, VRMHumanBoneName.RightLowerLeg, kneeCurlX + airKneeDrift + subtleRunKnee, 0, 0);
  applyBoneEuler(cache, VRMHumanBoneName.LeftFoot, footCurlX - subtleRunLeg * 0.35, 0, 0);
  applyBoneEuler(cache, VRMHumanBoneName.RightFoot, footCurlX + subtleRunLeg * 0.35, 0, 0);
}

export function updateObakeVrm(vrm: VRM, delta: number, clothMotion?: ObakeClothMotionInput) {
  vrm.humanoid.update();
  vrm.expressionManager?.update();
  vrm.nodeConstraintManager?.update();

  if (!ENABLE_OBAKE_CLOTH_MOTION) {
    resetManualClothToRest(vrm);
    return;
  }

  const animDt = THREE.MathUtils.clamp(delta, 1 / 120, 1 / 30);
  const spring = vrm.springBoneManager;
  if (spring && spring.joints.size > 0) {
    spring.update(animDt);
    return;
  }

  applyManualCloth(vrm, animDt, clothMotion);
}

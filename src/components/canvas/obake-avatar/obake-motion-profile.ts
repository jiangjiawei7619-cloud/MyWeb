/**
 * 参考录屏 20260617-0621：站立直立；移动时适度前倾 + 左右侧身摆动。
 */
export const OBAKE_MOTION = {
  /** 待机手臂自然下垂（VRM normalized，相对 T-pose） */
  armsDown: {
    /** 上臂绕 Z 放下（左 -Z、右 +Z，正 Z 会举手） */
    upperArmZ: 1.52,
    /** 下垂姿态轻微朝前 */
    upperArmX: 0.05,
    /** 前臂微弯朝前下（负 X = 肘部向前弯，勿用正 X 举手） */
    lowerArmX: -0.14,
  },
  /** 行走摆臂：绕 X 在下垂姿态前后甩 */
  armSwingAmp: 0.45,
  armBackSwingBoost: 1.25,
  armForwardSwingBoost: 1.45,
  shoulderSwingFollow: 0.32,
  armBackOpenZ: 0.14,
  armSwingHz: 2.6,
  /** 摆臂时前臂跟随弯曲 */
  lowerArmSwingFollow: 0.2,
  lowerArmBackFollow: 0.16,
  runLowerArmBendX: -0.38,
  runForwardLowerArmCurlX: -0.22,
  runArmForwardGatherY: 0.18,
  runArmForwardGatherZ: 0.2,
  runChestTwistY: -0.2,
  runChestRollZ: 0.02,
  runHipPitchX: 0.08,
  runHipCounterTwistY: 0.025,
  runHipCounterRollZ: -0.02,
  runShoulderPumpX: 0.06,
  runShoulderForwardY: 0.14,
  runShoulderForwardZ: 0.12,
  armSwingSmooth: 14,
  /** 满速前倾（弧度，≈25°） */
  moveLeanMax: 0.44,
  moveLeanStart: 0.1,
  /** 跑动左右侧身（绕垂直轴 yaw，弧度） */
  sideSwayAmp: 0.11,
  sideSwayHz: 2.6,
  tiltSmooth: 12,
  airborneLean: 0.288,
  jumpLean: 0.288,
  fallLean: 0.288,
  airbornePoseHz: 1.05 * 0.8 * 0.85,
  airborneBodyLeanAmp: 0.018,
  airborneBodyYawAmp: 0.16,
  airborneBodyRollAmp: 0.13,
  airborneArmSwingAmp: 0.38,
  airborneArmLiftX: -0.5,
  airborneArmOpenZ: 0.24,
  airborneLowerArmCurlX: -0.28,
  airborneChestTwistY: 0.24,
  airborneChestRollZ: 0.14,
  airborneHipPitchX: -0.065,
  airborneHipCounterY: 0.09,
  airborneHipCounterZ: -0.12,
  airborneShoulderPumpX: 0.16,
  airborneShoulderSwayY: 0.12,
  airborneHandCurlX: -0.12,
  airborneHandRollZ: 0.11,
  airborneLegDriftX: -0.16,
  airborneLegOpenZ: 0.13,
  airborneKneeDriftX: 0.22,
  airborneFootCurlX: -0.16,
  airborneFootRollZ: 0.08,
  takeoffDuration: 0.18,
  takeoffAirborneStart: 0.42,
  takeoffRunArmCarry: 0.82,
  landDuration: 0.32,
  landLean: 0.2,
  landDipY: 0.065,
  landSquashY: 0.1,
  landSpreadX: 0.045,
  landSpreadZ: 0.035,
  landReboundY: 0.024,
  landChestCurlX: 0.12,
  landArmSettleX: -0.14,
  landLowerArmCurlX: -0.12,
  jumpArmLiftX: -0.56,
  jumpArmOpenZ: 0.28,
  jumpLowerArmCurlX: -0.28,
  jumpChestCurlX: 0.08,
  doubleJumpArmTuckX: -0.82,
  doubleJumpArmTuckZ: 0.52,
  doubleJumpLowerArmCurlX: -0.78,
  doubleJumpLegTuckX: -0.42,
  doubleJumpKneeCurlX: 0.72,
  doubleJumpFootCurlX: -0.22,
  doubleJumpChestCurlX: 0.26,
  doubleJumpHipCounterX: -0.14,
  cameraStretchSurge: 0,
  cameraStretchForward: 0,
  cameraStretchSquash: 0,
  cameraStretchWidth: 0,
} as const;

export type ObakeArmMotionInput = {
  time: number;
  moveStrength: number;
  airborne: boolean;
  runPhase?: number;
  airbornePhase?: number;
  speedRatio?: number;
  rootLean?: number;
  rootRoll?: number;
  turnLean?: number;
  jumpStrength?: number;
  doubleJumpStrength?: number;
  flipPhase?: number;
  airborneStrength?: number;
  landStrength?: number;
};

export const ghostRunToggles = {
  enableGhostRunV2: true,
  enableRootBob: false,
  enableRootPitch: true,
  enableTinyRoll: false,
  enableArmSwing: true,
  enableTorsoMotion: true,
  enableClothMotion: false,
} as const;

const RUN_BODY_GROUND_ANGLE_DEG = 63;
const RUN_BODY_PITCH_FROM_UPRIGHT =
  Math.PI / 2 - (RUN_BODY_GROUND_ANGLE_DEG * Math.PI) / 180;

export const ghostRunConfig = {
  rootLean: { min: RUN_BODY_PITCH_FROM_UPRIGHT, max: RUN_BODY_PITCH_FROM_UPRIGHT },
  bobAmp: { min: 0, max: 0.006 },
  squashAmp: 0,
  stretchAmp: 0,
  rollAmp: 0.008,
  chestYawAmp: 0.26,
  armSwingAmp: 0.34,
  clothLagAmp: 0.11,
  clothSpring: 11,
  turnLeanAmp: 0,
  speedSmooth: 8.5,
  blendSmooth: 7,
  facingTurnSpeed: 12,
  phaseSpeedMin: 6.5,
  phaseSpeedMax: 14.75,
  phasePerMeter: 5.2,
  minPhaseSpeed: 3.8,
  runPhaseOffset: -Math.PI * 0.2,
  chestPitchFollow: 0.16,
  chestRollAmp: 0.014,
  hipCounterRollAmp: 0,
  hipCounterYawAmp: 0.08,
  shoulderPumpAmp: 0.075,
  armInwardAmp: 0.08,
  lowerArmBend: -0.22,
  sprintSpineTwistAmp: 0.15,
  sprintHipTwistAmp: 0.075,
  sprintHeadFollowTwist: 0.42,
  sprintArmForwardBias: 0.14,
  sprintArmEndpointEase: 1.25,
  sprintArmFrontHoldStart: 0.62,
  sprintArmFrontHoldStrength: 0.32,
  sprintArmForwardAmp: 1.83,
  sprintArmBackwardAmp: 0.18,
  sprintShoulderForwardAmp: 0.34,
  sprintShoulderBackwardAmp: 0.08,
  sprintShoulderLeadForwardAmp: 0.22,
  sprintShoulderLeadGatherAmp: 0.1,
  sprintShoulderReachForward: 0.035,
  sprintShoulderReachBackward: 0.012,
  sprintShoulderReachLift: 0.012,
  sprintShoulderRollForwardAmp: 0.1,
  sprintShoulderUpperArmFollow: 0.58,
  sprintLowerArmExtraBend: -0.16,
  sprintForearmCurveY: 0.18,
  sprintArmChestGatherY: 0.34,
  sprintArmChestGatherZ: 0,
  sprintArmChestGatherCurl: 0.3,
  sprintElbowSwingBend: 0.16,
  sprintLegAmp: 0.055,
  airborneTwistHz: 0.496,
  clothDamping: 7.5,
  clothTurnDrag: 0.75,
} as const;

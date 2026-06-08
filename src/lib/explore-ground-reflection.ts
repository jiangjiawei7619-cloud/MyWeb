import * as THREE from 'three';
import { GROUND_HALF_EXTENT } from '@/physics/createPhysicsWorld';

/** EXPLORE 地面反射系统参数 */
export const EXPLORE_GROUND_REFLECTION = {
  /** legacy = 实例化砖块 + 几何镜像；cyberReflective = MeshReflector 单平面 + 可选几何镜像 */
  groundMode: 'cyberReflective' as 'cyberReflective' | 'legacy',
  /** MeshReflector 地砖 — 与 CyberReflectiveTiles 同步 */
  cyberTiles: {
    /** 叠加几何镜像（霓虹/海报 emissive 在 Reflector 里偏暗，需 hybrid） */
    hybridGeometricMirrors: true,
    tileSize: 2.4,
    gapWidth: 0.045,
    gapFeather: 0.035,
    reflectionStrength: 0.72,
    /** 仅反射贴图 UV 砖缝扰动（投影空间） */
    reflectionFadeStart: 5.0,
    reflectionFadeEnd: 36.0,
    nearReflectionStrength: 0.72,
    farReflectionStrength: 0.18,
    nearRoughness: 0.07,
    farRoughness: 0.22,
    nearContrast: 1.08,
    farContrast: 0.78,
    fresnelStrength: 0.55,
    fresnelPower: 2.4,
    fresnelBias: 0.1,
    microDistortionStrength: 0.0008,
    microRoughnessAmount: 0.02,
    distanceFogColor: '#06080b',
    distanceFogAmount: 0.22,
    highlightBoost: 0.12,
    secondaryReflectionStrength: 0.25,
    neonReceiveStrength: 0.08,
    baseDarkness: 1.0,
    blurStrength: 0.42,
    roughness: 0.14,
    metalness: 0.28,
    /** Reflector FBO 参数 — mirror 越高镜面越强；mixBlur 越高越糊 */
    reflector: {
      y: 0.003,
      mirror: 0.58,
      mixStrength: 8.5,
      mixBlur: 0.42,
      mixContrast: 1.15,
      depthScale: 0.2,
      minDepthThreshold: 0.58,
      maxDepthThreshold: 1.05,
      depthToBlurRatioBias: 0.1,
      blur: [420, 100] as [number, number],
      reflectorOffset: 0.012,
      distortion: 0.1,
    },
  },
  /** 湿地面平面反射 (MeshReflectorMaterial) — 未用于 FirstPersonScene */
  planar: {
    y: 0.006,
    mirror: 0.94,
    mixStrength: 1.45,
    mixBlur: 0.14,
    mixContrast: 1.18,
    depthScale: 0.22,
    minDepthThreshold: 0.72,
    maxDepthThreshold: 1,
    depthToBlurRatioBias: 0.04,
    resolution: 1024,
    blur: [256, 128] as [number, number],
    reflectorOffset: 0.01,
    surfaceOpacity: 1,
    roughness: 0.12,
    metalness: 0.96,
  },
  /** 几何镜像层（楼宇翻转） */
  mirrorLayer: {
    yEpsilon: 0.004,
    /** 楼宇倒影主色增益（shader uReflectBoost 再乘） */
    buildingReflectGain: 0.82,
    buildingReflectBoost: 1.38,
    /** 霓虹海报倒影主色增益 */
    signReflectGain: 0.72,
    signReflectBoost: 1.44,
    /** 楼宇倒影边缘霓虹附加光 */
    buildingNeonReflect: 0.58,
    fadeDepth: 52,
    /** 水平距离衰减 — 远处倒影更淡、更像湿面散射 */
    distanceFalloffNear: 18,
    distanceFalloffFar: 118,
    distanceFalloffStrength: 0.52,
    /** 掠射角 Fresnel — 贴近地面看时倒影更强 */
    fresnelPower: 2.15,
    fresnelBoost: 1.22,
    /** 距离模糊感 — 远处向雾色混合 */
    blurDistanceNear: 12,
    blurDistanceFar: 92,
    blurFogMix: 0.38,
  },
  /** 霓虹 / 全息海报 — 浅水面衰减，不复用楼宇 fadeDepth(52) */
  signMirrorLayer: {
    fadeDepth: 11,
    distanceFalloffNear: 14,
    distanceFalloffFar: 96,
    distanceFalloffStrength: 0.3,
    fresnelPower: 2.05,
    fresnelBoost: 1.28,
    blurDistanceNear: 10,
    blurDistanceFar: 78,
    blurFogMix: 0.12,
  },
  /** EXPLORE 湿地面（CyberWetGround flat） */
  groundWet: {
    fresnelPower: 3.4,
    fresnelAlphaMin: 0.036,
    fresnelAlphaMax: 0.26,
    /** 程序化天际霓虹反射（无 IBL / 无太阳） */
    envReflectStrength: 0.42,
    specularStrength: 0.24,
    /** 网格线处略增透明，让镜像更透出 */
    gridAlphaBoost: 0.14,
  },
  /** SASMy 砖块地面 — 砖块 / 砖缝 */
  bricks: {
    tileSize: 3.2,
    gap: 0.14,
    thickness: 0.38,
    bevelRadius: 0.055,
    wallSkirtHeight: 0.2,
    wallSkirtThickness: 0.012,
    heightJitter: 0.016,
    color: '#18141e',
    emissive: '#241830',
    emissiveIntensity: 0.42,
    metalness: 0.78,
    roughness: 0.18,
    clearcoat: 0.92,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.15,
  },
  grout: {
    color: '#060508',
    opacity: 0.96,
    height: 0.105,
    y: 0.008,
  },
  /** 砖缝 vs 砖面倒影差异 */
  brickReflect: {
    seamGain: 1.48,
    surfaceGain: 0.62,
    seamBlurScale: 0.32,
    surfaceBlurScale: 1.28,
    seamWetBoost: 1.55,
    surfaceWetBoost: 0.78,
  },
  /** 砖面之上薄湿层 — 保留几何镜像透出 */
  brickWetOverlay: {
    /** 略高于砖顶 (yOffset≤0.016)，避免被砖面深度挡住 */
    y: 0.024,
    fresnelAlphaMin: 0.032,
    fresnelAlphaMax: 0.22,
    envReflectStrength: 0.48,
    specularStrength: 0.32,
    gridAlphaBoost: 0.018,
  },
} as const;

const { bricks, brickReflect, groundMode, cyberTiles } = EXPLORE_GROUND_REFLECTION;
const BRICK_GRID_PITCH =
  groundMode === 'cyberReflective' ? cyberTiles.tileSize : bricks.tileSize + bricks.gap;
const BRICK_GRID_GAP =
  groundMode === 'cyberReflective'
    ? cyberTiles.gapWidth * cyberTiles.tileSize
    : bricks.gap;
const BRICK_GRID_ORIGIN = new THREE.Vector2(-GROUND_HALF_EXTENT, -GROUND_HALF_EXTENT);

/** 砖缝 / 砖面网格 uniform — 倒影 shader 区分缝深 */
export function createBrickGridUniforms() {
  return {
    uBrickPitch: { value: BRICK_GRID_PITCH },
    uBrickGap: { value: BRICK_GRID_GAP },
    uBrickOrigin: { value: BRICK_GRID_ORIGIN.clone() },
    uReflectSurfacePass: { value: 0 },
    uSeamReflectGain: { value: brickReflect.seamGain },
    uSurfaceReflectGain: { value: brickReflect.surfaceGain },
    uSeamBlurScale: { value: brickReflect.seamBlurScale },
    uSurfaceBlurScale: { value: brickReflect.surfaceBlurScale },
    /** cyber 地砖：1=边缘砖缝 mask，0=legacy 尾部砖缝 */
    uUseEdgeGapMask: { value: groundMode === 'cyberReflective' ? 1 : 0 },
    uGapWidthFrac: { value: cyberTiles.gapWidth },
    uGapFeather: { value: cyberTiles.gapFeather },
    /** 砖缝反射扭曲 — 几何镜像 + Reflector 共用 */
    uReflectionSeamDistortion: { value: 0 },
    uSeamDistortionNoiseScale: { value: 1 },
    uSeamDistortionSpeed: { value: 0 },
    uDebugDistortedReflection: { value: 0 },
    uSeamDarkness: { value: 0.35 },
    uDebugSeamMask: { value: 0 },
  };
}

export function createBrickWetGridUniforms() {
  return {
    uBrickPitch: { value: BRICK_GRID_PITCH },
    uBrickGap: { value: BRICK_GRID_GAP },
    uBrickOrigin: { value: BRICK_GRID_ORIGIN.clone() },
    uSeamWetBoost: { value: brickReflect.seamWetBoost },
    uSurfaceWetBoost: { value: brickReflect.surfaceWetBoost },
  };
}

const { mirrorLayer } = EXPLORE_GROUND_REFLECTION;

/** 几何镜像 shader 共用衰减 / Fresnel uniform 值 */
export function createExploreMirrorUniforms() {
  return {
    uReflectFadeDepth: { value: mirrorLayer.fadeDepth },
    uReflectDistNear: { value: mirrorLayer.distanceFalloffNear },
    uReflectDistFar: { value: mirrorLayer.distanceFalloffFar },
    uReflectDistStrength: { value: mirrorLayer.distanceFalloffStrength },
    uReflectFresnelPower: { value: mirrorLayer.fresnelPower },
    uReflectFresnelBoost: { value: mirrorLayer.fresnelBoost },
    uReflectBlurNear: { value: mirrorLayer.blurDistanceNear },
    uReflectBlurFar: { value: mirrorLayer.blurDistanceFar },
    uReflectBlurFogMix: { value: mirrorLayer.blurFogMix },
    uCamPos: { value: new THREE.Vector3() },
  };
}

const { signMirrorLayer } = EXPLORE_GROUND_REFLECTION;

/** 霓虹 / 全息海报专用 — 浅层湿面衰减，避免被建筑 fadeDepth 压暗 */
export function createExploreSignMirrorUniforms() {
  return {
    uReflectFadeDepth: { value: signMirrorLayer.fadeDepth },
    uReflectDistNear: { value: signMirrorLayer.distanceFalloffNear },
    uReflectDistFar: { value: signMirrorLayer.distanceFalloffFar },
    uReflectDistStrength: { value: signMirrorLayer.distanceFalloffStrength },
    uReflectFresnelPower: { value: signMirrorLayer.fresnelPower },
    uReflectFresnelBoost: { value: signMirrorLayer.fresnelBoost },
    uReflectBlurNear: { value: signMirrorLayer.blurDistanceNear },
    uReflectBlurFar: { value: signMirrorLayer.blurDistanceFar },
    uReflectBlurFogMix: { value: signMirrorLayer.blurFogMix },
    uCamPos: { value: new THREE.Vector3() },
  };
}

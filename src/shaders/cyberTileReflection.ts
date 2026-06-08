import * as THREE from 'three';
import type { WebGLProgramParametersWithUniforms } from 'three';
import { EXPLORE_GROUND_REFLECTION } from '@/lib/explore-ground-reflection';

const { cyberTiles } = EXPLORE_GROUND_REFLECTION;

export const CYBER_TILE_PATCH_VERSION = 'v10-dark-layered-angle-reflection';

export const CYBER_TILE_DEFAULTS = {
  reflectionStrength: cyberTiles.reflectionStrength,
  blurStrength: cyberTiles.blurStrength,
  roughness: cyberTiles.roughness,
  metalness: cyberTiles.metalness,
  opacity: 1,
  reflectionFadeStart: cyberTiles.reflectionFadeStart,
  reflectionFadeEnd: cyberTiles.reflectionFadeEnd,
  nearReflectionStrength: cyberTiles.nearReflectionStrength,
  farReflectionStrength: cyberTiles.farReflectionStrength,
  nearRoughness: cyberTiles.nearRoughness,
  farRoughness: cyberTiles.farRoughness,
  nearContrast: cyberTiles.nearContrast,
  farContrast: cyberTiles.farContrast,
  fresnelStrength: cyberTiles.fresnelStrength,
  fresnelPower: cyberTiles.fresnelPower,
  fresnelBias: cyberTiles.fresnelBias,
  microDistortionStrength: cyberTiles.microDistortionStrength,
  microRoughnessAmount: cyberTiles.microRoughnessAmount,
  distanceFogColor: new THREE.Color(cyberTiles.distanceFogColor),
  distanceFogAmount: cyberTiles.distanceFogAmount,
  highlightBoost: cyberTiles.highlightBoost,
  secondaryReflectionStrength: cyberTiles.secondaryReflectionStrength,
  neonReceiveStrength: cyberTiles.neonReceiveStrength,
  baseDarkness: cyberTiles.baseDarkness,
  groundColor: '#050507',
} as const;

export type CyberTileUniformValues = {
  reflectionFadeStart: number;
  reflectionFadeEnd: number;
  nearReflectionStrength: number;
  farReflectionStrength: number;
  nearRoughness: number;
  farRoughness: number;
  nearContrast: number;
  farContrast: number;
  fresnelStrength: number;
  fresnelPower: number;
  fresnelBias: number;
  microDistortionStrength: number;
  microRoughnessAmount: number;
  distanceFogColor: THREE.Color;
  distanceFogAmount: number;
  highlightBoost: number;
  secondaryReflectionStrength: number;
  neonReceiveStrength: number;
  baseDarkness: number;
  debugDepthFade: boolean;
  debugFresnel: boolean;
  debugReflectionOnly: boolean;
  debugMicroVariation: boolean;
};

export type CyberTileUniforms = Record<
  | 'uTime'
  | 'uReflectionFadeStart'
  | 'uReflectionFadeEnd'
  | 'uNearReflectionStrength'
  | 'uFarReflectionStrength'
  | 'uNearRoughness'
  | 'uFarRoughness'
  | 'uNearContrast'
  | 'uFarContrast'
  | 'uFresnelStrength'
  | 'uFresnelPower'
  | 'uFresnelBias'
  | 'uMicroDistortionStrength'
  | 'uMicroRoughnessAmount'
  | 'uDistanceFogColor'
  | 'uDistanceFogAmount'
  | 'uHighlightBoost'
  | 'uSecondaryReflectionStrength'
  | 'uNeonReceiveStrength'
  | 'uBaseDarkness'
  | 'uDebugDepthFade'
  | 'uDebugFresnel'
  | 'uDebugReflectionOnly'
  | 'uDebugMicroVariation',
  THREE.IUniform
>;

export function createCyberTileUniforms(values: Partial<CyberTileUniformValues> = {}): CyberTileUniforms {
  const v = { ...CYBER_TILE_DEFAULTS, ...values };
  return {
    uTime: { value: 0 },
    uReflectionFadeStart: { value: v.reflectionFadeStart },
    uReflectionFadeEnd: { value: v.reflectionFadeEnd },
    uNearReflectionStrength: { value: v.nearReflectionStrength },
    uFarReflectionStrength: { value: v.farReflectionStrength },
    uNearRoughness: { value: v.nearRoughness },
    uFarRoughness: { value: v.farRoughness },
    uNearContrast: { value: v.nearContrast },
    uFarContrast: { value: v.farContrast },
    uFresnelStrength: { value: v.fresnelStrength },
    uFresnelPower: { value: v.fresnelPower },
    uFresnelBias: { value: v.fresnelBias },
    uMicroDistortionStrength: { value: v.microDistortionStrength },
    uMicroRoughnessAmount: { value: v.microRoughnessAmount },
    uDistanceFogColor: { value: v.distanceFogColor.clone() },
    uDistanceFogAmount: { value: v.distanceFogAmount },
    uHighlightBoost: { value: v.highlightBoost },
    uSecondaryReflectionStrength: { value: v.secondaryReflectionStrength },
    uNeonReceiveStrength: { value: v.neonReceiveStrength },
    uBaseDarkness: { value: v.baseDarkness },
    uDebugDepthFade: { value: v.debugDepthFade ? 1 : 0 },
    uDebugFresnel: { value: v.debugFresnel ? 1 : 0 },
    uDebugReflectionOnly: { value: v.debugReflectionOnly ? 1 : 0 },
    uDebugMicroVariation: { value: v.debugMicroVariation ? 1 : 0 },
  };
}

const GLSL_SMOOTH_FLOOR_HELPERS = /* glsl */ `
float smoothCyberMicroNoise(vec2 worldXZ) {
  float n1 = sin(worldXZ.x * 2.8 + uTime * 0.015) * 0.5 + 0.5;
  float n2 = sin(worldXZ.y * 4.6 - uTime * 0.012) * 0.5 + 0.5;
  float n3 = sin((worldXZ.x + worldXZ.y) * 7.4) * 0.5 + 0.5;
  return n1 * 0.5 + n2 * 0.35 + n3 * 0.15;
}

vec2 smoothCyberReflectionDistortion(vec2 worldXZ, float microNoise) {
  float a = sin(worldXZ.x * 3.15 + worldXZ.y * 0.55 + uTime * 0.012);
  float b = cos(worldXZ.y * 4.75 - worldXZ.x * 0.42 - uTime * 0.01);
  vec2 opticalShift = vec2(a, b);
  opticalShift += vec2(microNoise - 0.5, 0.5 - microNoise) * 0.35;
  return opticalShift * uMicroDistortionStrength;
}

float getFresnel(vec3 normalW, vec3 viewDirW) {
  float ndv = clamp(dot(normalize(normalW), normalize(viewDirW)), 0.0, 1.0);
  return uFresnelBias + pow(1.0 - ndv, uFresnelPower) * uFresnelStrength;
}
`;

const GLSL_REFLECTOR_UNIFORMS = /* glsl */ `
uniform float uTime;
uniform float uReflectionFadeStart;
uniform float uReflectionFadeEnd;
uniform float uNearReflectionStrength;
uniform float uFarReflectionStrength;
uniform float uNearRoughness;
uniform float uFarRoughness;
uniform float uNearContrast;
uniform float uFarContrast;
uniform float uFresnelStrength;
uniform float uFresnelPower;
uniform float uFresnelBias;
uniform float uMicroDistortionStrength;
uniform float uMicroRoughnessAmount;
uniform vec3 uDistanceFogColor;
uniform float uDistanceFogAmount;
uniform float uHighlightBoost;
uniform float uSecondaryReflectionStrength;
uniform float uNeonReceiveStrength;
uniform float uBaseDarkness;
uniform float uDebugDepthFade;
uniform float uDebugFresnel;
uniform float uDebugReflectionOnly;
uniform float uDebugMicroVariation;
`;

const REFLECTOR_DIFFUSE_SAMPLE = 'vec4 base = texture2DProj(tDiffuse, new_vUv);';
const REFLECTOR_BLUR_SAMPLE = 'vec4 blur = texture2DProj(tDiffuseBlur, new_vUv);';
const REFLECTOR_NORMAL_COORD = 'vec3 coord = new_vUv.xyz / new_vUv.w;';
const REFLECTOR_ROUGHNESS_DECL = 'float reflectorRoughnessFactor = roughness;';
const REFLECTOR_FINAL_MIX =
  'diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);';

const GLSL_REFLECT_UV_DISTORT = /* glsl */ `
float cyberMicroVariation = smoothCyberMicroNoise(vCyberWorldPos.xz);
vec2 cyberMicroDistortion = smoothCyberReflectionDistortion(vCyberWorldPos.xz, cyberMicroVariation);
float cyberDistToCamera = distance(cameraPosition.xz, vCyberWorldPos.xz);
float cyberDepthFade = smoothstep(uReflectionFadeStart, uReflectionFadeEnd, cyberDistToCamera);
if (uDebugMicroVariation > 0.5) {
  gl_FragColor = vec4(vec3(cyberMicroVariation), 1.0);
  return;
}
vec4 cyberReflectionUv = new_vUv;
cyberReflectionUv.xy += cyberMicroDistortion * cyberReflectionUv.w;
`;

const GLSL_ROUGHNESS_VARIATION = /* glsl */ `
float reflectorRoughnessFactor = mix(uNearRoughness, uFarRoughness, cyberDepthFade);
reflectorRoughnessFactor += (cyberMicroVariation - 0.5) * uMicroRoughnessAmount;
reflectorRoughnessFactor = clamp(reflectorRoughnessFactor, 0.02, 0.82);
`;

const GLSL_FRESNEL_REFLECTION_MIX = /* glsl */ `
vec3 cyberNormalW = normalize(vCyberWorldNormal);
vec3 cyberViewDirW = normalize(cameraPosition - vCyberWorldPos);
float cyberFresnel = clamp(getFresnel(cyberNormalW, cyberViewDirW), 0.0, 1.0);

if (uDebugDepthFade > 0.5) {
  gl_FragColor = vec4(vec3(cyberDepthFade), 1.0);
  return;
}

if (uDebugFresnel > 0.5) {
  gl_FragColor = vec4(vec3(cyberFresnel), 1.0);
  return;
}

float cyberReflectionStrength = mix(uNearReflectionStrength, uFarReflectionStrength, cyberDepthFade);
float cyberContrast = mix(uNearContrast, uFarContrast, cyberDepthFade);

vec3 cyberPrimaryReflection = newMerge.rgb;
cyberPrimaryReflection = (cyberPrimaryReflection - 0.5) * cyberContrast + 0.5;
cyberPrimaryReflection = clamp(cyberPrimaryReflection, 0.0, 1.0);
cyberPrimaryReflection = mix(cyberPrimaryReflection, uDistanceFogColor, cyberDepthFade * uDistanceFogAmount);

vec3 cyberSecondaryReflection = blur.rgb * 0.65;
cyberSecondaryReflection = mix(cyberSecondaryReflection, uDistanceFogColor, 0.25 + cyberDepthFade * 0.35);

float cyberPrimaryPeak = max(max(cyberPrimaryReflection.r, cyberPrimaryReflection.g), cyberPrimaryReflection.b);
float cyberBlurPeak = max(max(blur.r, blur.g), blur.b);
float cyberHighlightMask = smoothstep(0.68, 1.0, cyberPrimaryPeak);
float cyberReceiveMask = smoothstep(0.32, 0.92, cyberBlurPeak) * (1.0 - cyberDepthFade * 0.55);
vec3 cyberHighlightBoost = cyberPrimaryReflection * cyberHighlightMask * uHighlightBoost;
vec3 cyberNeonReceive = blur.rgb * cyberReceiveMask * uNeonReceiveStrength;

vec3 cyberLayeredReflection = cyberPrimaryReflection + cyberSecondaryReflection * uSecondaryReflectionStrength + cyberHighlightBoost + cyberNeonReceive;
cyberLayeredReflection = clamp(cyberLayeredReflection, 0.0, 1.15);

float cyberMixInfluence = clamp(mixStrength * 0.115, 0.35, 1.15);
float cyberFinalReflectionFactor = clamp(cyberReflectionStrength * cyberFresnel * cyberMixInfluence, 0.0, 0.85);
vec3 cyberReflectionContribution = clamp(cyberLayeredReflection * cyberFinalReflectionFactor, 0.0, 0.62);

if (uDebugReflectionOnly > 0.5) {
  gl_FragColor = vec4(cyberReflectionContribution, 1.0);
  return;
}

vec3 cyberDarkBaseFloor = diffuseColor.rgb * uBaseDarkness;
diffuseColor.rgb = clamp(cyberDarkBaseFloor + cyberReflectionContribution, 0.0, 0.82);
`;

export function applyCyberTileReflectionPatch(
  shader: WebGLProgramParametersWithUniforms,
  uniforms: Pick<
    CyberTileUniforms,
    | 'uTime'
    | 'uReflectionFadeStart'
    | 'uReflectionFadeEnd'
    | 'uNearReflectionStrength'
    | 'uFarReflectionStrength'
    | 'uNearRoughness'
    | 'uFarRoughness'
    | 'uNearContrast'
    | 'uFarContrast'
    | 'uFresnelStrength'
    | 'uFresnelPower'
    | 'uFresnelBias'
    | 'uMicroDistortionStrength'
    | 'uMicroRoughnessAmount'
    | 'uDistanceFogColor'
    | 'uDistanceFogAmount'
    | 'uHighlightBoost'
    | 'uSecondaryReflectionStrength'
    | 'uNeonReceiveStrength'
    | 'uBaseDarkness'
    | 'uDebugDepthFade'
    | 'uDebugFresnel'
    | 'uDebugReflectionOnly'
    | 'uDebugMicroVariation'
  >,
) {
  if (shader.fragmentShader.includes('CYBER_LAYERED_REFLECT_PATCH')) return;

  Object.assign(shader.uniforms, uniforms);

  if (!shader.vertexShader.includes('vCyberWorldPos')) {
    shader.vertexShader = shader.vertexShader.replace(
      'varying vec4 my_vUv;',
      'varying vec4 my_vUv;\nvarying vec3 vCyberWorldPos;\nvarying vec3 vCyberWorldNormal;',
    );
    if (shader.vertexShader.includes('my_vUv = textureMatrix * vec4( position, 1.0 );')) {
      shader.vertexShader = shader.vertexShader.replace(
        'my_vUv = textureMatrix * vec4( position, 1.0 );',
        'my_vUv = textureMatrix * vec4( position, 1.0 );\nvCyberWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;\nvCyberWorldNormal = normalize(mat3(modelMatrix) * normal);',
      );
    }
  }

  shader.fragmentShader = shader.fragmentShader.replace(
    'varying vec4 my_vUv;',
    `varying vec4 my_vUv;
varying vec3 vCyberWorldPos;
varying vec3 vCyberWorldNormal;
// CYBER_LAYERED_REFLECT_PATCH
${GLSL_REFLECTOR_UNIFORMS}
${GLSL_SMOOTH_FLOOR_HELPERS}`,
  );

  if (!shader.fragmentShader.includes(REFLECTOR_DIFFUSE_SAMPLE)) {
    throw new Error(`CyberReflectiveTiles could not locate reflection sample line: ${REFLECTOR_DIFFUSE_SAMPLE}`);
  }
  if (!shader.fragmentShader.includes(REFLECTOR_ROUGHNESS_DECL)) {
    throw new Error(`CyberReflectiveTiles could not locate reflection roughness line: ${REFLECTOR_ROUGHNESS_DECL}`);
  }
  if (!shader.fragmentShader.includes(REFLECTOR_FINAL_MIX)) {
    throw new Error(`CyberReflectiveTiles could not locate reflection blend line: ${REFLECTOR_FINAL_MIX}`);
  }

  shader.fragmentShader = shader.fragmentShader
    .replace(
      REFLECTOR_DIFFUSE_SAMPLE,
      `${GLSL_REFLECT_UV_DISTORT}
vec4 base = texture2DProj(tDiffuse, cyberReflectionUv);`,
    )
    .replace(REFLECTOR_BLUR_SAMPLE, 'vec4 blur = texture2DProj(tDiffuseBlur, cyberReflectionUv);')
    .replace(REFLECTOR_NORMAL_COORD, 'vec3 coord = cyberReflectionUv.xyz / cyberReflectionUv.w;')
    .replace(REFLECTOR_ROUGHNESS_DECL, GLSL_ROUGHNESS_VARIATION)
    .replace(REFLECTOR_FINAL_MIX, GLSL_FRESNEL_REFLECTION_MIX);
}

export const GLSL_GEOMETRIC_REFLECTION_SEAM = /* glsl */ `
  float geoSeamMask(vec2 xz) {
    return 0.0;
  }

  vec2 geoReflectionSeamDistortion(vec2 xz) {
    return vec2(0.0);
  }
`;

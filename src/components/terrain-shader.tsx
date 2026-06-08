import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD_COLORS } from '@/lib/world-config';

const TERRAIN_VERTEX_SHADER = `
uniform float uTime;
uniform vec2 uHoverXZ;
uniform float uHoverForce;
uniform float uEmissiveBoost;
uniform float uTransitionBoost;
uniform float uTierScale;

varying vec2 vUv;
varying float vHeight;
varying float vTrace;
varying float vCrackMask;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.6;
  float freq = 0.08;
  for (int i = 0; i < 4; i++) {
    value += noise(p * freq) * amp;
    freq *= 1.95;
    amp *= 0.52;
  }
  return value;
}

void main() {
  vUv = uv;
  vec3 pos = position;

  vec2 xz = vec2(pos.x, pos.z);
  float n = fbm(xz + vec2(uTime * 0.9, -uTime * 0.6));
  float broadWave = sin(pos.x * 0.07 + uTime * 0.7) * cos(pos.z * 0.09 - uTime * 0.45);
  float ridges = abs(sin((pos.x + pos.z) * 0.12 + uTime * 0.15));

  float crackField = abs(sin((pos.x * 0.23 + pos.z * 0.29) + n * 12.0));
  float crackMask = pow(1.0 - crackField, 5.5);
  float baseHeight = (n * 5.8 + broadWave * 1.8 + ridges * 1.6 - crackMask * 1.75) * uTierScale;

  // 鼠标悬停压痕：将交互位置附近地表压低，并交给外部缓慢恢复
  float hoverDistance = distance(xz, uHoverXZ);
  float hoverMask = smoothstep(13.0, 0.0, hoverDistance);
  float hoverDepression = hoverMask * uHoverForce * 2.8;

  pos.y += baseHeight - hoverDepression;
  vHeight = pos.y;

  vTrace = crackMask + uEmissiveBoost * 0.24 + uTransitionBoost * 0.12;
  vCrackMask = crackMask;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const TERRAIN_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uEmissiveBoost;
uniform float uTransitionBoost;

varying vec2 vUv;
varying float vHeight;
varying float vTrace;
varying float vCrackMask;

float tracePattern(vec2 uv, float t) {
  vec2 g = abs(fract(uv * 42.0) - 0.5);
  float lineMain = 1.0 - smoothstep(0.02, 0.06, min(g.x, g.y));
  float cross = 1.0 - smoothstep(0.04, 0.09, abs(fract((uv.x + uv.y) * 28.0 + t * 0.18) - 0.5));
  return lineMain * 0.7 + cross * 0.3;
}

void main() {
  vec3 base = vec3(0.07, 0.01, 0.02);
  vec3 low = vec3(0.02, 0.0, 0.0);
  vec3 mid = vec3(0.18, 0.04, 0.04);
  vec3 high = vec3(0.34, 0.07, 0.06);
  float h = clamp((vHeight + 12.0) / 28.0, 0.0, 1.0);
  vec3 terrain = mix(low, mid, h);
  terrain = mix(terrain, high, smoothstep(0.65, 1.0, h));

  float boardLine = tracePattern(vUv, uTime);
  vec3 boardGlow = vec3(1.0, 0.22, 0.2) * boardLine * (0.08 + uEmissiveBoost * 0.18 + uTransitionBoost * 0.2);

  float pulse = 0.68 + 0.32 * sin(uTime * 1.6 + vUv.x * 20.0 + vUv.y * 16.0);
  vec3 crackGlow = vec3(1.0, 0.36, 0.22) * vTrace * pulse * (0.7 + uEmissiveBoost * 0.7 + uTransitionBoost * 0.6);
  vec3 crackCore = vec3(1.0, 0.18, 0.12) * pow(vCrackMask, 2.0) * (0.5 + uTransitionBoost * 0.8);

  vec3 color = base + terrain + boardGlow + crackGlow + crackCore;
  gl_FragColor = vec4(color, 1.0);
}
`;

export type TerrainUniforms = {
  uTime: { value: number };
  uHoverXZ: { value: THREE.Vector2 };
  uHoverForce: { value: number };
  uEmissiveBoost: { value: number };
  uTransitionBoost: { value: number };
  uTierScale: { value: number };
} & Record<string, THREE.IUniform>;

export function useTerrainUniforms(tierScale: number): TerrainUniforms {
  return useMemo(
    () => ({
      uTime: { value: 0 },
      uHoverXZ: { value: new THREE.Vector2(0, 0) },
      uHoverForce: { value: 0 },
      uEmissiveBoost: { value: 0 },
      uTransitionBoost: { value: 0 },
      uTierScale: { value: tierScale },
    }),
    [tierScale],
  );
}

export function createTerrainMaterial(uniforms: TerrainUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: TERRAIN_VERTEX_SHADER,
    fragmentShader: TERRAIN_FRAGMENT_SHADER,
    transparent: false,
    fog: true,
  });
}

export const TERRAIN_BASE_COLOR = new THREE.Color(WORLD_COLORS.terrainDark);

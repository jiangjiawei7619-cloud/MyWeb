/** EXPLORE 赛博城市 — 建筑 / 霓虹灯牌 / 楼基光池 */

import { GLSL_GEOMETRIC_REFLECTION_SEAM } from '@/shaders/cyberTileReflection';

export const exploreCityBuildingVert = /* glsl */ `
  attribute float aSeed;
  attribute float aHeight;
  attribute float aType;
  attribute float aMaterial;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying float vSeed;
  varying float vHeight;
  varying float vType;
  varying float vMaterial;
  varying vec3 vWorldPos;

  void main() {
    vPos = position;
    vNormal = normal;
    vSeed = aSeed;
    vHeight = aHeight;
    vType = aType;
    vMaterial = aMaterial;
    vec4 wp = instanceMatrix * vec4(position, 1.0);
    vWorldPos = (modelMatrix * wp).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * wp;
  }
`;

export const exploreCityBuildingFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uEmber;
  uniform vec3 uAmber;
  uniform vec3 uAccent;
  uniform vec3 uFog;
  uniform float uIntensity;
  uniform float uReflect;
  uniform float uReflectBoost;
  uniform float uReflectGain;
  uniform float uNeonReflect;
  uniform vec3 uCamPos;
  uniform float uReflectFadeDepth;
  uniform float uReflectDistNear;
  uniform float uReflectDistFar;
  uniform float uReflectDistStrength;
  uniform float uReflectFresnelPower;
  uniform float uReflectFresnelBoost;
  uniform float uReflectBlurNear;
  uniform float uReflectBlurFar;
  uniform float uReflectBlurFogMix;
  uniform float uReflectSurfacePass;
  uniform float uBrickPitch;
  uniform float uBrickGap;
  uniform vec2 uBrickOrigin;
  uniform float uSeamReflectGain;
  uniform float uSurfaceReflectGain;
  uniform float uSeamBlurScale;
  uniform float uSurfaceBlurScale;
  uniform float uUseEdgeGapMask;
  uniform float uGapWidthFrac;
  uniform float uGapFeather;
  uniform float uReflectionSeamDistortion;
  uniform float uSeamDistortionNoiseScale;
  uniform float uSeamDistortionSpeed;
  uniform float uDebugDistortedReflection;
  uniform sampler2D uTexConcrete;
  uniform sampler2D uTexGlass;
  uniform sampler2D uTexMetal;
  uniform sampler2D uTexDirty;
  uniform sampler2D uNormConcrete;
  uniform sampler2D uNormGlass;
  uniform sampler2D uNormMetal;
  uniform sampler2D uNormDirty;
  uniform sampler2D uRoughConcrete;
  uniform sampler2D uRoughGlass;
  uniform sampler2D uRoughMetal;
  uniform sampler2D uRoughDirty;
  uniform float uTriplanarScale;
  uniform float uWindowGlow;
  uniform float uFacadeIntensity;
  uniform float uBandCoverage;
  uniform float uBandIntensity;
  uniform float uBandReflectIntensity;
  uniform float uBandBreatheSpeed;
  uniform float uBandBreatheDepth;
  uniform float uBandWidth;
  uniform float uBandHeightMin;
  uniform float uBandHeightMax;
  uniform float uBandTwoChance;
  uniform vec3 uBandPurple;
  uniform vec3 uBandCyan;
  uniform vec3 uBandMagenta;

  varying vec3 vPos;
  varying vec3 vNormal;
  varying float vSeed;
  varying float vHeight;
  varying float vType;
  varying float vMaterial;
  varying vec3 vWorldPos;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float hash21(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }

  float brickSeamMask(vec2 xz) {
    return 0.0;
  }

  ${GLSL_GEOMETRIC_REFLECTION_SEAM}

  vec3 triPlanarBlend(vec3 n) {
    vec3 b = abs(n);
    b = max(b, 0.00001);
    float t = b.x + b.y + b.z;
    return b / t;
  }

  vec3 triPlanarColor(sampler2D tex, vec3 pos, vec3 n, float scale) {
    vec3 blend = triPlanarBlend(n);
    vec3 cx = texture2D(tex, pos.zy * scale).rgb;
    vec3 cy = texture2D(tex, pos.xz * scale).rgb;
    vec3 cz = texture2D(tex, pos.xy * scale).rgb;
    return cx * blend.x + cy * blend.y + cz * blend.z;
  }

  float triPlanarScalar(sampler2D tex, vec3 pos, vec3 n, float scale) {
    vec3 blend = triPlanarBlend(n);
    float cx = texture2D(tex, pos.zy * scale).r;
    float cy = texture2D(tex, pos.xz * scale).r;
    float cz = texture2D(tex, pos.xy * scale).r;
    return cx * blend.x + cy * blend.y + cz * blend.z;
  }

  vec3 sampleFacadeColor(vec3 pos, vec3 n, float mat) {
    float m = floor(mat + 0.5);
    if (m < 0.5) return triPlanarColor(uTexConcrete, pos, n, uTriplanarScale);
    if (m < 1.5) return triPlanarColor(uTexGlass, pos, n, uTriplanarScale * 1.15);
    if (m < 2.5) return triPlanarColor(uTexMetal, pos, n, uTriplanarScale * 0.95);
    return triPlanarColor(uTexDirty, pos, n, uTriplanarScale * 0.78);
  }

  vec3 sampleFacadeNormal(vec3 pos, vec3 n, float mat) {
    float m = floor(mat + 0.5);
    vec3 tn;
    if (m < 0.5) tn = triPlanarColor(uNormConcrete, pos, n, uTriplanarScale);
    else if (m < 1.5) tn = triPlanarColor(uNormGlass, pos, n, uTriplanarScale * 1.15);
    else if (m < 2.5) tn = triPlanarColor(uNormMetal, pos, n, uTriplanarScale * 0.95);
    else tn = triPlanarColor(uNormDirty, pos, n, uTriplanarScale * 0.78);
    return normalize(tn * 2.0 - 1.0);
  }

  float sampleFacadeRough(vec3 pos, vec3 n, float mat) {
    float m = floor(mat + 0.5);
    if (m < 0.5) return triPlanarScalar(uRoughConcrete, pos, n, uTriplanarScale);
    if (m < 1.5) return triPlanarScalar(uRoughGlass, pos, n, uTriplanarScale * 1.15) * 0.35;
    if (m < 2.5) return triPlanarScalar(uRoughMetal, pos, n, uTriplanarScale * 0.95) * 0.55;
    return triPlanarScalar(uRoughDirty, pos, n, uTriplanarScale * 0.78);
  }

  vec3 facadeTint(float mat) {
    float m = floor(mat + 0.5);
    if (m < 0.5) return vec3(0.16, 0.12, 0.10);
    if (m < 1.5) return vec3(0.11, 0.09, 0.09);
    if (m < 2.5) return vec3(0.15, 0.11, 0.09);
    return vec3(0.14, 0.09, 0.08);
  }

  float materialRoughMul(float mat) {
    float m = floor(mat + 0.5);
    if (m < 1.5) return 0.42;
    if (m < 2.5) return 0.65;
    return 1.0;
  }

  vec3 edgeNeonTint(float seed) {
    float hue = hash(seed * 2.3);
    if (hue < 0.34) return uEmber;
    if (hue < 0.67) return uAmber;
    return mix(uEmber, uAmber, 0.55);
  }

  vec3 bandPaletteColor(float seed, float idx) {
    float hue = hash(seed * 11.0 + idx * 5.3);
    if (hue < 0.34) return uBandPurple;
    if (hue < 0.67) return uBandCyan;
    return uBandMagenta;
  }

  float bandRing(float posY, float bandY, float bandWidth) {
    float d = abs(posY - bandY);
    return 1.0 - smoothstep(bandWidth * 0.2, bandWidth, d);
  }

  /** 水平环绕光带 — 仅侧面，seed 决定占比/高度/颜色/呼吸相位 */
  vec3 buildingLightBands(vec3 pos, vec3 normal, float seed) {
    if (abs(normal.y) > 0.5) return vec3(0.0);
    if (hash(seed * 7.13) >= uBandCoverage) return vec3(0.0);

    float speed = uBandBreatheSpeed * (0.82 + hash(seed * 5.17) * 0.36);
    float breathe = (1.0 - uBandBreatheDepth) + uBandBreatheDepth * (0.5 + 0.5 * sin(uTime * speed + seed * 17.3));
    float twoBands = 1.0 - step(uBandTwoChance, hash(seed * 3.71));

    float frac0 = mix(uBandHeightMin, uBandHeightMax, hash(seed * 13.7));
    float frac1 = mix(uBandHeightMin, uBandHeightMax, hash(seed * 17.9));
    float y0 = mix(-0.5, 0.5, frac0);
    float y1 = mix(-0.5, 0.5, frac1);
    float w0 = uBandWidth * (0.75 + hash(seed * 19.3) * 0.5);
    float w1 = uBandWidth * (0.75 + hash(seed * 23.1) * 0.5);

    float ring0 = bandRing(pos.y, y0, w0);
    float ring1 = bandRing(pos.y, y1, w1) * twoBands;

    vec3 col = bandPaletteColor(seed, 0.0) * ring0 + bandPaletteColor(seed, 1.0) * ring1;
    return col * breathe;
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(uCamPos - vWorldPos);
    vec3 col = vec3(0.002, 0.001, 0.003);

    vec2 sideFace = abs(n.x) > 0.5 ? vec2(vPos.z, vPos.y) : vec2(vPos.x, vPos.y);
    float edgeGlow = 0.0;

    if (n.y > 0.5) {
      vec2 e = abs(vPos.xz);
      edgeGlow = smoothstep(0.47, 0.5, max(e.x, e.y)) * 0.18;
    } else if (n.y < -0.5) {
      col *= 0.6;
    } else {
      float corner = smoothstep(0.482, 0.5, abs(sideFace.x));
      float topEdge = smoothstep(0.482, 0.5, sideFace.y);
      float botEdge = smoothstep(0.482, 0.5, -sideFace.y);
      edgeGlow = max(corner, max(topEdge, botEdge)) * 0.22;
    }

    float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.5);
    edgeGlow += fres * 0.06;
    col += edgeNeonTint(vSeed) * edgeGlow;

    vec3 lightBands = buildingLightBands(vPos, n, vSeed);

    if (uReflect > 0.5) {
      float fade = smoothstep(0.0, -uReflectFadeDepth, vWorldPos.y);
      float mirrorFresnel = pow(1.0 - clamp(dot(vec3(0.0, -1.0, 0.0), viewDir), 0.0, 1.0), uReflectFresnelPower);
      float horizDist = length(vWorldPos.xz - uCamPos.xz);
      float distFalloff = 1.0 - smoothstep(uReflectDistNear, uReflectDistFar, horizDist) * uReflectDistStrength;
      float blurMix = smoothstep(uReflectBlurNear, uReflectBlurFar, horizDist) * uReflectBlurFogMix;
      float seamMask = brickSeamMask(vWorldPos.xz);
      float brickGain = uReflectSurfacePass > 0.5
        ? mix(uSurfaceReflectGain, uSurfaceReflectGain * 0.14, seamMask)
        : mix(0.24, uSeamReflectGain, seamMask);
      float blurScale = uReflectSurfacePass > 0.5
        ? mix(uSurfaceBlurScale, uSeamBlurScale, seamMask)
        : mix(0.58, uSeamBlurScale, seamMask);
      blurMix *= blurScale;

      col *= uReflectGain * fade * uReflectBoost * distFalloff * mix(1.0, uReflectFresnelBoost, mirrorFresnel) * brickGain;
      col += edgeNeonTint(vSeed) * edgeGlow * uNeonReflect * uReflectBoost * mirrorFresnel * 0.35;
      col += lightBands * uBandReflectIntensity * uReflectBoost * fade;
      if (uReflectSurfacePass < 0.5) {
        col = mix(col, col * 0.68, seamMask * 0.42);
      }
      col *= uIntensity;
      float depth = length(vWorldPos - uCamPos);
      col = mix(col, uFog, blurMix);
      col = mix(col, uFog, smoothstep(28.0, 150.0, depth) * 0.24);
      float alphaBase = fade * mix(0.82, 0.98, mirrorFresnel);
      float alphaMask = uReflectSurfacePass > 0.5
        ? mix(1.0, 0.14, seamMask)
        : mix(0.34, 1.0, seamMask);
      gl_FragColor = vec4(col, alphaBase * alphaMask);
      return;
    }

    col += lightBands * uBandIntensity;
    col *= mix(0.55, 1.0, smoothstep(2.0, 8.0, vWorldPos.y));
    col *= uIntensity;

    float depth = length(vWorldPos - uCamPos);
    col = mix(col, uFog, smoothstep(75.0, 195.0, depth) * 0.72);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const exploreCityAntennaVert = /* glsl */ `
  attribute float aSeed;
  varying vec3 vPos;
  varying float vSeed;
  void main() {
    vPos = position;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

export const exploreCityAntennaFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uAmber;
  varying vec3 vPos;
  varying float vSeed;
  void main() {
    float tip = smoothstep(0.35, 0.5, vPos.y);
    float blink = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(uTime * 3.0 + vSeed * 20.0), 3.0);
    vec3 col = vec3(0.002, 0.001, 0.003) + uAmber * tip * blink * 0.55;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const exploreCityPoolVert = /* glsl */ `
  attribute float aHeight;
  varying vec2 vUv;
  varying float vH;
  void main() {
    vUv = uv;
    vH = aHeight;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

export const exploreCityPoolFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vH;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float glow = pow(smoothstep(1.0, 0.0, r), 2.2);
    float pulse = 0.85 + 0.15 * sin(uTime * 1.5 + vH);
    float inten = clamp(vH * 0.04, 0.2, 1.0);
    gl_FragColor = vec4(uColor * glow * pulse * inten, glow * 0.45 * inten);
  }
`;

export const exploreNeonSignVert = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aPosterIndex;
  attribute float aGlitchEnabled;
  attribute float aGlitchMode;
  attribute float aGlitchInterval;
  attribute float aGlitchPhase;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vSeed;
  varying float vPosterIndex;
  varying float vGlitchEnabled;
  varying float vGlitchMode;
  varying float vGlitchInterval;
  varying float vGlitchPhase;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vColor = aColor;
    vSeed = aSeed;
    vPosterIndex = aPosterIndex;
    vGlitchEnabled = aGlitchEnabled;
    vGlitchMode = aGlitchMode;
    vGlitchInterval = aGlitchInterval;
    vGlitchPhase = aGlitchPhase;
    vec4 wp = instanceMatrix * vec4(position, 1.0);
    vWorldPos = (modelMatrix * wp).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * wp;
  }
`;

export const exploreNeonSignFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uReflect;
  uniform float uReflectBoost;
  uniform float uReflectGain;
  uniform vec3 uCamPos;
  uniform float uReflectFadeDepth;
  uniform float uReflectDistNear;
  uniform float uReflectDistFar;
  uniform float uReflectDistStrength;
  uniform float uReflectFresnelPower;
  uniform float uReflectFresnelBoost;
  uniform float uReflectBlurNear;
  uniform float uReflectBlurFar;
  uniform float uReflectBlurFogMix;
  uniform float uGlitchDuration;
  uniform float uGlitchSteps;
  uniform float uGlitchEnableRatio;
  uniform float uGlitchIntervalMin;
  uniform float uGlitchIntervalSpan;
  uniform float uParallaxStrength;
  uniform float uRgbLayerDepth;
  uniform float uScanlineLift;
  uniform float uBlockPeelStrength;
  uniform sampler2D uPosterAtlas;
  uniform vec2 uAtlasCell;
  uniform float uAtlasCols;
  uniform float uSignBloomBoost;
  uniform float uSignOuterGlow;
  uniform float uReflectSurfacePass;
  uniform float uBrickPitch;
  uniform float uBrickGap;
  uniform vec2 uBrickOrigin;
  uniform float uSeamReflectGain;
  uniform float uSurfaceReflectGain;
  uniform float uSeamBlurScale;
  uniform float uSurfaceBlurScale;
  uniform float uUseEdgeGapMask;
  uniform float uGapWidthFrac;
  uniform float uGapFeather;
  uniform float uReflectionSeamDistortion;
  uniform float uSeamDistortionNoiseScale;
  uniform float uSeamDistortionSpeed;
  uniform float uDebugDistortedReflection;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vSeed;
  varying float vPosterIndex;
  varying float vGlitchEnabled;
  varying float vGlitchMode;
  varying float vGlitchInterval;
  varying float vGlitchPhase;
  varying vec3 vWorldPos;

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453);
  }

  vec2 posterAtlasUV(vec2 panelUV, float idx) {
    float col = mod(idx, uAtlasCols);
    float row = floor(idx / uAtlasCols);
    return (vec2(col, row) + panelUV) * uAtlasCell;
  }

  vec3 fetchPoster(vec2 panelUV, float idx) {
    return texture2D(uPosterAtlas, posterAtlasUV(panelUV, idx)).rgb;
  }

  /** 3D 视差基向量：掠射角越大偏移越强 */
  vec3 parallaxBasis(float seed) {
    vec3 viewDir = normalize(uCamPos - vWorldPos);
    float camDist = length(uCamPos - vWorldPos);
    float grazing = pow(1.0 - clamp(abs(viewDir.y), 0.0, 1.0), 1.35);
    float depthScale = uParallaxStrength * (0.045 + grazing * 0.16) * (1.0 + 8.0 / max(camDist, 4.0));
    vec2 tangent = normalize(viewDir.xz + vec2(sin(seed * 3.7), cos(seed * 2.1)) * 0.08);
    float heightAboveGround = max(vWorldPos.y - 0.5, 0.0);
    return vec3(tangent * depthScale, grazing * (1.0 + heightAboveGround * 0.012));
  }

  /** RGB Z 轴分离 — R 前 / G 中 / B 后玻璃层 */
  vec3 rgbZLayerSeparation(vec2 panel, float idx, vec3 para, float burstT, float seed) {
    float stepIdx = floor(burstT * uGlitchSteps);
    float rnd = hash21(vec2(stepIdx, seed));
    float layerGap = 0.028 * uRgbLayerDepth * (1.0 + rnd * 0.65);
    float zR = 0.0;
    float zG = 0.38;
    float zB = 0.82;
    vec2 offR = para.xy * (1.0 - zR) + vec2(0.0, para.z * zR * 0.35);
    vec2 offG = para.xy * (0.5 - zG) + vec2(0.0, para.z * zG * 0.22);
    vec2 offB = -para.xy * zB + vec2(0.0, -para.z * zB * 0.18);
    vec3 col;
    col.r = fetchPoster(panel + offR, idx).r;
    col.g = fetchPoster(panel + offG, idx).g;
    col.b = fetchPoster(panel + offB, idx).b;
    col.r *= mix(1.0, 1.45, step(0.42, rnd));
    col.g *= 0.88 + hash21(vec2(stepIdx + 3.0, seed)) * 0.18;
    col.b *= mix(1.0, 1.55, step(0.38, 1.0 - rnd));
    col.r = mix(col.r, col.r * vec3(1.2, 0.55, 1.35).r, layerGap * 8.0);
    col.b = mix(col.b, col.b * vec3(0.45, 0.75, 1.5).b, layerGap * 6.0);
    return col;
  }

  /** 扫描线全息上浮 — 带空间厚度的幽灵残影 */
  vec3 scanlineHologramFloat(vec2 panel, float idx, vec3 para, float burstT, float seed) {
    float stepIdx = floor(burstT * uGlitchSteps);
    float rnd = hash21(vec2(stepIdx, seed + 22.0));
    float heightAboveGround = max(vWorldPos.y - 0.5, 0.0);
    float scanFreq = 56.0 + hash21(vec2(seed, stepIdx)) * 28.0;
    float linePhase = panel.y * scanFreq + stepIdx * 9.0 + uTime * (3.2 + rnd * 2.5);
    float scanBand = sin(linePhase) * 0.5 + 0.5;
    float bandIdx = floor(panel.y * scanFreq);
    float bandZ = fract(bandIdx * 0.173 + seed * 0.31);
    float yLift = scanBand * uScanlineLift * (0.018 + bandZ * 0.042 + heightAboveGround * 0.004);
    float towardCam = para.z * (0.012 + bandZ * 0.028);
    vec2 scanOff = vec2((scanBand - 0.5) * (0.035 + rnd * 0.05), yLift + towardCam);
    scanOff += para.xy * bandZ * 0.55;
    vec3 col = fetchPoster(panel + scanOff, idx);
    float scanDark = 0.72 + 0.28 * sin(linePhase * 2.0);
    col *= scanDark;
    vec2 ghostOff = scanOff + vec2(para.x * 0.35, yLift * 1.65 + towardCam * 2.2);
    vec3 ghost = fetchPoster(panel + ghostOff, idx);
    ghost *= vec3(0.42, 0.18, 0.72);
    col = mix(col, ghost, scanBand * (0.28 + bandZ * 0.35));
    vec2 deepGhostOff = scanOff + vec2(-para.x * 0.5, yLift * 2.4);
    vec3 deepGhost = fetchPoster(panel + deepGhostOff, idx);
    deepGhost *= vec3(0.28, 0.55, 0.95);
    col = mix(col, deepGhost, smoothstep(0.82, 0.98, scanBand) * 0.42);
    return col;
  }

  /** 立体像素块剥离 — 不同深度层不同速度/方向 */
  vec2 blockPeelUV(vec2 panel, float stepIdx, float seed, vec3 para, float burstT) {
    float gridX = 8.0;
    float gridY = 10.0;
    vec2 cell = floor(panel * vec2(gridX, gridY));
    vec2 local = fract(panel * vec2(gridX, gridY));
    float blockDepth = floor(hash21(cell + seed * 0.17) * 4.0);
    float peelSeed = hash21(cell + stepIdx + seed);
    float peeled = step(0.32 + blockDepth * 0.08, peelSeed);
    float speedMul = 1.0 + blockDepth * 0.55;
    float dirAngle = peelSeed * 6.283 + blockDepth * 1.57 + stepIdx * 0.4;
    vec2 peelDir = vec2(cos(dirAngle), sin(dirAngle)) * uBlockPeelStrength;
    peelDir *= (0.022 + blockDepth * 0.016) * speedMul;
    peelDir += para.xy * (0.35 + blockDepth * 0.28);
    peelDir.y += para.z * (0.008 + blockDepth * 0.006);
    vec2 baseUV = (cell + local) / vec2(gridX, gridY);
    vec2 warped = baseUV + peelDir * peeled * (0.35 + burstT * 0.65);
    float gapX = smoothstep(0.9, 0.97, local.x) + smoothstep(0.03, 0.0, local.x);
    float gapY = smoothstep(0.9, 0.97, local.y) + smoothstep(0.03, 0.0, local.y);
    float inGap = clamp(gapX + gapY, 0.0, 1.0) * peeled * 0.85;
    warped += vec2(inGap * 0.04, inGap * 0.025);
    return warped;
  }

  vec3 pixelBlockPeel3D(vec2 panel, float idx, vec3 para, float burstT, float seed) {
    float stepIdx = floor(burstT * uGlitchSteps);
    float rnd = hash21(vec2(stepIdx, seed + 79.0));
    vec2 uv = blockPeelUV(panel, stepIdx, seed, para, burstT);
    vec3 col = fetchPoster(uv, idx);
    vec2 uvR = blockPeelUV(panel, stepIdx, seed + 1.3, para * 1.12, burstT);
    vec2 uvB = blockPeelUV(panel, stepIdx, seed + 2.7, para * 0.88, burstT);
    col.r = fetchPoster(uvR, idx).r;
    col.b = fetchPoster(uvB, idx).b;
    float blockFlash = step(0.68, hash21(floor(panel * vec2(8.0, 10.0)) + stepIdx + seed));
    col = mix(col, col * vec3(0.55, 1.25, 1.35), blockFlash * 0.42);
    return col;
  }

  vec3 signalNoise3D(vec2 panel, float idx, vec3 para, float burstT, float seed) {
    float stepIdx = floor(burstT * uGlitchSteps);
    float rnd = hash21(vec2(stepIdx, seed + 55.0));
    vec2 noisyUV = panel + para.xy * (0.25 + rnd * 0.35);
    vec3 col = fetchPoster(noisyUV, idx);
    float noise = hash21(panel * 420.0 + vec2(stepIdx, seed + uTime * 0.5));
    float staticBand = step(0.68, noise) * step(0.45, rnd);
    col = mix(col, vec3(noise * 0.48, noise * 0.22, noise * 0.92), staticBand * 0.58);
    float grain = hash21(panel * 880.0 + stepIdx) * 0.16;
    col += vec3(grain * 0.32, grain * 0.52, grain * 0.78) * step(0.35, rnd);
    return col;
  }

  vec3 irregularFlicker3D(vec2 panel, float idx, vec3 para, float burstT, float seed) {
    float stepIdx = floor(burstT * uGlitchSteps);
    float rnd = hash21(vec2(stepIdx, seed + 71.0));
    float stepFrac = fract(burstT * uGlitchSteps);
    vec2 flickUV = panel + para.xy * sin(uTime * (6.0 + rnd * 12.0) + seed) * 0.04;
    vec3 col = fetchPoster(flickUV, idx);
    float flick1 = step(0.52, hash21(vec2(stepIdx + 7.0, seed)));
    float flick2 = step(0.75, hash21(vec2(stepIdx + 8.0, seed + stepFrac * 20.0)));
    float flick3 = step(0.35, sin(uTime * (16.0 + rnd * 38.0) + seed * 9.0) * 0.5 + 0.5);
    float flicker = max(flick1, max(flick2 * stepFrac, flick3));
    col *= 0.14 + flicker * 0.86;
    float flash = step(0.8, hash21(vec2(stepIdx + 99.0, seed)));
    col = mix(col, vec3(0.32, 0.85, 1.0), flash * stepFrac * 0.48);
    float flash2 = step(0.86, hash21(vec2(stepIdx + 101.0, seed)));
    col = mix(col, vec3(0.92, 0.15, 0.82), flash2 * stepFrac * 0.4);
    return col;
  }

  /** 统一 3D 断层艺术 — 按模式加权组合 */
  vec3 faultArt3DPoster(vec2 panel, float idx, float burstT, float seed, float mode) {
    float stepIdx = floor(burstT * uGlitchSteps);
    float rnd = hash21(vec2(stepIdx, seed));
    float stepFrac = fract(burstT * uGlitchSteps);
    vec3 para = parallaxBasis(seed);

    float wRgb = 1.0;
    float wScan = 1.0;
    float wBlock = 1.0;
    float wNoise = 0.0;
    float wFlick = 0.0;

    if (mode < 1.5) {
      wRgb = 1.0; wScan = 0.22; wBlock = 0.18; wNoise = 0.08; wFlick = 0.05;
    } else if (mode < 2.5) {
      wRgb = 0.28; wScan = 1.0; wBlock = 0.2; wNoise = 0.12; wFlick = 0.08;
    } else if (mode < 3.5) {
      wRgb = 0.25; wScan = 0.3; wBlock = 1.0; wNoise = 0.1; wFlick = 0.06;
    } else if (mode < 4.5) {
      wRgb = 0.45; wScan = 0.4; wBlock = 0.35; wNoise = 1.0; wFlick = 0.15;
    } else if (mode < 5.5) {
      wRgb = 0.4; wScan = 0.35; wBlock = 0.3; wNoise = 0.2; wFlick = 1.0;
    } else {
      wRgb = 1.0; wScan = 1.0; wBlock = 1.0; wNoise = 0.55; wFlick = 0.65;
    }

    vec3 col = vec3(0.0);
    float wSum = 0.0;

    if (wRgb > 0.01) {
      col += rgbZLayerSeparation(panel, idx, para, burstT, seed) * wRgb;
      wSum += wRgb;
    }
    if (wScan > 0.01) {
      col += scanlineHologramFloat(panel, idx, para, burstT, seed) * wScan;
      wSum += wScan;
    }
    if (wBlock > 0.01) {
      col += pixelBlockPeel3D(panel, idx, para, burstT, seed) * wBlock;
      wSum += wBlock;
    }
    if (wNoise > 0.01) {
      col += signalNoise3D(panel, idx, para, burstT, seed) * wNoise;
      wSum += wNoise;
    }
    if (wFlick > 0.01) {
      col += irregularFlicker3D(panel, idx, para, burstT, seed) * wFlick;
      wSum += wFlick;
    }

    col /= max(wSum, 0.001);

    float contrast = 1.65 + rnd * 2.2;
    col = clamp((col - 0.5) * contrast + 0.5, 0.0, 1.0);

    float flash = step(0.82, hash21(vec2(stepIdx + 99.0, seed)));
    col = mix(col, vec3(0.52, 0.88, 1.0), flash * stepFrac * 0.42);
    float flash2 = step(0.88, hash21(vec2(stepIdx + 150.0, seed)));
    col = mix(col, vec3(0.88, 0.22, 0.78), flash2 * stepFrac * 0.35);

    if (rnd > 0.74) {
      col = mix(col, vec3(1.0) - col, 0.22);
    }

    return col;
  }

  float brickSeamMask(vec2 xz) {
    return 0.0;
  }

  ${GLSL_GEOMETRIC_REFLECTION_SEAM}

  void main() {
    vec2 uv = vUv;
    vec2 panelOff = uReflect > 0.5 ? geoReflectionSeamDistortion(vWorldPos.xz) : vec2(0.0);
    vec2 panel = uv + panelOff;
    float edgeFade = smoothstep(0.0, 0.02, uv.x) * smoothstep(1.0, 0.98, uv.x)
                   * smoothstep(0.0, 0.02, uv.y) * smoothstep(1.0, 0.98, uv.y);

    float enabled = vGlitchEnabled;
    float interval = max(vGlitchInterval, 0.001);
    float phase = vGlitchPhase;
    float cycle = mod(uTime + phase, interval);
    float inBurst = enabled * step(cycle, uGlitchDuration);
    float burstT = clamp(cycle / max(uGlitchDuration, 0.001), 0.0, 1.0);
    float glitchMode = vGlitchMode;

    vec3 poster;
    if (inBurst > 0.5 && glitchMode > 0.5) {
      poster = faultArt3DPoster(panel, vPosterIndex, burstT, vSeed, glitchMode);
    } else {
      poster = fetchPoster(panel, vPosterIndex);
    }

    if (uReflect > 0.5) {
      float seamM = geoSeamMask(vWorldPos.xz);
      if (seamM > 0.06) {
        vec2 grid = uUseEdgeGapMask > 0.5
          ? fract(vWorldPos.xz / uBrickPitch)
          : fract((vWorldPos.xz - uBrickOrigin) / uBrickPitch);
        vec2 dte = min(grid, 1.0 - grid);
        bool vSeam = dte.x < dte.y;
        float sign = vSeam ? (grid.x > 0.5 ? 1.0 : -1.0) : (grid.y > 0.5 ? 1.0 : -1.0);
        vec2 pullDir = vSeam ? vec2(sign, 0.0) : vec2(0.0, sign);
        float pullAmt = seamM * (uDebugDistortedReflection > 0.5 ? 0.14 : 0.045);
        vec3 pLo = fetchPoster(panel - pullDir * pullAmt, vPosterIndex);
        vec3 pHi = fetchPoster(panel + pullDir * pullAmt, vPosterIndex);
        poster = vec3(pHi.r, poster.g, pLo.b);
      }
    }

    float scan = sin((uv.y + uTime * 0.45) * 180.0) * 0.022 + 0.978;
    poster *= scan;

    float luma = dot(poster, vec3(0.299, 0.587, 0.114));
    float emissiveMask = smoothstep(0.16, 0.68, luma);

    vec3 board = vec3(0.003, 0.002, 0.006);
    vec3 col = board * edgeFade;
    float posterGain = inBurst > 0.5 ? 2.55 : 1.82;
    col += poster * edgeFade * posterGain;
    col += poster * edgeFade * emissiveMask * uSignBloomBoost;
    col += vColor * emissiveMask * edgeFade * 0.38;

    if (inBurst > 0.5) {
      col += vColor * edgeFade * (0.48 + sin(burstT * 80.0) * 0.2);
      col += poster * edgeFade * emissiveMask * 0.38;
    }

    float a = edgeFade * 0.98;

    if (uReflect > 0.5) {
      float groundFade = smoothstep(0.0, -uReflectFadeDepth * 0.72, vWorldPos.y);
      vec3 viewDir = normalize(uCamPos - vWorldPos);
      float mirrorFresnel = pow(1.0 - clamp(dot(vec3(0.0, -1.0, 0.0), viewDir), 0.0, 1.0), uReflectFresnelPower);
      float horizDist = length(vWorldPos.xz - uCamPos.xz);
      float distFalloff = 1.0 - smoothstep(uReflectDistNear, uReflectDistFar, horizDist) * uReflectDistStrength;
      float blurMix = smoothstep(uReflectBlurNear, uReflectBlurFar, horizDist) * uReflectBlurFogMix * 0.65;
      float seamMask = brickSeamMask(vWorldPos.xz);
      float brickGain = uReflectSurfacePass > 0.5
        ? mix(uSurfaceReflectGain, uSurfaceReflectGain * 0.12, seamMask)
        : mix(0.22, uSeamReflectGain, seamMask);
      float blurScale = uReflectSurfacePass > 0.5
        ? mix(uSurfaceBlurScale, uSeamBlurScale, seamMask)
        : mix(0.55, uSeamBlurScale, seamMask);
      blurMix *= blurScale;

      a *= groundFade * mix(0.78, 0.96, mirrorFresnel);
      float alphaMask = uReflectSurfacePass > 0.5
        ? mix(1.0, 0.1, seamMask)
        : mix(0.36, 1.0, seamMask);
      a *= alphaMask;
      col *= uReflectGain * groundFade * uReflectBoost * distFalloff * mix(1.0, uReflectFresnelBoost, mirrorFresnel) * brickGain;
      if (uReflectSurfacePass < 0.5) {
        col = mix(col, col * 0.65, seamMask * 0.48);
      }
      col = mix(col, vec3(0.015, 0.01, 0.028), blurMix);
    }

    gl_FragColor = vec4(col, a);
  }
`;

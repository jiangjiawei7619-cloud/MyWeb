export const rebeccaHologramVert = /* glsl */ `
  uniform vec3 uCamPos;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** 常态 — 完整贴图，无 RGB 分离 */
export const rebeccaHologramCleanFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform sampler2D uMap;
  uniform float uBrightness;
  uniform float uOpacity;
  uniform float uMix;
  uniform float uBloomBoost;
  uniform float uNeonSpill;
  uniform float uHighlightKnee;
  uniform float uLumaCap;
  uniform float uDistFalloffNear;
  uniform float uDistFalloffFar;
  uniform float uDistFalloffMin;
  uniform float uReflect;
  uniform float uReflectBoost;
  uniform float uReflectGain;
  uniform float uReflectFadeDepth;
  uniform float uReflectDistNear;
  uniform float uReflectDistFar;
  uniform float uReflectDistStrength;
  uniform float uReflectFresnelPower;
  uniform float uReflectFresnelBoost;
  uniform float uReflectBlurNear;
  uniform float uReflectBlurFar;
  uniform float uReflectBlurFogMix;
  uniform float uReflectDimmer;
  uniform float uReflectAlphaFloor;
  uniform float uReflectBlurScale;
  uniform vec3 uCamPos;
  uniform float uSignalDropoutT;
  uniform float uSignalDropoutSteps;
  uniform float uSignalDropoutBands;
  uniform float uSignalDropoutStrength;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash21Clean(vec2 p) {
    return fract(sin(dot(p, vec2(43.17, 291.73))) * 43758.5453);
  }

  void main() {
    float dropoutStep = floor(uSignalDropoutT * uSignalDropoutSteps);
    float band = floor(vUv.y * uSignalDropoutBands);
    float bandRand = hash21Clean(vec2(band, dropoutStep + 19.0));
    float activeBand = step(0.42, bandRand);
    float thinSlice = step(0.78, fract(vUv.y * uSignalDropoutBands + bandRand));
    float signalShift =
      (hash21Clean(vec2(band + 3.0, dropoutStep + 7.0)) - 0.5) *
      uSignalDropoutStrength *
      uSignalDropoutT *
      activeBand;
    vec2 signalUv = vUv + vec2(signalShift, 0.0);

    vec4 tex = texture2D(uMap, signalUv);
    float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    float alpha = smoothstep(0.035, 0.14, lum) * tex.a;
    if (alpha < 0.02) discard;

    float breathe = 0.96 + 0.04 * sin(uTime * 1.15);
    float scan = sin((vUv.y + uTime * 0.18) * 220.0) * 0.012 + 0.988;
    float tone = breathe * scan;

    vec3 col = tex.rgb * uBrightness * tone;
    float emissiveMask = smoothstep(0.14, 0.58, lum);
    if (uReflect < 0.5) {
      float camDist = length(uCamPos - vWorldPos);
      float distGain = mix(1.0, uDistFalloffMin, smoothstep(uDistFalloffNear, uDistFalloffFar, camDist));
      float farKneeBoost = 1.0 + smoothstep(uDistFalloffNear, uDistFalloffFar, camDist) * 0.95;

      float peak = max(max(col.r, col.g), col.b);
      col /= (1.0 + peak * uHighlightKnee * farKneeBoost);

      float lumaCore = dot(col, vec3(0.299, 0.587, 0.114));
      if (lumaCore > uLumaCap) {
        col *= uLumaCap / lumaCore;
      }

      // 霓虹溢光 — 轻 blur 采样 + 边缘光晕（仅本体）
      vec2 texel = vec2(0.0018, 0.0018);
      vec3 s0 = texture2D(uMap, signalUv + vec2(texel.x, 0.0)).rgb;
      vec3 s1 = texture2D(uMap, signalUv - vec2(texel.x, 0.0)).rgb;
      vec3 s2 = texture2D(uMap, signalUv + vec2(0.0, texel.y)).rgb;
      vec3 s3 = texture2D(uMap, signalUv - vec2(0.0, texel.y)).rgb;
      vec3 soft = (tex.rgb + s0 + s1 + s2 + s3) * 0.2;
      float softLum = dot(soft, vec3(0.299, 0.587, 0.114));
      float halo = smoothstep(0.05, 0.32, softLum) * emissiveMask;
      float rim = smoothstep(0.1, 0.42, lum) * (1.0 - smoothstep(0.62, 0.96, lum));
      vec3 spillTint = soft * vec3(1.14, 0.9, 0.7);
      float spillGain = uNeonSpill * distGain;

      col += spillTint * halo * spillGain * 0.62;
      col += tex.rgb * rim * spillGain * vec3(1.18, 0.92, 0.68) * 0.38;

      float bloomScale = uBloomBoost * distGain;
      col += tex.rgb * emissiveMask * bloomScale;
      col += tex.rgb * emissiveMask * emissiveMask * bloomScale * 0.28;

      float lumaOut = dot(col, vec3(0.299, 0.587, 0.114));
      float spillCap = uLumaCap * 1.22;
      if (lumaOut > spillCap) {
        col *= spillCap / lumaOut;
      }
    }
    float a = alpha * uOpacity * tone * uMix;
    float dropoutCut = activeBand * thinSlice * uSignalDropoutT;
    col *= 1.0 - dropoutCut * 0.28;
    a *= 1.0 - dropoutCut * 0.34;

    if (uReflect > 0.5) {
      col = tex.rgb * uBrightness * tone * uReflectDimmer;
      float emissiveMask = smoothstep(0.16, 0.68, lum);
      a = max(a, emissiveMask * uReflectAlphaFloor) * uReflectDimmer;
      col *= 1.0 - dropoutCut * 0.2;
      a *= 1.0 - dropoutCut * 0.22;

      float belowGround = max(0.0, -vWorldPos.y);
      float groundAlphaFade = 1.0 - smoothstep(0.0, uReflectFadeDepth, belowGround);
      vec3 viewDir = normalize(uCamPos - vWorldPos);
      float mirrorFresnel = pow(1.0 - clamp(dot(vec3(0.0, -1.0, 0.0), viewDir), 0.0, 1.0), uReflectFresnelPower);
      float horizDist = length(vWorldPos.xz - uCamPos.xz);
      float distFalloff = 1.0 - smoothstep(uReflectDistNear, uReflectDistFar, horizDist) * uReflectDistStrength;
      float blurMix = smoothstep(uReflectBlurNear, uReflectBlurFar, horizDist) * uReflectBlurFogMix * uReflectBlurScale;

      col *= distFalloff * mix(0.96, 1.0, mirrorFresnel);
      col = mix(col, vec3(0.015, 0.01, 0.028), blurMix * 0.4);
      a *= groundAlphaFade * mix(0.88, 0.98, mirrorFresnel);
    }

    gl_FragColor = vec4(col, a);
  }
`;

/** burst — 单通道物理层 + 3D 故障 */
export const rebeccaHologramLayerFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform sampler2D uMap;
  uniform vec3 uCamPos;
  uniform float uChannel;
  uniform float uBurstT;
  uniform float uGlitchSteps;
  uniform float uLayerGain;
  uniform float uMix;
  uniform float uReflect;
  uniform float uReflectBoost;
  uniform float uReflectGain;
  uniform float uReflectFadeDepth;
  uniform float uReflectDistNear;
  uniform float uReflectDistFar;
  uniform float uReflectDistStrength;
  uniform float uReflectFresnelPower;
  uniform float uReflectFresnelBoost;
  uniform float uReflectBlurNear;
  uniform float uReflectBlurFar;
  uniform float uReflectBlurFogMix;
  uniform float uReflectDimmer;
  uniform float uReflectAlphaFloor;
  uniform float uReflectBlurScale;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453);
  }

  vec4 sampleKeyed(vec2 uv) {
    vec4 c = texture2D(uMap, uv);
    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    c.a = smoothstep(0.035, 0.14, lum) * c.a;
    return c;
  }

  vec2 glitchUV(vec2 uv) {
    float stepIdx = floor(uBurstT * uGlitchSteps);
    float rnd = hash21(vec2(stepIdx, uChannel * 17.0));

    float yTop = hash21(vec2(stepIdx + 1.0, uChannel)) * 0.55;
    float yBot = yTop + 0.04 + hash21(vec2(stepIdx + 2.0, uChannel)) * 0.22;
    float inSlice = step(yTop, uv.y) * step(uv.y, yBot);
    float xShift = (hash21(vec2(stepIdx + 3.0, uChannel)) - 0.5) * 0.38;
    float yShift = (hash21(vec2(stepIdx + 4.0, uChannel)) - 0.5) * 0.14;

    vec2 shifted = uv + vec2(xShift, yShift) * inSlice;

    float blockX = floor(uv.x * 7.0 + stepIdx);
    float blockY = floor(uv.y * 9.0);
    if (hash21(vec2(blockX, blockY + stepIdx)) > 0.58) {
      shifted += vec2(
        (hash21(vec2(blockX + 1.0, stepIdx)) - 0.5) * 0.22,
        (hash21(vec2(blockY + 2.0, stepIdx)) - 0.5) * 0.08
      );
    }

    vec3 viewDir = normalize(uCamPos - vWorldPos);
    vec2 tangent = normalize(viewDir.xz + vec2(0.0001, 0.0));
    float grazing = pow(1.0 - clamp(abs(viewDir.y), 0.0, 1.0), 1.2);
    shifted += tangent * (uChannel - 1.0) * 0.012 * (1.0 + grazing);

    return shifted;
  }

  void main() {
    if (uMix < 0.01) discard;

    vec2 uv = glitchUV(vUv);
    vec4 tex = sampleKeyed(uv);
    if (tex.a < 0.02) discard;

    vec3 col;
    if (uChannel < 0.5) {
      col = vec3(tex.r, 0.0, 0.0);
      col *= vec3(1.25, 0.85, 1.05);
    } else if (uChannel < 1.5) {
      col = vec3(0.0, tex.g, 0.0);
      col *= vec3(0.9, 1.12, 0.95);
    } else {
      col = vec3(0.0, 0.0, tex.b);
      col *= vec3(0.85, 1.05, 1.35);
    }

    float scan = sin((vUv.y + uTime * 0.45) * 260.0) * 0.06 + 0.94;
    col *= scan * uLayerGain;

    float grain = hash21(vUv * 480.0 + uTime * 40.0) * 0.06;
    col += grain;

    float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    float a = tex.a * uMix;

    if (uReflect > 0.5) {
      col *= uReflectDimmer;
      float emissiveMask = smoothstep(0.16, 0.68, lum);
      a = max(a, emissiveMask * uReflectAlphaFloor * 0.72) * uReflectDimmer;

      float belowGround = max(0.0, -vWorldPos.y);
      float groundAlphaFade = 1.0 - smoothstep(0.0, uReflectFadeDepth, belowGround);
      vec3 viewDir = normalize(uCamPos - vWorldPos);
      float mirrorFresnel = pow(1.0 - clamp(dot(vec3(0.0, -1.0, 0.0), viewDir), 0.0, 1.0), uReflectFresnelPower);
      float horizDist = length(vWorldPos.xz - uCamPos.xz);
      float distFalloff = 1.0 - smoothstep(uReflectDistNear, uReflectDistFar, horizDist) * uReflectDistStrength;
      float blurMix = smoothstep(uReflectBlurNear, uReflectBlurFar, horizDist) * uReflectBlurFogMix * uReflectBlurScale;

      col *= distFalloff * mix(0.96, 1.0, mirrorFresnel);
      col = mix(col, vec3(0.015, 0.01, 0.028), blurMix * 0.4);
      a *= groundAlphaFade * mix(0.88, 0.98, mirrorFresnel);
    }

    gl_FragColor = vec4(col, a);
  }
`;

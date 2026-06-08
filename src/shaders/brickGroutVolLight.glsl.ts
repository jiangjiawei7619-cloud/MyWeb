/** SASMy 风格砖缝体积光 — 径向渐变 + 噪点扭曲 + 向上弯曲光线 + Fresnel */
export const brickGroutVolLightVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec3 pos = position;
    #ifdef USE_INSTANCING
      pos = (instanceMatrix * vec4(pos, 1.0)).xyz;
    #endif
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const brickGroutVolLightFrag = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uCamPos;
  uniform vec3 uGlowColor;
  uniform float uFresnelPower;
  uniform float uNoiseScale;
  uniform float uNoiseStrength;
  uniform float uRayStrength;
  uniform float uTwistStrength;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * valueNoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;

    float n1 = fbm(uv * uNoiseScale + vec2(uTime * 0.11, -uTime * 0.08));
    float n2 = fbm(uv * uNoiseScale * 1.7 + vec2(-uTime * 0.09, uTime * 0.13));
    vec2 warp = vec2(n1, n2) - 0.5;
    uv += warp * uNoiseStrength;

    vec2 centered = (uv - 0.5) * vec2(1.0, 0.42);
    float radial = 1.0 - smoothstep(0.08, 1.0, length(centered));
    radial = pow(radial, 1.65);

    float seamAxis = smoothstep(0.02, 0.12, min(uv.x, 1.0 - uv.x));
    seamAxis *= smoothstep(0.02, 0.12, min(uv.y, 1.0 - uv.y));
    radial *= seamAxis;

    float twist = sin(uv.y * 14.0 + n1 * 6.283 + uTime * 1.4) * uTwistStrength;
    twist += sin(uv.x * 9.0 - uTime * 0.85 + n2 * 4.0) * uTwistStrength * 0.45;

    float rayCoord = uv.y * 10.0 + twist + uTime * 1.25;
    float rays = smoothstep(0.52, 0.98, sin(rayCoord) * 0.5 + 0.5);
    rays *= smoothstep(0.0, 0.65, uv.y);
    rays *= radial;

    float caustic = pow(max(sin((uv.x + twist * 0.5) * 22.0 - uTime * 2.2), 0.0), 3.2);
    caustic *= radial * 0.35;

    vec3 viewDir = normalize(uCamPos - vWorldPos);
    float ndv = clamp(dot(vec3(0.0, 1.0, 0.0), viewDir), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, uFresnelPower);

    vec3 col = uGlowColor * (radial * 1.15 + rays * uRayStrength + caustic);
    col *= fresnel;

    float alpha = clamp(radial * fresnel * 0.92 + rays * fresnel * 0.35, 0.0, 1.0);
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(col, alpha);
  }
`;

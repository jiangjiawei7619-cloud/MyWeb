export const CYBER_GROUND_MAX_RIPPLES = 8;

export const cyberGroundVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uFlat;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform vec4 uRipples[${CYBER_GROUND_MAX_RIPPLES}];
  uniform int uRippleCount;

  varying vec2 vUv;
  varying float vElev;
  varying vec3 vWorldPos;

  float groundWave(vec2 p) {
    float e = 0.0;
    e += sin(p.x * 0.08 + uTime * 0.4) * cos(p.y * 0.08 - uTime * 0.3) * 0.7;
    e += sin(length(p) * 0.12 - uTime * 0.7) * 0.3;
    return e;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    vec2 g = pos.xy;

    float e = 0.0;
    if (uFlat < 0.5) {
      e = groundWave(g);
      float md = distance(g, uMouse);
      e += exp(-md * md * 0.006) * uMouseStrength * 2.0;
      for (int i = 0; i < ${CYBER_GROUND_MAX_RIPPLES}; i++) {
        if (i >= uRippleCount) break;
        vec4 r = uRipples[i];
        float age = uTime - r.z;
        if (age < 0.0 || age > 3.4) continue;
        float d = distance(g, r.xy);
        float ring = sin(d * 0.5 - age * 5.5) * exp(-d * 0.03) * exp(-age * 1.6);
        e += ring * r.w * 1.8;
      }
    }

    pos.z += e;
    vElev = e;
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const cyberGroundFragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uFlat;
  uniform float uBrickOverlay;
  uniform vec3 uGround;
  uniform vec3 uEmber;
  uniform vec3 uAmber;
  uniform float uIntensity;
  uniform vec3 uCamPos;
  uniform float uFresnelPower;
  uniform float uFresnelAlphaMin;
  uniform float uFresnelAlphaMax;
  uniform float uEnvReflectStrength;
  uniform float uSpecularStrength;
  uniform float uGridAlphaBoost;
  uniform float uBrickPitch;
  uniform float uBrickGap;
  uniform vec2 uBrickOrigin;
  uniform float uSeamWetBoost;
  uniform float uSurfaceWetBoost;

  varying vec2 vUv;
  varying float vElev;
  varying vec3 vWorldPos;

  float brickSeamMask(vec2 xz) {
    vec2 inCell = fract((xz - uBrickOrigin) / uBrickPitch) * uBrickPitch;
    float gapStart = uBrickPitch - uBrickGap;
    float seamX = 1.0 - smoothstep(-uBrickGap * 0.06, uBrickGap * 0.52, inCell.x - gapStart);
    float seamZ = 1.0 - smoothstep(-uBrickGap * 0.06, uBrickGap * 0.52, inCell.y - gapStart);
    return clamp(max(seamX, seamZ), 0.0, 1.0);
  }

  void main() {
    vec2 gv = fract(vUv * 90.0) - 0.5;
    float line = smoothstep(0.46, 0.5, max(abs(gv.x), abs(gv.y)));
    if (uBrickOverlay > 0.5) {
      line *= 0.08;
    }

    vec3 col = uGround;
    col += uEmber * line * 0.28;

    float scan = pow(smoothstep(0.0, 1.0, sin(vWorldPos.z * 0.05 - uTime * 0.8)), 8.0);
    col += uAmber * scan * 0.16;
    if (uFlat < 0.5) {
      col += uAmber * smoothstep(0.4, 1.6, vElev) * 0.25;
    }

    float dist = length(vWorldPos.xz);
    float fade = 1.0 - smoothstep(60.0, 220.0, dist);
    col *= fade;

    float alpha;
    if (uFlat > 0.5) {
      vec3 viewDir = normalize(uCamPos - vWorldPos);
      vec3 groundNormal = vec3(0.0, 1.0, 0.0);
      float ndv = clamp(dot(groundNormal, viewDir), 0.0, 1.0);
      float fresnel = pow(1.0 - ndv, uFresnelPower);
      float seamMask = uBrickOverlay > 0.5 ? brickSeamMask(vWorldPos.xz) : 0.0;
      float wetBoost = uBrickOverlay > 0.5
        ? mix(uSurfaceWetBoost, uSeamWetBoost, seamMask)
        : 1.0;

      float horizon = pow(1.0 - abs(viewDir.y), 3.6);
      vec3 envReflect = mix(uGround, uEmber * 0.55 + uAmber * 0.32, horizon);
      envReflect += uAmber * pow(max(viewDir.y, 0.0), 6.0) * 0.06;
      col = mix(col, envReflect, fresnel * uEnvReflectStrength * wetBoost);

      vec3 lightDir = normalize(vec3(sin(uTime * 0.22 + vWorldPos.x * 0.01), 0.85, cos(uTime * 0.18 + vWorldPos.z * 0.012)));
      float spec = pow(max(dot(reflect(-viewDir, groundNormal), lightDir), 0.0), 48.0);
      col += uAmber * spec * fresnel * uSpecularStrength * wetBoost;

      float wetSheen = pow(fresnel, 1.6) * (0.08 + line * 0.18);
      col += mix(uEmber, uAmber, 0.45) * wetSheen * wetBoost;

      if (uBrickOverlay > 0.5) {
        col = mix(col, col * 0.78, seamMask * 0.32);
      }

      col *= uIntensity;

      float farInk = smoothstep(70.0, 200.0, dist);
      alpha = mix(uFresnelAlphaMin, uFresnelAlphaMax, fresnel);
      alpha += line * uGridAlphaBoost + farInk * 0.34;
      if (uBrickOverlay > 0.5) {
        alpha *= mix(0.92, 1.08, seamMask);
      }
      alpha = clamp(alpha, 0.0, 0.74);
    } else {
      col *= uIntensity;
      float farInk = smoothstep(70.0, 200.0, dist);
      alpha = clamp(0.1 + line * 0.2 + scan * 0.1 + farInk * 0.58, 0.0, 0.86);
    }

    gl_FragColor = vec4(col, alpha);
  }
`;

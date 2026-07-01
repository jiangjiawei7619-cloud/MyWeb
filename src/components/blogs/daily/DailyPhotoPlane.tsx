import { memo, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  DAILY_GLITCH_REVEAL_CONFIG,
  DAILY_GLITCH_INTENSITY_PRESETS,
  DEBUG_DAILY_GLITCH,
  type DailyPhoto,
} from '@/components/blogs/daily/dailyPhotoWallData';

type RuntimeWallConfig = {
  columns: number;
  gapX: number;
  gapY: number;
  planeWidth: number;
  planeHeight: number;
  maxScrollDelta: number;
  maxScrollVelocity: number;
  maxCurve: number;
  maxLift: number;
  cylinderArc: number;
  shaderDistortionStrength: number;
  entryStagger: number;
  entryDuration: number;
};

export type DailyPhotoHoverPayload = {
  photo: DailyPhoto;
  clientX: number;
  clientY: number;
};

type DailyPhotoPlaneProps = {
  photo: DailyPhoto;
  index: number;
  sourceIndex: number;
  totalRows: number;
  texture: THREE.Texture;
  config: RuntimeWallConfig;
  totalHeight: number;
  maxWallHalfHeight: number;
  planeGeometry: THREE.PlaneGeometry;
  currentScrollRef: MutableRefObject<number>;
  smoothVelocityRef: MutableRefObject<number>;
  curveStrengthRef: MutableRefObject<number>;
  liftRef: MutableRefObject<number>;
  reducedMotion: boolean;
  enableShaderDistortion: boolean;
  onHover: (payload: DailyPhotoHoverPayload | null) => void;
  onSelect: (photo: DailyPhoto) => void;
};

type PhotoEntryFx = {
  seed: number;
  entryDelay: number;
  bootDuration: number;
  glitchBurstA: number;
  glitchBurstB: number;
  glitchStrength: number;
};

const ACCENT_COLORS: Record<NonNullable<DailyPhoto['accent']>, string> = {
  red: '#ff5357',
  cyan: '#41f4ff',
  violet: '#a66cff',
};

const GLITCH_INTENSITY =
  DAILY_GLITCH_INTENSITY_PRESETS[DAILY_GLITCH_REVEAL_CONFIG.glitchIntensity];

const vertexShader = `
  uniform float uCylinderAmount;
  uniform float uCenterTheta;
  uniform float uCylinderRadius;
  uniform float uCylinderCenterY;
  uniform float uCylinderCenterZ;
  uniform float uCylinderMaxSag;
  uniform float uLift;

  varying vec2 vUv;

  void main() {
    vUv = uv;

    vec3 bentPosition = position;
    float safeRadius = max(uCylinderRadius, 0.001);
    float theta = uCenterTheta + position.y / safeRadius;
    float curvedLocalY = sin(theta) * safeRadius - uCylinderCenterY;
    float inwardCylinderZ = (safeRadius - cos(theta) * safeRadius) - uCylinderMaxSag;
    float curvedLocalZ = inwardCylinderZ - uCylinderCenterZ;

    bentPosition.y = mix(position.y, curvedLocalY, uCylinderAmount);
    bentPosition.z += mix(0.0, curvedLocalZ, uCylinderAmount) + uLift;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(bentPosition, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;

  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uEntryProgress;
  uniform float uVelocity;
  uniform float uHover;
  uniform float uGlitchStrength;
  uniform float uDistortionStrength;
  uniform float uImageAspect;
  uniform float uPlaneAspect;
  uniform float uFarFade;
  uniform float uSeed;
  uniform float uMaxChromaticOffset;
  uniform float uMaxSliceOffset;
  uniform float uSliceCount;
  uniform float uBootGlow;
  uniform float uEdgeGlowStrength;
  uniform float uScanlineOpacity;
  uniform float uNoiseBlockOpacity;
  uniform vec3 uAccentColor;

  varying vec2 vUv;

  vec2 coverUv(vec2 uv) {
    vec2 centered = uv - 0.5;
    if (uImageAspect > uPlaneAspect) {
      centered.x *= uPlaneAspect / uImageAspect;
    } else {
      centered.y *= uImageAspect / uPlaneAspect;
    }
    return centered + 0.5;
  }

  float edgeMask(vec2 uv) {
    vec2 edge = smoothstep(vec2(0.0), vec2(0.045), uv) * smoothstep(vec2(0.0), vec2(0.045), 1.0 - uv);
    return edge.x * edge.y;
  }

  float hash11(float value) {
    return fract(sin(value * 127.1) * 43758.5453123);
  }

  void main() {
    float reveal = smoothstep(0.04, 0.68, uEntryProgress);

    vec2 uv = coverUv(vUv);
    float velocity = clamp(uVelocity, -1.0, 1.0);
    float absVelocity = abs(velocity);
    float glitch = clamp(uGlitchStrength, 0.0, 1.0);
    float bootGlow = clamp(uBootGlow, 0.0, 1.0);

    uv.x += sin(vUv.y * 12.0 + uTime * 1.2) * velocity * 0.0035 * uDistortionStrength;
    uv.y += sin(vUv.x * 8.0 + uTime) * absVelocity * 0.0026 * uDistortionStrength;

    float sliceIndex = floor(vUv.y * uSliceCount);
    float sliceTime = floor((uTime + uSeed * 0.37) * 18.0);
    float sliceNoise = hash11(sliceIndex + uSeed * 31.7 + sliceTime * 2.71);
    float sliceGate = step(0.76, sliceNoise) * glitch;
    float sliceDirection = mix(-1.0, 1.0, step(0.5, hash11(sliceIndex + uSeed * 67.0)));
    float sliceAmount = (0.42 + hash11(sliceIndex + uSeed * 91.0) * 0.58) * uMaxSliceOffset;
    uv.x += sliceGate * sliceDirection * sliceAmount;

    float entryChroma = glitch * uMaxChromaticOffset;
    float chroma = (entryChroma + absVelocity * 0.0014 + uHover * 0.0015) * uDistortionStrength;
    vec4 base = texture2D(uTexture, uv);
    vec4 red = texture2D(uTexture, uv + vec2(chroma, 0.0));
    vec4 blue = texture2D(uTexture, uv - vec2(chroma, 0.0));

    vec3 color = vec3(red.r, base.g, blue.b);
    float scanline = 1.0 - (0.045 + absVelocity * 0.025) * (0.5 + 0.5 * sin(vUv.y * 760.0));
    float vignette = mix(0.68, 1.0, edgeMask(vUv));
    color *= scanline * vignette;
    color *= mix(0.48, 1.0, smoothstep(0.0, 0.72, uEntryProgress));

    float decorativeScan = 0.5 + 0.5 * sin((vUv.y + uTime * 0.62 + uSeed) * 260.0);
    color += uAccentColor * decorativeScan * uScanlineOpacity * max(bootGlow, glitch * 0.5) * 0.045;

    vec2 blockUv = floor(vUv * vec2(18.0, 10.0));
    float blockTime = floor((uTime + uSeed) * 10.0);
    float blockRand = hash11(blockUv.x * 17.0 + blockUv.y * 43.0 + uSeed * 101.0 + blockTime);
    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edgeProximity = 1.0 - smoothstep(0.08, 0.38, edgeDistance);
    float blockMask = step(0.955, blockRand) * glitch * (0.35 + edgeProximity * 0.65);
    vec3 dataBlockColor = mix(uAccentColor, vec3(1.0, 0.18, 0.82), step(0.5, hash11(blockRand + uSeed * 7.0)));
    color = mix(color, dataBlockColor, blockMask * uNoiseBlockOpacity);

    vec3 accent = uAccentColor * (0.045 + uHover * 0.12 + bootGlow * 0.12 + glitch * 0.08);
    float borderGlow = 1.0 - smoothstep(0.0, 0.055, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
    float tightEdgeGlow = 1.0 - smoothstep(0.0, 0.035, edgeDistance);
    float cornerMask =
      (1.0 - smoothstep(0.04, 0.2, min(vUv.x, 1.0 - vUv.x))) *
      (1.0 - smoothstep(0.04, 0.2, min(vUv.y, 1.0 - vUv.y)));
    float bootBorder = (bootGlow + glitch * 0.32) * uEdgeGlowStrength;
    color += accent;
    color += uAccentColor * borderGlow * (0.08 + uHover * 0.18);
    color += uAccentColor * tightEdgeGlow * bootBorder * 0.85;
    color += uAccentColor * cornerMask * bootBorder * 0.38;

    float alpha = reveal * uFarFade;
    alpha *= 0.82 + uHover * 0.18;
    alpha = max(alpha, tightEdgeGlow * bootGlow * uFarFade * 0.58);
    alpha = max(alpha, blockMask * uFarFade * 0.32);

    gl_FragColor = vec4(color, alpha);
  }
`;

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function smooth01(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function pulse(localProgress: number, center: number, width: number) {
  const distance = Math.abs(localProgress - center);
  if (distance >= width) return 0;
  return 1 - smooth01(distance / width);
}

function hashPhotoId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function getTextureAspect(texture: THREE.Texture, fallback = 1.57) {
  const image = texture.image as { width?: number; height?: number } | undefined;
  if (!image?.width || !image.height) return fallback;
  return image.width / image.height;
}

function DailyPhotoPlane({
  photo,
  index,
  sourceIndex,
  totalRows,
  texture,
  config,
  totalHeight,
  maxWallHalfHeight,
  planeGeometry,
  currentScrollRef,
  smoothVelocityRef,
  curveStrengthRef,
  liftRef,
  reducedMotion,
  enableShaderDistortion,
  onHover,
  onSelect,
}: DailyPhotoPlaneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const hoverTargetRef = useRef(0);
  const hoverAmountRef = useRef(0);
  const entryCompleteRef = useRef(false);

  const accentColor = useMemo(
    () => new THREE.Color(ACCENT_COLORS[photo.accent ?? 'cyan']),
    [photo.accent],
  );

  const placement = useMemo(() => {
    const row = Math.floor(index / config.columns);
    const column = index % config.columns;
    const x = (column - (config.columns - 1) * 0.5) * config.gapX;
    const baseY = ((totalRows - 1) * 0.5 - row) * config.gapY;
    const depth = Math.sin((sourceIndex + 1) * 12.9898 + row * 0.37) * 0.055;

    return { x, baseY, depth };
  }, [config.columns, config.gapX, config.gapY, index, sourceIndex, totalRows]);

  const entryFx = useMemo<PhotoEntryFx>(() => {
    const row = Math.floor(index / config.columns);
    const column = index % config.columns;
    const centerColumn = (config.columns - 1) * 0.5;
    const seed = hashPhotoId(`${photo.id}:${sourceIndex}`);
    const entryDelay =
      DAILY_GLITCH_REVEAL_CONFIG.entryDelay +
      row * DAILY_GLITCH_REVEAL_CONFIG.entryStaggerBase +
      Math.abs(column - centerColumn) * 0.024 +
      seed * DAILY_GLITCH_REVEAL_CONFIG.entryJitter;
    const glitchStrength = THREE.MathUtils.lerp(
      GLITCH_INTENSITY.maxGlitchStrength * 0.72,
      GLITCH_INTENSITY.maxGlitchStrength,
      hashPhotoId(`${photo.id}:strength:${sourceIndex}`),
    );
    const burstSeedA = hashPhotoId(`${photo.id}:burst-a:${index}`);
    const burstSeedB = hashPhotoId(`${photo.id}:burst-b:${sourceIndex}`);

    return {
      seed,
      entryDelay,
      bootDuration: DAILY_GLITCH_REVEAL_CONFIG.bootBorderDuration,
      glitchBurstA: 0.28 + burstSeedA * 0.08,
      glitchBurstB: 0.52 + burstSeedB * 0.06,
      glitchStrength,
    };
  }, [config.columns, index, photo.id, sourceIndex]);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uEntryProgress: { value: reducedMotion ? 1 : 0 },
      uVelocity: { value: 0 },
      uHover: { value: 0 },
      uGlitchStrength: { value: 0 },
      uDistortionStrength: { value: enableShaderDistortion ? config.shaderDistortionStrength : 0 },
      uImageAspect: { value: photo.aspectRatio ?? getTextureAspect(texture) },
      uPlaneAspect: { value: config.planeWidth / config.planeHeight },
      uFarFade: { value: 1 },
      uSeed: { value: entryFx.seed },
      uMaxChromaticOffset: { value: GLITCH_INTENSITY.maxChromaticOffset },
      uMaxSliceOffset: { value: GLITCH_INTENSITY.maxSliceOffset },
      uSliceCount: { value: DAILY_GLITCH_REVEAL_CONFIG.sliceCount },
      uBootGlow: { value: 0 },
      uEdgeGlowStrength: { value: DAILY_GLITCH_REVEAL_CONFIG.bootBorderStrength },
      uScanlineOpacity: { value: DAILY_GLITCH_REVEAL_CONFIG.scanlineOpacity },
      uNoiseBlockOpacity: { value: DAILY_GLITCH_REVEAL_CONFIG.noiseBlockOpacity },
      uAccentColor: { value: accentColor.clone() },
      uCylinderAmount: { value: 0 },
      uCenterTheta: { value: 0 },
      uCylinderRadius: { value: maxWallHalfHeight },
      uCylinderCenterY: { value: 0 },
      uCylinderCenterZ: { value: 0 },
      uCylinderMaxSag: { value: 0 },
      uLift: { value: 0 },
    }),
    [
      accentColor,
      config.planeHeight,
      config.planeWidth,
      config.cylinderArc,
      config.maxCurve,
      config.shaderDistortionStrength,
      enableShaderDistortion,
      entryFx.seed,
      maxWallHalfHeight,
      photo.aspectRatio,
      reducedMotion,
      texture,
    ],
  );

  const material = useMemo(() => {
    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
    });
    materialRef.current = shaderMaterial;
    return shaderMaterial;
  }, [uniforms]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    uniforms.uTexture.value = texture;
    uniforms.uImageAspect.value = photo.aspectRatio ?? getTextureAspect(texture);
  }, [photo.aspectRatio, texture, uniforms]);

  useEffect(() => {
    uniforms.uAccentColor.value.copy(accentColor);
  }, [accentColor, uniforms]);

  useEffect(() => {
    entryCompleteRef.current = reducedMotion;
    uniforms.uEntryProgress.value = entryCompleteRef.current ? 1 : 0;
    uniforms.uGlitchStrength.value = 0;
    uniforms.uBootGlow.value = 0;
  }, [reducedMotion, uniforms]);

  const emitHover = (event: ThreeEvent<PointerEvent>, active: boolean) => {
    event.stopPropagation();
    hoverTargetRef.current = active ? 1 : 0;
    onHover(
      active
        ? {
            photo,
            clientX: event.nativeEvent.clientX,
            clientY: event.nativeEvent.clientY,
          }
        : null,
    );
  };

  useFrame((state, delta) => {
    const group = groupRef.current;
    const shaderMaterial = materialRef.current;
    if (!group || !shaderMaterial) return;

    const velocity = smoothVelocityRef.current;
    const speed = clamp01(Math.abs(velocity) / Math.max(config.maxScrollVelocity, 0.001));
    const shaderVelocity = THREE.MathUtils.clamp(
      (velocity / Math.max(config.maxScrollVelocity, 0.001)) * 0.72,
      -0.72,
      0.72,
    );
    const y = THREE.MathUtils.euclideanModulo(
      placement.baseY - currentScrollRef.current + totalHeight * 0.5,
      totalHeight,
    ) - totalHeight * 0.5;
    const normalizedY = maxWallHalfHeight > 0 ? y / maxWallHalfHeight : 0;
    const curveStrength = curveStrengthRef.current;
    const lift = -liftRef.current * 0.35;
    const halfArc = config.cylinderArc * 0.5;
    const radius = maxWallHalfHeight / Math.max(Math.sin(halfArc), 0.08);
    const cylinderMaxSag = radius - Math.cos(halfArc) * radius;
    const centerTheta = THREE.MathUtils.clamp(normalizedY, -1, 1) * halfArc;
    const cylinderCenterY = Math.sin(centerTheta) * radius;
    const cylinderCenterZ = (radius - Math.cos(centerTheta) * radius) - cylinderMaxSag;
    const cylinderAmount = reducedMotion
      ? 0
      : clamp01((curveStrength - 0.12) / Math.max(config.maxCurve * 0.96, 0.001));
    const hoverAmount = THREE.MathUtils.damp(hoverAmountRef.current, hoverTargetRef.current, 9, delta);
    const elapsedFromEntry = state.clock.elapsedTime - entryFx.entryDelay;
    const entryDuration = DAILY_GLITCH_REVEAL_CONFIG.entryDuration;
    const revealProgress =
      reducedMotion
        ? 1
        : clamp01(elapsedFromEntry / entryDuration);
    const reveal = reducedMotion ? 1 : smooth01(revealProgress);
    const bootProgress = reducedMotion ? 1 : clamp01(elapsedFromEntry / entryFx.bootDuration);
    const bootGlow =
      reducedMotion || !DAILY_GLITCH_REVEAL_CONFIG.enabled
        ? 0
        : Math.sin(bootProgress * Math.PI) * DAILY_GLITCH_REVEAL_CONFIG.bootBorderStrength;
    const burstWidth = DAILY_GLITCH_REVEAL_CONFIG.glitchBurstDuration / entryDuration;
    const burstA = pulse(revealProgress, entryFx.glitchBurstA, burstWidth);
    const burstB =
      DAILY_GLITCH_REVEAL_CONFIG.glitchBurstCount > 1
        ? pulse(revealProgress, entryFx.glitchBurstB, burstWidth * 0.78) * 0.62
        : 0;
    const glitchStrength =
      reducedMotion || !DAILY_GLITCH_REVEAL_CONFIG.enabled || (DAILY_GLITCH_REVEAL_CONFIG.reduceMotion && reducedMotion)
        ? 0
        : Math.max(burstA, burstB) * entryFx.glitchStrength;
    const farFadeStart = maxWallHalfHeight + config.planeHeight * 0.55;
    const farFadeBand = Math.max(config.gapY * 1.35, config.planeHeight);
    const farFade = smooth01(
      1 - Math.max(0, Math.abs(y) - farFadeStart) / Math.max(farFadeBand, 0.001),
    );

    hoverAmountRef.current = hoverAmount;
    group.visible = farFade > 0.002;

    group.position.set(
      placement.x,
      THREE.MathUtils.lerp(y, cylinderCenterY, cylinderAmount),
      THREE.MathUtils.lerp(0, cylinderCenterZ, cylinderAmount) + placement.depth * (1 - speed * 0.16) + hoverAmount * 0.12,
    );
    group.rotation.set(velocity * 0.0055, 0, 0);
    group.scale.setScalar(1 + hoverAmount * 0.035);

    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    if (!entryCompleteRef.current) {
      shaderMaterial.uniforms.uEntryProgress.value = reveal;
      shaderMaterial.uniforms.uGlitchStrength.value = glitchStrength;
      shaderMaterial.uniforms.uBootGlow.value = bootGlow;
      if (revealProgress >= 1 && elapsedFromEntry > entryDuration + DAILY_GLITCH_REVEAL_CONFIG.settleDuration) {
        entryCompleteRef.current = true;
        shaderMaterial.uniforms.uEntryProgress.value = 1;
        shaderMaterial.uniforms.uGlitchStrength.value = 0;
        shaderMaterial.uniforms.uBootGlow.value = 0;
      }
    }
    shaderMaterial.uniforms.uVelocity.value = shaderVelocity;
    shaderMaterial.uniforms.uHover.value = hoverAmount;
    shaderMaterial.uniforms.uDistortionStrength.value = enableShaderDistortion
      ? config.shaderDistortionStrength
      : 0;
    shaderMaterial.uniforms.uFarFade.value = farFade;
    shaderMaterial.uniforms.uCylinderAmount.value = cylinderAmount;
    shaderMaterial.uniforms.uCenterTheta.value = centerTheta;
    shaderMaterial.uniforms.uCylinderRadius.value = radius;
    shaderMaterial.uniforms.uCylinderCenterY.value = cylinderCenterY;
    shaderMaterial.uniforms.uCylinderCenterZ.value = cylinderCenterZ;
    shaderMaterial.uniforms.uCylinderMaxSag.value = cylinderMaxSag;
    shaderMaterial.uniforms.uLift.value = lift;

    if (DEBUG_DAILY_GLITCH) {
      group.userData.dailyGlitch = {
        seed: entryFx.seed,
        entryDelay: entryFx.entryDelay,
        entryProgress: revealProgress,
        bootGlow,
        glitchStrength,
      };
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={(event) => emitHover(event, true)}
      onPointerMove={(event) => emitHover(event, true)}
      onPointerOut={(event) => emitHover(event, false)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(photo);
      }}
    >
      <mesh geometry={planeGeometry} material={material} />
    </group>
  );
}

export default memo(DailyPhotoPlane);

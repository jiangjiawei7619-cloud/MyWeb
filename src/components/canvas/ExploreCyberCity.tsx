import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EXPLORE_CITY_PALETTE } from '@/lib/explore-city-palette';
import {
  generateExploreCity,
  type ExploreBuilding,
  type ExploreDualPylon,
  type ExploreNeonSign,
  type ExplorePylon,
} from '@/lib/explore-city-layout';
import ExploreWorldLabels from '@/components/canvas/ExploreWorldLabels';
import { isWorldLabelsEnabled } from '@/lib/explore-world-labels';
import { POSTER_GLITCH_BURST } from '@/lib/explore-poster-glitch';
import { EXPLORE_DISTANCE_LOD } from '@/lib/explore-distance-lod';
import { resetNearEmissiveCount } from '@/lib/explore-emissive-pressure';
import {
  createBuildingTextureUniforms,
  getBuildingTextureUrls,
  mapLoadedBuildingTextures,
} from '@/lib/explore-building-textures';
import {
  createHybridNeonPosterAtlas,
  getPosterAtlasCellSize,
  GLITCH_POSTER_COLS,
} from '@/lib/explore-neon-atlas';
import {
  exploreCityAntennaFrag,
  exploreCityAntennaVert,
  exploreCityBuildingFrag,
  exploreCityBuildingVert,
  exploreNeonSignFrag,
  exploreNeonSignVert,
} from '@/shaders/exploreCity.glsl';
import { useRenderBudget } from '@/world/RenderBudgetSystem';
import { getWorldFeatureFlags } from '@/lib/world-feature-flags';

function createInactiveMirrorUniforms() {
  return {
    uReflectFadeDepth: { value: 1 },
    uReflectDistNear: { value: 0 },
    uReflectDistFar: { value: 1 },
    uReflectDistStrength: { value: 0 },
    uReflectFresnelPower: { value: 1 },
    uReflectFresnelBoost: { value: 1 },
    uReflectBlurNear: { value: 0 },
    uReflectBlurFar: { value: 1 },
    uReflectBlurFogMix: { value: 0 },
    uCamPos: { value: new THREE.Vector3() },
  };
}

function createInactiveBrickUniforms() {
  return {
    uBrickPitch: { value: 1 },
    uBrickGap: { value: 0 },
    uBrickOrigin: { value: new THREE.Vector2() },
    uReflectSurfacePass: { value: 0 },
    uSeamReflectGain: { value: 0 },
    uSurfaceReflectGain: { value: 0 },
    uSeamBlurScale: { value: 1 },
    uSurfaceBlurScale: { value: 1 },
    uUseEdgeGapMask: { value: 0 },
    uGapWidthFrac: { value: 0 },
    uGapFeather: { value: 0 },
    uReflectionSeamDistortion: { value: 0 },
    uSeamDistortionNoiseScale: { value: 1 },
    uSeamDistortionSpeed: { value: 0 },
    uDebugDistortedReflection: { value: 0 },
  };
}

const mirrorUniforms = createInactiveMirrorUniforms();
const brickGridUniforms = createInactiveBrickUniforms();

type NeonSignTier = 'hero' | 'normal' | 'background';

type NeonSignRenderInfo = {
  tier: NeonSignTier;
  atlasOffset: THREE.Vector2;
  atlasScale: THREE.Vector2;
  emissiveIntensity: number;
  flickerSpeed: number;
};

function createSignRenderInfo(signs: ExploreNeonSign[], atlasCell: THREE.Vector2): NeonSignRenderInfo[] {
  const heroIndices = new Set(
    signs
      .map((sign, index) => ({
        index,
        score: sign.w * sign.h + Math.max(0, sign.y - 12) * 1.8,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.index),
  );

  return signs.map((sign, index) => {
    const distanceFromCenter = Math.hypot(sign.x, sign.z);
    const tier: NeonSignTier = heroIndices.has(index)
      ? 'hero'
      : distanceFromCenter > 64
        ? 'background'
        : 'normal';
    const col = sign.posterIndex % GLITCH_POSTER_COLS;
    const row = Math.floor(sign.posterIndex / GLITCH_POSTER_COLS);

    return {
      tier,
      atlasOffset: new THREE.Vector2(col * atlasCell.x, row * atlasCell.y),
      atlasScale: atlasCell.clone(),
      emissiveIntensity: tier === 'hero' ? 1.22 : tier === 'normal' ? 1.08 : 0.98,
      flickerSpeed: tier === 'hero' ? 1 : tier === 'normal' ? 0.32 : 0.12,
    };
  });
}

function splitSignBatches(signs: ExploreNeonSign[], renderInfo: NeonSignRenderInfo[]) {
  const result: Record<NeonSignTier, { signs: ExploreNeonSign[]; info: NeonSignRenderInfo[] }> = {
    hero: { signs: [], info: [] },
    normal: { signs: [], info: [] },
    background: { signs: [], info: [] },
  };

  signs.forEach((sign, index) => {
    const info = renderInfo[index]!;
    result[info.tier].signs.push(sign);
    result[info.tier].info.push(info);
  });

  return result;
}

function createDistanceLodUniforms() {
  return {
    uDistanceFadeStart: { value: EXPLORE_DISTANCE_LOD.fadeStart },
    uDistanceFadeEnd: { value: EXPLORE_DISTANCE_LOD.fadeEnd },
    uLod1Start: { value: EXPLORE_DISTANCE_LOD.lod1Start },
    uLod1End: { value: EXPLORE_DISTANCE_LOD.lod1End },
    uLod2Start: { value: EXPLORE_DISTANCE_LOD.lod2Start },
    uLod2End: { value: EXPLORE_DISTANCE_LOD.lod2End },
    uFarFogColor: { value: new THREE.Color(EXPLORE_DISTANCE_LOD.fogColor) },
    uFarFogDensity: { value: EXPLORE_DISTANCE_LOD.fogDensity },
  };
}

function applyInstancedMatrices(mesh: THREE.InstancedMesh | null, matrices: THREE.Matrix4[]) {
  if (!mesh) return;
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
}

function buildSignGeometry(signs: ExploreNeonSign[], renderInfo: NeonSignRenderInfo[]) {
  const count = signs.length;
  const colors = new Float32Array(count * 3);
  const atlasOffsets = new Float32Array(count * 2);
  const atlasScales = new Float32Array(count * 2);
  const signPerf = new Float32Array(count * 3);
  const glitchA = new Float32Array(count * 2);
  const glitchB = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const sign = signs[i]!;
    const c = signs[i]!.color;
    const info = renderInfo[i]!;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    atlasOffsets[i * 2] = info.atlasOffset.x;
    atlasOffsets[i * 2 + 1] = info.atlasOffset.y;
    atlasScales[i * 2] = info.atlasScale.x;
    atlasScales[i * 2 + 1] = info.atlasScale.y;
    signPerf[i * 3] = info.tier === 'hero' ? 0 : info.tier === 'normal' ? 1 : 2;
    signPerf[i * 3 + 1] = info.emissiveIntensity;
    signPerf[i * 3 + 2] = info.flickerSpeed;
    glitchA[i * 2] = sign.glitchEnabled ? 1 : 0;
    glitchA[i * 2 + 1] = sign.glitchMode;
    glitchB[i * 2] = sign.glitchInterval;
    glitchB[i * 2 + 1] = sign.glitchPhase;
  }

  const g = new THREE.PlaneGeometry(1, 1);
  g.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
  g.setAttribute('aAtlasUvOffset', new THREE.InstancedBufferAttribute(atlasOffsets, 2));
  g.setAttribute('aAtlasUvScale', new THREE.InstancedBufferAttribute(atlasScales, 2));
  g.setAttribute('aSignPerf', new THREE.InstancedBufferAttribute(signPerf, 3));
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(Float32Array.from(signs.map((s) => s.seed)), 1));
  g.setAttribute('aGlitchA', new THREE.InstancedBufferAttribute(glitchA, 2));
  g.setAttribute('aGlitchB', new THREE.InstancedBufferAttribute(glitchB, 2));
  return g;
}

function buildSignMatrices(signs: ExploreNeonSign[], mirror = false) {
  const dummy = new THREE.Object3D();
  return signs.map((s) => {
    const y = mirror ? -s.y : s.y;
    const sy = mirror ? -s.h : s.h;
    dummy.position.set(s.x, y, s.z);
    dummy.rotation.set(0, s.rotationY, 0);
    dummy.scale.set(s.w, sy, 1);
    dummy.updateMatrix();
    return dummy.matrix.clone();
  });
}

function ExploreBuildings({
  buildings,
  uniforms,
}: {
  buildings: ExploreBuilding[];
  uniforms: Record<string, THREE.IUniform>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = buildings.length;

  const seeds = useMemo(() => Float32Array.from(buildings.map((b) => b.seed)), [buildings]);
  const heights = useMemo(() => Float32Array.from(buildings.map((b) => b.h)), [buildings]);
  const types = useMemo(() => Float32Array.from(buildings.map((b) => b.type)), [buildings]);
  const materials = useMemo(() => Float32Array.from(buildings.map((b) => b.material)), [buildings]);

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    g.setAttribute('aHeight', new THREE.InstancedBufferAttribute(heights, 1));
    g.setAttribute('aType', new THREE.InstancedBufferAttribute(types, 1));
    g.setAttribute('aMaterial', new THREE.InstancedBufferAttribute(materials, 1));
    return g;
  }, [seeds, heights, types, materials]);

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return buildings.map((b) => {
      dummy.position.set(b.x, b.yBase + b.h / 2, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [buildings]);

  useEffect(() => {
    applyInstancedMatrices(meshRef.current, matrices);
  }, [matrices]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: exploreCityBuildingVert,
        fragmentShader: exploreCityBuildingFrag,
        transparent: true,
        depthWrite: true,
        toneMapped: false,
      }),
    [uniforms],
  );

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} renderOrder={2} />;
}

const pylonVertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = instanceMatrix * vec4(position, 1.0);
    vWorldPos = (modelMatrix * wp).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * wp;
  }
`;

const pylonFragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uCamPos;
  uniform float uDistanceFadeStart;
  uniform float uDistanceFadeEnd;
  uniform vec3 uFarFogColor;
  uniform float uFarFogDensity;
  varying vec3 vWorldPos;

  void main() {
    float d = length(vWorldPos - uCamPos);
    float fade = 1.0 - smoothstep(uDistanceFadeStart, uDistanceFadeEnd, d);
    if (fade <= 0.002) discard;
    vec3 col = vec3(0.05, 0.05, 0.08) * fade;
    float fog = clamp(1.0 - exp(-d * uFarFogDensity), 0.0, 1.0);
    col = mix(col, uFarFogColor, fog);
    gl_FragColor = vec4(col, fade);
  }
`;

function ExplorePylons({
  pylons,
  uniforms,
}: {
  pylons: ExplorePylon[];
  uniforms: Record<string, THREE.IUniform>;
}) {
  const count = pylons.length;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return pylons.map((p) => {
      const size = p.poleRadius * 2;
      dummy.position.set(p.x, p.poleHeight / 2, p.z);
      dummy.scale.set(size, p.poleHeight, size);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [pylons]);

  useEffect(() => {
    applyInstancedMatrices(meshRef.current, matrices);
  }, [matrices]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: pylonVertexShader,
        fragmentShader: pylonFragmentShader,
        transparent: true,
        depthWrite: true,
        toneMapped: false,
      }),
    [uniforms],
  );

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} renderOrder={2} />
  );
}

/** 双细柱角落地标 — 每座两根立柱撑一块大广告牌 */
function ExploreDualPylons({
  dualPylons,
  uniforms,
}: {
  dualPylons: ExploreDualPylon[];
  uniforms: Record<string, THREE.IUniform>;
}) {
  const count = dualPylons.length * 2;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const result: THREE.Matrix4[] = [];
    for (const p of dualPylons) {
      const size = p.poleRadius * 2;
      const halfSpacing = p.poleSpacing * 0.5;
      const widthX = Math.cos(p.rotationY);
      const widthZ = -Math.sin(p.rotationY);
      for (const side of [-1, 1] as const) {
        dummy.position.set(
          p.x + widthX * halfSpacing * side,
          p.poleHeight / 2,
          p.z + widthZ * halfSpacing * side,
        );
        dummy.scale.set(size, p.poleHeight, size);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        result.push(dummy.matrix.clone());
      }
    }
    return result;
  }, [dualPylons]);

  useEffect(() => {
    applyInstancedMatrices(meshRef.current, matrices);
  }, [matrices]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: pylonVertexShader,
        fragmentShader: pylonFragmentShader,
        transparent: true,
        depthWrite: true,
        toneMapped: false,
      }),
    [uniforms],
  );

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} renderOrder={2} />
  );
}

function ExploreAntennas({
  buildings,
  uniforms,
}: {
  buildings: ExploreBuilding[];
  uniforms: Record<string, THREE.IUniform>;
}) {
  const antennaBuildings = useMemo(() => buildings.filter((b) => b.antenna), [buildings]);
  const count = antennaBuildings.length;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const seeds = useMemo(() => Float32Array.from(antennaBuildings.map((b) => b.seed)), [antennaBuildings]);

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    return g;
  }, [seeds]);

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return antennaBuildings.map((b) => {
      dummy.position.set(b.x, b.yBase + b.h + 1.8, b.z);
      dummy.scale.set(0.35, 3.6, 0.35);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [antennaBuildings]);

  useEffect(() => {
    applyInstancedMatrices(meshRef.current, matrices);
  }, [matrices]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: exploreCityAntennaVert,
        fragmentShader: exploreCityAntennaFrag,
        transparent: true,
        depthWrite: true,
        toneMapped: false,
      }),
    [uniforms],
  );

  if (count === 0) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />;
}

function ExploreNeonSigns({
  signs,
  renderInfo,
  uniforms,
  tier,
}: {
  signs: ExploreNeonSign[];
  renderInfo: NeonSignRenderInfo[];
  uniforms: Record<string, THREE.IUniform>;
  tier: NeonSignTier;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = signs.length;

  const geometry = useMemo(() => buildSignGeometry(signs, renderInfo), [signs, renderInfo]);
  const matrices = useMemo(() => buildSignMatrices(signs, false), [signs]);

  useEffect(() => {
    applyInstancedMatrices(meshRef.current, matrices);
  }, [matrices]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: exploreNeonSignVert,
        fragmentShader: exploreNeonSignFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [uniforms],
  );

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      renderOrder={tier === 'hero' ? 4 : 3}
      userData={{
        neonSignCount: count,
        emissiveMaterialsCount: 1,
        bloomEnabledCount: tier === 'hero' ? count : 0,
        reflectionLayerCount: tier === 'hero' ? count : 0,
      }}
    />
  );
}

function ExploreNormalSignGlow({
  signs,
  renderInfo,
  opacityScale = 1,
}: {
  signs: ExploreNeonSign[];
  renderInfo: NeonSignRenderInfo[];
  opacityScale?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const opacityScaleRef = useRef(opacityScale);
  const count = signs.length;
  opacityScaleRef.current = opacityScale;
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const colors = new Float32Array(count * 3);
    const strengths = new Float32Array(count);
    signs.forEach((sign, index) => {
      colors[index * 3] = sign.color.r;
      colors[index * 3 + 1] = sign.color.g;
      colors[index * 3 + 2] = sign.color.b;
      strengths[index] = renderInfo[index]!.emissiveIntensity;
    });
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
    g.setAttribute('aStrength', new THREE.InstancedBufferAttribute(strengths, 1));
    return g;
  }, [count, signs, renderInfo]);
  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return signs.map((s) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, s.rotationY, 0);
      dummy.scale.set(s.w * 1.18, s.h * 1.18, 1);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [signs]);

  useEffect(() => {
    applyInstancedMatrices(meshRef.current, matrices);
  }, [matrices]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uOpacityScale: { value: 1 },
        },
        vertexShader: /* glsl */ `
          attribute vec3 aColor;
          attribute float aStrength;
          varying vec2 vUv;
          varying vec3 vColor;
          varying float vStrength;
          void main() {
            vUv = uv;
            vColor = aColor;
            vStrength = aStrength;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          varying vec2 vUv;
          varying vec3 vColor;
          varying float vStrength;
          uniform float uOpacityScale;
          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            float r = dot(p, p);
            float glow = 1.0 - smoothstep(0.02, 1.0, r);
            gl_FragColor = vec4(vColor * 0.72, glow * 0.18 * vStrength * uOpacityScale);
          }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  useFrame((_, delta) => {
    material.uniforms.uOpacityScale.value = THREE.MathUtils.lerp(
      material.uniforms.uOpacityScale.value as number,
      opacityScaleRef.current,
      1 - Math.exp(-delta * 6),
    );
    if (meshRef.current) {
      meshRef.current.visible = material.uniforms.uOpacityScale.value > 0.01;
    }
  });

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      renderOrder={2}
      userData={{
        fakeGlowCount: count,
        transparentMaterialsCount: 1,
      }}
    />
  );
}

/** 带贴图的街区主体 — Suspense 边界内，贴图预热后几乎即时出现 */
function ExploreCyberCityTextured({
  buildings,
  signs,
  pylons,
  dualPylons,
  showWorldLabels,
  posterAtlas,
}: {
  buildings: ExploreBuilding[];
  signs: ExploreNeonSign[];
  pylons: ExplorePylon[];
  dualPylons: ExploreDualPylon[];
  showWorldLabels: boolean;
  posterAtlas: THREE.Texture | null;
}) {
  const flags = getWorldFeatureFlags();
  const legacyNeonEnabled = !flags.useNewNeonSystem;

  const { camera } = useThree();
  const budget = useRenderBudget();

  const loadedBuildingTextures = useLoader(THREE.TextureLoader, getBuildingTextureUrls());
  const buildingTextureUniforms = useMemo(() => {
    const set = mapLoadedBuildingTextures(loadedBuildingTextures);
    return createBuildingTextureUniforms(set);
  }, [loadedBuildingTextures]);

  const buildingUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEmber: { value: new THREE.Color(EXPLORE_CITY_PALETTE.ember) },
      uAmber: { value: new THREE.Color(EXPLORE_CITY_PALETTE.amber) },
      uAccent: { value: new THREE.Color(EXPLORE_CITY_PALETTE.accent) },
      uFog: { value: new THREE.Color(EXPLORE_CITY_PALETTE.fog) },
      uIntensity: { value: EXPLORE_CITY_PALETTE.intensity },
      uReflect: { value: 0 },
      uReflectBoost: { value: 1 },
      uReflectGain: { value: 1 },
      uNeonReflect: { value: 0 },
      ...mirrorUniforms,
      ...brickGridUniforms,
      ...createDistanceLodUniforms(),
      ...buildingTextureUniforms,
    }),
    [buildingTextureUniforms],
  );

  const antennaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmber: { value: new THREE.Color(EXPLORE_CITY_PALETTE.amber) },
      uCamPos: { value: new THREE.Vector3() },
      ...createDistanceLodUniforms(),
    }),
    [],
  );

  const pylonUniforms = useMemo(
    () => ({
      uCamPos: { value: new THREE.Vector3() },
      ...createDistanceLodUniforms(),
    }),
    [],
  );

  const atlasCell = useMemo(() => getPosterAtlasCellSize(), []);
  const signRenderInfo = useMemo(() => createSignRenderInfo(signs, atlasCell), [signs, atlasCell]);
  const signBatches = useMemo(() => splitSignBatches(signs, signRenderInfo), [signs, signRenderInfo]);

  const signUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReflect: { value: 0 },
      uReflectBoost: { value: 1 },
      uReflectGain: { value: 1 },
      ...mirrorUniforms,
      ...brickGridUniforms,
      ...createDistanceLodUniforms(),
      uGlitchDuration: { value: POSTER_GLITCH_BURST.duration },
      uGlitchSteps: { value: POSTER_GLITCH_BURST.steps },
      uGlitchEnableRatio: { value: POSTER_GLITCH_BURST.enableRatio },
      uGlitchIntervalMin: { value: POSTER_GLITCH_BURST.intervalMin },
      uGlitchIntervalSpan: { value: POSTER_GLITCH_BURST.intervalSpan },
      uParallaxStrength: { value: POSTER_GLITCH_BURST.parallaxStrength },
      uRgbLayerDepth: { value: POSTER_GLITCH_BURST.rgbLayerDepth },
      uScanlineLift: { value: POSTER_GLITCH_BURST.scanlineLift },
      uBlockPeelStrength: { value: POSTER_GLITCH_BURST.blockPeelStrength },
      uPosterAtlas: { value: posterAtlas },
      uAtlasCell: { value: atlasCell.clone() },
      uAtlasCols: { value: GLITCH_POSTER_COLS },
      uSignBloomBoost: { value: 0.22 },
      uSignOuterGlow: { value: 0.72 },
      uPosterGlowThreshold: { value: 0.55 },
      uPosterGlowSoftness: { value: 0.16 },
      uPosterSaturationThreshold: { value: 0.22 },
      uPosterEmissiveBoost: { value: 1.8 },
      uPosterBaseBrightness: { value: 0.92 },
      uPosterPulseStrength: { value: 0.08 },
      uPosterScanlineStrength: { value: 0.035 },
      uGlitchFullEnd: { value: EXPLORE_DISTANCE_LOD.glitchFullEnd },
    }),
    [posterAtlas, atlasCell],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    buildingUniforms.uTime.value = t;
    antennaUniforms.uTime.value = t;
    signUniforms.uTime.value = t;
    (buildingUniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
    (antennaUniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
    (pylonUniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
    (signUniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
  });

  useFrame(() => {
    resetNearEmissiveCount();
  }, -1);

  return (
    <group>
      <ExploreBuildings buildings={buildings} uniforms={buildingUniforms} />
      <ExplorePylons pylons={pylons} uniforms={pylonUniforms} />
      <ExploreDualPylons dualPylons={dualPylons} uniforms={pylonUniforms} />
      <ExploreAntennas buildings={buildings} uniforms={antennaUniforms} />
      {legacyNeonEnabled && posterAtlas && (
        <>
          <ExploreNormalSignGlow
            signs={signBatches.normal.signs}
            renderInfo={signBatches.normal.info}
            opacityScale={budget.farGlowEnabled ? 1 : 0}
          />
          <ExploreNeonSigns
            signs={signBatches.background.signs}
            renderInfo={signBatches.background.info}
            uniforms={signUniforms}
            tier="background"
          />
          <ExploreNeonSigns
            signs={signBatches.normal.signs}
            renderInfo={signBatches.normal.info}
            uniforms={signUniforms}
            tier="normal"
          />
          <ExploreNeonSigns
            signs={signBatches.hero.signs}
            renderInfo={signBatches.hero.info}
            uniforms={signUniforms}
            tier="hero"
          />
        </>
      )}
      {showWorldLabels && <ExploreWorldLabels buildings={buildings} signs={signs} />}
    </group>
  );
}

function ExploreCyberCityContent() {
  const { buildings, signs, pylons, dualPylons } = useMemo(() => generateExploreCity(), []);
  const showWorldLabels = useMemo(() => isWorldLabelsEnabled(), []);
  const flags = useMemo(() => getWorldFeatureFlags(), []);
  const needsLegacyPosterAtlas = !flags.useNewNeonSystem;
  const [posterAtlas, setPosterAtlas] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!needsLegacyPosterAtlas) return;
    let alive = true;
    createHybridNeonPosterAtlas().then((tex) => {
      if (alive) {
        setPosterAtlas(tex);
      } else {
        tex.dispose();
      }
    });
    return () => {
      alive = false;
    };
  }, [needsLegacyPosterAtlas]);

  return (
    <Suspense fallback={null}>
      <ExploreCyberCityTextured
        buildings={buildings}
        signs={signs}
        pylons={pylons}
        dualPylons={dualPylons}
        showWorldLabels={showWorldLabels}
        posterAtlas={posterAtlas}
      />
    </Suspense>
  );
}

export default function ExploreCyberCity() {
  return <ExploreCyberCityContent />;
}

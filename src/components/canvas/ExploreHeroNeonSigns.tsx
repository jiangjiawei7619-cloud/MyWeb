import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EXPLORE_GROUND_REFLECTION, createExploreMirrorUniforms } from '@/lib/explore-ground-reflection';
import {
  HERO_NEON_GLITCH,
  HERO_NEON_SIGNS,
  HERO_NEON_TEXTURE_URL,
  type HeroNeonSignPlacement,
} from '@/lib/explore-hero-neon-glitch';
import { exploreHeroNeonFrag, exploreHeroNeonVert } from '@/shaders/exploreCity.glsl';

const { mirrorLayer } = EXPLORE_GROUND_REFLECTION;
const mirrorUniforms = createExploreMirrorUniforms();

function createHeroUniforms(
  texture: THREE.Texture,
  sign: HeroNeonSignPlacement,
  reflect = false,
): Record<string, THREE.IUniform> {
  return {
    uTime: { value: 0 },
    uReflect: { value: reflect ? 1 : 0 },
    uReflectBoost: { value: reflect ? mirrorLayer.signReflectBoost : 1 },
    uReflectGain: { value: reflect ? mirrorLayer.signReflectGain : 1 },
    ...mirrorUniforms,
    uHeroTexture: { value: texture },
    uFrameColor: { value: new THREE.Color(sign.frameColor) },
    uSeed: { value: sign.seed },
    uGlitchPhase: { value: sign.phase },
    uGlitchDuration: { value: HERO_NEON_GLITCH.duration },
    uGlitchSteps: { value: HERO_NEON_GLITCH.steps },
    uGlitchInterval: { value: HERO_NEON_GLITCH.interval },
    uLayerAInterval: { value: HERO_NEON_GLITCH.layerAInterval },
    uLayerADuration: { value: HERO_NEON_GLITCH.layerADuration },
    uLayerBInterval: { value: HERO_NEON_GLITCH.layerBInterval },
    uLayerBDuration: { value: HERO_NEON_GLITCH.layerBDuration },
    uLayerCInterval: { value: HERO_NEON_GLITCH.layerCInterval },
    uLayerCDuration: { value: HERO_NEON_GLITCH.layerCDuration },
    uLayerDInterval: { value: HERO_NEON_GLITCH.layerDInterval },
    uLayerDDuration: { value: HERO_NEON_GLITCH.layerDDuration },
    uPosterGain: { value: sign.posterGain },
    uPosterGainBurst: { value: sign.posterGainBurst },
    uSignBloomBoost: { value: sign.bloomBoost },
    uSignOuterGlow: { value: sign.outerGlow },
  };
}

function HeroNeonSignMesh({
  sign,
  texture,
  mirror = false,
}: {
  sign: HeroNeonSignPlacement;
  texture: THREE.Texture;
  mirror?: boolean;
}) {
  const { camera } = useThree();
  const uniformsRef = useRef<Record<string, THREE.IUniform> | null>(null);
  const height = sign.width / sign.aspect;
  const y = mirror ? -sign.y : sign.y;
  const scaleY = mirror ? -height : height;

  const uniforms = useMemo(() => {
    const u = createHeroUniforms(texture, sign, mirror);
    uniformsRef.current = u;
    return u;
  }, [texture, sign, mirror]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: exploreHeroNeonVert,
        fragmentShader: exploreHeroNeonFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [uniforms],
  );

  useFrame(({ clock }) => {
    const u = uniformsRef.current;
    if (!u) return;
    u.uTime.value = clock.elapsedTime;
    (u.uCamPos.value as THREE.Vector3).copy(camera.position);
  });

  return (
    <mesh
      position={[sign.x, y, sign.z]}
      rotation={[0, sign.rotationY, 0]}
      scale={[sign.width, scaleY, 1]}
      renderOrder={mirror ? 0 : 4}
      material={material}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

/** Large hero neon signs with layered decay flicker + ground mirror */
export default function ExploreHeroNeonSigns() {
  const texture = useLoader(THREE.TextureLoader, HERO_NEON_TEXTURE_URL);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 8;
  }, [texture]);

  return (
    <group>
      {HERO_NEON_SIGNS.map((sign) => (
        <group key={`${sign.x}-${sign.z}-${sign.rotationY}`}>
          <HeroNeonSignMesh sign={sign} texture={texture} mirror />
          <HeroNeonSignMesh sign={sign} texture={texture} />
        </group>
      ))}
    </group>
  );
}

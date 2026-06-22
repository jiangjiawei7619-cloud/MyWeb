import { generateExploreCity } from '@/lib/explore-city-layout';
import { HERO_NEON_SIGNS, HERO_NEON_TEXTURE_URL } from '@/lib/explore-hero-neon-glitch';
import type { NeonRegistryEntry, NeonTier } from '@/world/types';

function classifyNeonTier(distance: number, area: number, y: number): NeonTier {
  if (area > 26 || y > 20) return 'hero';
  if (distance < 58) return 'near';
  if (distance < 86) return 'mid';
  return 'far';
}

function tierBloomWeight(tier: NeonTier): number {
  if (tier === 'hero') return 1;
  if (tier === 'near') return 0.42;
  return 0;
}

function tierGlow(tier: NeonTier): number {
  if (tier === 'hero') return 1.28;
  if (tier === 'near') return 0.72;
  if (tier === 'mid') return 0;
  return 0;
}

function tierFlicker(tier: NeonTier): number {
  if (tier === 'hero') return 1;
  if (tier === 'near') return 0.32;
  return 0;
}

function createHeroEntries(): NeonRegistryEntry[] {
  return HERO_NEON_SIGNS.map((sign, index) => {
    const height = sign.width / sign.aspect;
    return {
      id: `hero-neon-${index}`,
      tier: 'hero',
      position: [sign.x, sign.y, sign.z],
      rotation: [0, sign.rotationY, 0],
      size: [sign.width, height],
      textureId: HERO_NEON_TEXTURE_URL,
      color: sign.frameColor,
      flicker: 1,
      glow: sign.outerGlow,
      bloomWeight: sign.bloomBoost,
      participatesInBloom: true,
      animated: true,
      interactive: false,
      seed: sign.seed,
      glitchEnabled: true,
      glitchMode: 1,
      glitchInterval: 4.2,
      glitchPhase: sign.phase,
    };
  });
}

export function createNeonRegistry(): NeonRegistryEntry[] {
  const { signs } = generateExploreCity();
  const heroIds = new Set(
    signs
      .map((sign, index) => ({
        index,
        score: sign.w * sign.h + Math.max(0, sign.y - 12) * 1.8,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.index),
  );

  const cityEntries = signs.map((sign, index) => {
    const distance = Math.hypot(sign.x, sign.z);
    const tier = heroIds.has(index)
      ? 'hero'
      : classifyNeonTier(distance, sign.w * sign.h, sign.y);

    return {
      id: `neon-${index.toString().padStart(3, '0')}`,
      tier,
      position: [sign.x, sign.y, sign.z] as [number, number, number],
      rotation: [0, sign.rotationY, 0] as [number, number, number],
      size: [sign.w, sign.h] as [number, number],
      textureId: `poster-atlas-${sign.posterIndex}`,
      color: `#${sign.color.getHexString()}`,
      flicker: tierFlicker(tier),
      glow: tierGlow(tier),
      bloomWeight: tierBloomWeight(tier),
      posterIndex: sign.posterIndex,
      glitchEnabled: sign.glitchEnabled,
      glitchMode: sign.glitchMode,
      glitchInterval: sign.glitchInterval,
      glitchPhase: sign.glitchPhase,
      seed: sign.seed,
      participatesInBloom: tier === 'hero' || tier === 'near',
      animated: tier === 'hero' || tier === 'near',
      interactive: false,
    };
  });

  return [...createHeroEntries(), ...cityEntries];
}

export const neonRegistry = createNeonRegistry();

/** Hero neon IDs managed by NeonSystem — legacy ExploreCyberCity skips these when flag is on */
export const NEON_SYSTEM_HERO_IDS = new Set(
  neonRegistry.filter((entry) => entry.tier === 'hero').map((entry) => entry.id),
);

export function getNeonByTier(tier: NeonTier) {
  return neonRegistry.filter((entry) => entry.tier === tier);
}

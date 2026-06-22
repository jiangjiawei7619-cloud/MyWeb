import { createContext, createElement, useContext, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getNearEmissiveCount } from '@/lib/explore-emissive-pressure';
import { getWorldRenderFlags } from '@/lib/world-feature-flags';
import { detectPerformanceTier, getPerformancePreset } from '@/utils/performanceTier';
import type { ActivePage } from '@/lib/types';
import type { DeviceTier, MovementPhase, QualityPhase, RenderBudget, RenderBudgetInput } from '@/world/types';

const DEFAULT_BUDGET: RenderBudget = {
  movementPhase: 'stable',
  bloomScale: 1,
  glowScale: 1,
  posterEffectScale: 1,
  allowHeroEffects: true,
  allowFarGlow: true,
  dprMax: 1,
  bloomEnabled: true,
  bloomIntensity: 1,
  bloomResolutionScale: 1,
  bloomLevels: 4,
  farGlowEnabled: true,
  farAnimationEnabled: true,
  qualityPhase: 'stable',
};

const SETTLE_MS = 400;
const RECOVER_GLOW_MS = 540;
const RECOVER_BLOOM_MS = 880;

function phaseFromMotion(nowMs: number, lastMovingAtMs: number): QualityPhase {
  const idleMs = nowMs - lastMovingAtMs;
  if (idleMs < 80) return 'moving';
  if (idleMs < SETTLE_MS) return 'settling';
  if (idleMs < RECOVER_GLOW_MS) return 'recoverGlow';
  if (idleMs < RECOVER_BLOOM_MS) return 'recoverBloom';
  return 'stable';
}

const RenderBudgetContext = createContext<RenderBudget>(DEFAULT_BUDGET);

function normalizeDeviceTier(): DeviceTier {
  const tier = detectPerformanceTier();
  return tier === 'low' || tier === 'medium' || tier === 'high' ? tier : 'high';
}

function movementPhaseFromQuality(phase: QualityPhase): MovementPhase {
  if (phase === 'moving') return 'moving';
  if (phase === 'settling') return 'settling';
  if (phase === 'stable') return 'stable';
  return 'recovering';
}

export function createRenderBudget(input: RenderBudgetInput): RenderBudget {
  const preset = getPerformancePreset(input.deviceTier);
  const renderFlags = getWorldRenderFlags();
  const phase = input.qualityPhase ?? (input.cameraMoving || input.playerMoving ? 'moving' : 'stable');
  const pressure =
    input.scenePressure.nearEmissiveCount * 0.06 +
    input.nearHeroCount * 0.14 +
    input.scenePressure.transparentLayerCount * 0.018;
  const pressureHigh = pressure > 1.4;
  const moving = phase === 'moving' || phase === 'settling';
  const recovering = phase === 'recoverGlow' || phase === 'recoverBloom';
  const backgroundWorld = input.activeSection !== 'EXPLORE';
  const motionScale = renderFlags.enableRenderBudgetQualityScaling
    ? moving
      ? 0.62
      : recovering
        ? 0.78
        : 1
    : 1;
  const pressureScale = renderFlags.enableRenderBudgetQualityScaling && pressureHigh ? 0.72 : 1;
  const backgroundScale = renderFlags.enableRenderBudgetQualityScaling && backgroundWorld ? 0.66 : 1;
  const qualityScale = motionScale * pressureScale * backgroundScale;

  const glowRecovered = phase === 'recoverGlow' || phase === 'recoverBloom' || phase === 'stable';
  const bloomRecovered = phase === 'recoverBloom' || phase === 'stable';

  const movementPhase = movementPhaseFromQuality(phase);

  return {
    movementPhase,
    bloomScale: bloomRecovered ? qualityScale : Math.max(0.35, qualityScale * 0.58),
    glowScale: Math.max(0.65, glowRecovered ? qualityScale : moving ? qualityScale * 0.82 : 0.72),
    posterEffectScale: Math.max(0.7, glowRecovered && !pressureHigh ? qualityScale : moving ? 0.7 : 0.76),
    allowHeroEffects: !moving && !pressureHigh && input.activeSection === 'EXPLORE',
    allowFarGlow: glowRecovered && !pressureHigh && !backgroundWorld,
    dprMax: Math.max(0.85, preset.dprMax * (pressureHigh ? 0.9 : 1)),
    bloomEnabled: preset.enableBloom && input.deviceTier !== 'low',
    bloomIntensity: Math.max(0.08, preset.bloomIntensity * qualityScale * (bloomRecovered ? 1 : 0.58)),
    bloomResolutionScale: Math.max(0.22, preset.bloomScale),
    bloomLevels: 4,
    farGlowEnabled: true,
    farAnimationEnabled: glowRecovered && !pressureHigh && input.activeSection === 'EXPLORE',
    qualityPhase: phase,
  };
}

export function RenderBudgetProvider({
  activeSection,
  interactive,
  children,
}: PropsWithChildren<{
  activeSection: ActivePage;
  interactive: boolean;
}>) {
  const { camera } = useThree();
  const deviceTier = useMemo(() => normalizeDeviceTier(), []);
  const initialBudget = useMemo(
    () =>
      createRenderBudget({
        activeSection,
        cameraMoving: false,
        playerMoving: false,
        cameraSpeed: 0,
        deviceTier,
        nearHeroCount: 0,
        scenePressure: {
          nearEmissiveCount: 0,
          transparentLayerCount: 0,
        },
      }),
    [activeSection, deviceTier],
  );
  const [budget, setBudget] = useState(initialBudget);
  const lastPositionRef = useRef(new THREE.Vector3().copy(camera.position));
  const lastQuaternionRef = useRef(new THREE.Quaternion().copy(camera.quaternion));
  const frameRef = useRef(0);
  const lastMovingAtRef = useRef(0);
  const phaseRef = useRef<QualityPhase>('stable');
  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;

  useFrame((state, delta) => {
    frameRef.current += 1;

    const nowMs = state.clock.elapsedTime * 1000;
    const safeDelta = Math.max(delta, 1 / 120);
    const positionDelta = camera.position.distanceTo(lastPositionRef.current);
    const rotationDelta = 1 - Math.abs(camera.quaternion.dot(lastQuaternionRef.current));
    const cameraSpeed = positionDelta / safeDelta;
    const cameraMoving = positionDelta > 0.008 || rotationDelta > 0.00003;

    lastPositionRef.current.copy(camera.position);
    lastQuaternionRef.current.copy(camera.quaternion);
    if (cameraMoving) {
      lastMovingAtRef.current = nowMs;
    }

    const nextPhase = phaseFromMotion(nowMs, lastMovingAtRef.current);
    const shouldRefresh = nextPhase !== phaseRef.current || frameRef.current % 24 === 0;
    if (!shouldRefresh) return;
    phaseRef.current = nextPhase;

    const nearEmissiveCount = getNearEmissiveCount();
    const next = createRenderBudget({
      activeSection: activeSectionRef.current,
      cameraMoving,
      playerMoving: interactive && cameraMoving,
      cameraSpeed,
      deviceTier,
      nearHeroCount: Math.ceil(nearEmissiveCount),
      qualityPhase: nextPhase,
      scenePressure: {
        nearEmissiveCount,
        transparentLayerCount: nearEmissiveCount,
      },
    });

    setBudget((prev) => {
      if (
        prev.farGlowEnabled === next.farGlowEnabled &&
        prev.qualityPhase === next.qualityPhase &&
        Math.abs(prev.bloomIntensity - next.bloomIntensity) < 0.015
      ) {
        return prev;
      }
      return next;
    });
  }, -5);

  return createElement(RenderBudgetContext.Provider, { value: budget }, children);
}

export function useRenderBudget(): RenderBudget {
  return useContext(RenderBudgetContext);
}

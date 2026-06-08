import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** 宠物情绪状态 */
export type PetMood = 'idle' | 'happy' | 'surprised' | 'sleepy' | 'curious' | 'working' | 'patrol';

/** 记忆碎片 ID */
export type FragmentId = 'birth' | 'learn' | 'error' | 'connect' | 'wait' | 'future';

/** 平台波纹图案（碎片激活时） */
export type RipplePattern = 'default' | 'concentric' | 'grid' | 'chaos' | 'helix' | 'calm' | 'arrow';

/** 粒子流模式 */
export type ParticleMode = 'drift' | 'up' | 'explode' | 'still' | 'gather' | 'stream' | 'attract';

/** 宠物交互模式 */
export type PetInteractionMode = 'normal' | 'emotionInject' | 'dragging' | 'timeFrozen';

/** WebGL 场景可响应的效果参数 */
export interface WebGLEffects {
  fogDensity: number;
  ambientIntensity: number;
  backgroundColor: string;
  groundWaveAmplitude: number;
  groundWaveFrequency: number;
  platformRippleIntensity: number;
  platformEdgeColor: string;
  platformRipplePattern: RipplePattern;
  particleMode: ParticleMode;
  particleSpeed: number;
  fragmentSpeedMult: number;
  fragmentPush: number;
  fragmentHighlightId: FragmentId | null;
  activatedFragmentId: FragmentId | null;
  fragmentCrack: boolean;
  laserScanSpeed: number;
  laserFullBright: boolean;
  laserChaos: boolean;
  goldenFlashes: boolean;
  timeScale: number;
  timeFrozen: boolean;
  timeCompensation: number;
  cameraShake: number;
  cameraFocusFragment: FragmentId | null;
  cameraPetBias: { x: number; y: number };
  driftSpeedMult: number;
  shockwaveActive: boolean;
  shockwaveStrength: number;
  shockwaveColor: string;
  shockwaveTarget: FragmentId | null;
  neuralLinks: Array<{ from: FragmentId; to: FragmentId; progress: number }>;
  showFragmentLabel: FragmentId | null;
}

/** 肚皮显示屏用的世界缩略快照 */
export interface WorldSnapshot {
  waveAmplitude: number;
  platformPulse: number;
  fragments: Array<{ id: FragmentId; nx: number; ny: number; active: boolean }>;
}

const FRAGMENT_IDS: FragmentId[] = ['birth', 'learn', 'error', 'connect', 'wait', 'future'];

const DEFAULT_EFFECTS: WebGLEffects = {
  fogDensity: 0.025,
  ambientIntensity: 0.08,
  backgroundColor: '#050000',
  groundWaveAmplitude: 0.1,
  groundWaveFrequency: 0.5,
  platformRippleIntensity: 0.1,
  platformEdgeColor: '#ff2a2a',
  platformRipplePattern: 'default',
  particleMode: 'drift',
  particleSpeed: 1,
  fragmentSpeedMult: 1,
  fragmentPush: 0,
  fragmentHighlightId: null,
  activatedFragmentId: null,
  fragmentCrack: false,
  laserScanSpeed: 1 / 3,
  laserFullBright: false,
  laserChaos: false,
  goldenFlashes: false,
  timeScale: 1,
  timeFrozen: false,
  timeCompensation: 1,
  cameraShake: 0,
  cameraFocusFragment: null,
  cameraPetBias: { x: 0, y: 0 },
  driftSpeedMult: 1,
  shockwaveActive: false,
  shockwaveStrength: 0,
  shockwaveColor: '#ff2a2a',
  shockwaveTarget: null,
  neuralLinks: [],
  showFragmentLabel: null,
};

const STORAGE_KEY = 'bitchan-pet-state';

interface PersistedState {
  mood: PetMood;
  patrolAngle: number;
}

interface BitChanContextValue {
  mood: PetMood;
  setMood: (mood: PetMood) => void;
  effects: WebGLEffects;
  worldSnapshot: WorldSnapshot;
  mouse: { x: number; y: number };
  patrolDirection: { x: number; y: number };
  patrolAngle: number;
  setPatrolAngle: (angle: number) => void;
  interactionMode: PetInteractionMode;
  petScreenOffset: { x: number; y: number };
  petStretchX: number;
  triggerHappy: () => void;
  triggerSurprised: () => void;
  triggerCurious: () => void;
  triggerWorking: () => void;
  onPetInteract: () => void;
  startEmotionInject: () => void;
  endEmotionInject: () => void;
  startPetDrag: () => void;
  updatePetDrag: (offsetX: number, offsetY: number) => void;
  endPetDrag: () => void;
  triggerTimeFreeze: () => void;
  activateFragment: (id: FragmentId) => void;
  fireEmotionShockwave: () => void;
}

const BitChanContext = createContext<BitChanContextValue | null>(null);

function loadPersisted(): PersistedState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.mood && typeof parsed.patrolAngle === 'number') return parsed;
    }
  } catch {
    /* ignore */
  }
  return { mood: 'idle', patrolAngle: 0 };
}

/** 情绪 → 世界映射 */
function moodEffects(mood: PetMood, base: WebGLEffects): WebGLEffects {
  switch (mood) {
    case 'happy':
      return {
        ...base,
        particleMode: 'up',
        particleSpeed: 2.2,
        fragmentSpeedMult: 2,
        platformRippleIntensity: 0.3,
        platformEdgeColor: '#ff4444',
        groundWaveAmplitude: 0.3,
        groundWaveFrequency: 1.2,
        laserScanSpeed: 1 / 1.5,
        goldenFlashes: true,
      };
    case 'surprised':
      return {
        ...base,
        timeScale: 0.3,
        particleMode: 'explode',
        particleSpeed: 3.5,
        fragmentPush: 0.8,
        platformRippleIntensity: 0.8,
        groundWaveAmplitude: 0.8,
        laserFullBright: true,
        fragmentCrack: true,
        cameraShake: 0.1,
      };
    case 'sleepy':
      return {
        ...base,
        timeScale: 0.5,
        backgroundColor: '#020000',
        ambientIntensity: 0.04,
        particleMode: 'still',
        particleSpeed: 0.15,
        fragmentSpeedMult: 0.2,
        platformRippleIntensity: 0.05,
        platformEdgeColor: '#2a0a0a',
        groundWaveAmplitude: 0.05,
        groundWaveFrequency: 0.2,
        laserScanSpeed: 1 / 8,
      };
    case 'curious':
      return {
        ...base,
        particleMode: 'gather',
        particleSpeed: 1.4,
        fragmentHighlightId: 'learn',
        cameraFocusFragment: 'learn',
        groundWaveAmplitude: 0.15,
      };
    case 'working':
      return {
        ...base,
        particleMode: 'stream',
        particleSpeed: 2,
        platformRipplePattern: 'grid',
        platformRippleIntensity: 0.25,
        laserScanSpeed: 1 / 2,
      };
    case 'patrol':
      return {
        ...base,
        laserChaos: true,
        laserScanSpeed: 1 / 2.5,
        driftSpeedMult: 1.3,
        fragmentSpeedMult: 1.1,
      };
    default:
      return base;
  }
}

const RIPPLE_BY_FRAGMENT: Record<FragmentId, RipplePattern> = {
  birth: 'concentric',
  learn: 'grid',
  error: 'chaos',
  connect: 'helix',
  wait: 'calm',
  future: 'arrow',
};

export function BitChanProvider({ children }: { children: ReactNode }) {
  const persisted = useRef(loadPersisted());
  const [mood, setMoodState] = useState<PetMood>(persisted.current.mood);
  const [effects, setEffects] = useState<WebGLEffects>(() =>
    moodEffects(persisted.current.mood, DEFAULT_EFFECTS),
  );
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [patrolAngle, setPatrolAngle] = useState(persisted.current.patrolAngle);
  const [interactionMode, setInteractionMode] = useState<PetInteractionMode>('normal');
  const [petScreenOffset, setPetScreenOffset] = useState({ x: 0, y: 0 });
  const [petStretchX, setPetStretchX] = useState(1);
  const [worldSnapshot, setWorldSnapshot] = useState<WorldSnapshot>({
    waveAmplitude: 0.1,
    platformPulse: 0.1,
    fragments: FRAGMENT_IDS.map((id, i) => ({
      id,
      nx: 0.2 + (i % 3) * 0.25,
      ny: 0.25 + Math.floor(i / 3) * 0.35,
      active: false,
    })),
  });

  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surprisedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const happyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeFreezeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushDecayRef = useRef(0);
  const rippleDecayRef = useRef(0);
  const shakeDecayRef = useRef(0);
  const shockwaveRef = useRef(0);
  const compensationRef = useRef(1);
  const activatedRef = useRef<FragmentId | null>(null);
  const curiousTargetRef = useRef<FragmentId>('learn');

  const clearMoodTimer = () => {
    if (moodTimer.current) clearTimeout(moodTimer.current);
    if (surprisedTimer.current) clearTimeout(surprisedTimer.current);
    if (happyTimer.current) clearTimeout(happyTimer.current);
    if (workingTimer.current) clearTimeout(workingTimer.current);
  };

  const setMood = useCallback((next: PetMood) => {
    setMoodState(next);
  }, []);

  const resetIdleTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (sleepyTimer.current) clearTimeout(sleepyTimer.current);

    idleTimer.current = setTimeout(() => {
      setMoodState((m) => (m === 'idle' || m === 'sleepy' ? 'patrol' : m));
    }, 15000);

    sleepyTimer.current = setTimeout(() => {
      setMoodState((m) => (m === 'idle' || m === 'patrol' ? 'sleepy' : m));
    }, 45000);
  }, []);

  const onPetInteract = useCallback(() => {
    resetIdleTimers();
  }, [resetIdleTimers]);

  const triggerHappy = useCallback(() => {
    clearMoodTimer();
    setMood('happy');
    happyTimer.current = setTimeout(() => {
      setMood('idle');
      resetIdleTimers();
    }, 2000);
  }, [resetIdleTimers, setMood]);

  const triggerSurprised = useCallback(() => {
    clearMoodTimer();
    pushDecayRef.current = 0.8;
    rippleDecayRef.current = 0.8;
    shakeDecayRef.current = 0.1;
    shockwaveRef.current = 0;
    setMood('surprised');
    surprisedTimer.current = setTimeout(() => {
      setMood('idle');
      resetIdleTimers();
    }, 1500);
  }, [resetIdleTimers, setMood]);

  const triggerCurious = useCallback(() => {
    clearMoodTimer();
    curiousTargetRef.current = FRAGMENT_IDS[Math.floor(Math.random() * FRAGMENT_IDS.length)];
    setMood('curious');
    moodTimer.current = setTimeout(() => {
      setMood('idle');
      resetIdleTimers();
    }, 3000);
  }, [resetIdleTimers, setMood]);

  const triggerWorking = useCallback(() => {
    clearMoodTimer();
    setMood('working');
    workingTimer.current = setTimeout(() => {
      setMood('idle');
      resetIdleTimers();
    }, 4000);
  }, [resetIdleTimers, setMood]);

  const activateFragment = useCallback((id: FragmentId) => {
    activatedRef.current = id;
    if (activationTimer.current) clearTimeout(activationTimer.current);
    if (linkTimer.current) clearTimeout(linkTimer.current);

    const others = FRAGMENT_IDS.filter((f) => f !== id);
    const links = others.slice(0, 3).map((to, i) => ({ from: id, to, progress: 1 - i * 0.15 }));

    setEffects((prev) => ({
      ...prev,
      activatedFragmentId: id,
      showFragmentLabel: id,
      platformRipplePattern: RIPPLE_BY_FRAGMENT[id],
      neuralLinks: links,
    }));

    activationTimer.current = setTimeout(() => {
      activatedRef.current = null;
      setEffects((prev) => ({
        ...prev,
        activatedFragmentId: null,
        showFragmentLabel: null,
        platformRipplePattern: 'default',
        neuralLinks: [],
      }));
    }, 2000);
  }, []);

  const fireEmotionShockwave = useCallback(() => {
    const target = curiousTargetRef.current;
    shockwaveRef.current = 1;
    const colorMap: Record<PetMood, string> = {
      idle: '#ff2a2a',
      happy: '#ffd700',
      surprised: '#ffffff',
      sleepy: '#2a0a0a',
      curious: '#00f0ff',
      working: '#ff006e',
      patrol: '#ff2a2a',
    };
    setEffects((prev) => ({
      ...prev,
      shockwaveActive: true,
      shockwaveStrength: 1,
      shockwaveColor: colorMap[mood],
      shockwaveTarget: target,
      particleMode: 'attract',
    }));
    activateFragment(target);
    setTimeout(() => {
      setEffects((prev) => ({
        ...prev,
        shockwaveActive: false,
        shockwaveStrength: 0,
        shockwaveTarget: null,
      }));
    }, 800);
  }, [activateFragment, mood]);

  const startEmotionInject = useCallback(() => {
    setInteractionMode('emotionInject');
    setPetStretchX(1.3);
    document.body.style.cursor = 'grab';
  }, []);

  const endEmotionInject = useCallback(() => {
    setInteractionMode('normal');
    setPetStretchX(1);
    document.body.style.cursor = '';
    fireEmotionShockwave();
    triggerHappy();
  }, [fireEmotionShockwave, triggerHappy]);

  const startPetDrag = useCallback(() => {
    setInteractionMode('dragging');
    onPetInteract();
  }, [onPetInteract]);

  const updatePetDrag = useCallback((offsetX: number, offsetY: number) => {
    setPetScreenOffset({ x: offsetX, y: offsetY });
    const nx = offsetX / window.innerWidth;
    const ny = -offsetY / window.innerHeight;
    setEffects((prev) => ({
      ...prev,
      cameraPetBias: { x: nx * 2.5, y: ny * 1.5 },
    }));
  }, []);

  const endPetDrag = useCallback(() => {
    setInteractionMode('normal');
  }, []);

  const triggerTimeFreeze = useCallback(() => {
    if (timeFreezeTimer.current) clearTimeout(timeFreezeTimer.current);
    setInteractionMode('timeFrozen');
    setEffects((prev) => ({ ...prev, timeFrozen: true, timeScale: 0 }));

    timeFreezeTimer.current = setTimeout(() => {
      setInteractionMode('normal');
      compensationRef.current = 2.5;
      setEffects((prev) => ({ ...prev, timeFrozen: false, timeScale: 1, timeCompensation: 2.5 }));
      setTimeout(() => {
        compensationRef.current = 1;
        setEffects((prev) => ({ ...prev, timeCompensation: 1 }));
      }, 600);
    }, 2000);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      setMouse({ x: nx, y: ny });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (mood === 'idle' || mood === 'patrol' || mood === 'sleepy') triggerWorking();
      }
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [mood, triggerWorking]);

  useEffect(() => {
    resetIdleTimers();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (sleepyTimer.current) clearTimeout(sleepyTimer.current);
      clearMoodTimer();
    };
  }, [resetIdleTimers]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mood, patrolAngle }));
  }, [mood, patrolAngle]);

  // 宠物拖拽松手 — 弹簧回位
  useEffect(() => {
    if (interactionMode !== 'normal' || (petScreenOffset.x === 0 && petScreenOffset.y === 0)) return;
    let frame: number;
    const tick = () => {
      setPetScreenOffset((prev) => {
        const nx = prev.x * 0.88;
        const ny = prev.y * 0.88;
        if (Math.abs(nx) < 0.5 && Math.abs(ny) < 0.5) {
          setEffects((e) => ({ ...e, cameraPetBias: { x: 0, y: 0 } }));
          return { x: 0, y: 0 };
        }
        const biasX = (nx / window.innerWidth) * 2.5;
        const biasY = (-ny / window.innerHeight) * 1.5;
        setEffects((e) => ({ ...e, cameraPetBias: { x: biasX, y: biasY } }));
        return { x: nx, y: ny };
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [interactionMode, petScreenOffset.x, petScreenOffset.y]);

  // 情绪 → WebGL 效果实时衰减
  useEffect(() => {
    let frame: number;
    const start = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      let next = moodEffects(mood, DEFAULT_EFFECTS);

      if (mood === 'curious') {
        next = { ...next, fragmentHighlightId: curiousTargetRef.current, cameraFocusFragment: curiousTargetRef.current };
      }

      if (mood === 'surprised') {
        pushDecayRef.current *= 0.88;
        rippleDecayRef.current = Math.max(0, rippleDecayRef.current - elapsed * 0.15);
        shakeDecayRef.current *= 0.9;
        shockwaveRef.current = Math.min(6, elapsed * 10);
        next = {
          ...next,
          fragmentPush: pushDecayRef.current,
          platformRippleIntensity: Math.max(0.1, rippleDecayRef.current),
          groundWaveAmplitude: Math.max(0.1, rippleDecayRef.current),
          laserFullBright: elapsed < 0.5,
          cameraShake: shakeDecayRef.current,
        };
      }

      if (mood === 'patrol') {
        const biasX = Math.sin(patrolAngle) * 0.2;
        const biasY = Math.cos(patrolAngle) * 0.1;
        next = { ...next, cameraPetBias: { x: biasX, y: biasY }, driftSpeedMult: 1.3 };
      }

      next.timeCompensation = compensationRef.current;

      if (activatedRef.current) {
        next.activatedFragmentId = activatedRef.current;
        next.showFragmentLabel = activatedRef.current;
        next.platformRipplePattern = RIPPLE_BY_FRAGMENT[activatedRef.current];
      }

      setEffects(next);
      setWorldSnapshot({
        waveAmplitude: next.groundWaveAmplitude,
        platformPulse: next.platformRippleIntensity,
        fragments: FRAGMENT_IDS.map((id, i) => ({
          id,
          nx: 0.15 + (i % 3) * 0.3,
          ny: 0.2 + Math.floor(i / 3) * 0.35,
          active: next.activatedFragmentId === id || next.fragmentHighlightId === id,
        })),
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mood, patrolAngle]);

  const patrolDirection = useMemo(
    () => ({ x: Math.sin(patrolAngle), y: Math.cos(patrolAngle) }),
    [patrolAngle],
  );

  const value = useMemo<BitChanContextValue>(
    () => ({
      mood,
      setMood,
      effects,
      worldSnapshot,
      mouse,
      patrolDirection,
      patrolAngle,
      setPatrolAngle,
      interactionMode,
      petScreenOffset,
      petStretchX,
      triggerHappy,
      triggerSurprised,
      triggerCurious,
      triggerWorking,
      onPetInteract,
      startEmotionInject,
      endEmotionInject,
      startPetDrag,
      updatePetDrag,
      endPetDrag,
      triggerTimeFreeze,
      activateFragment,
      fireEmotionShockwave,
    }),
    [
      mood,
      setMood,
      effects,
      worldSnapshot,
      mouse,
      patrolDirection,
      patrolAngle,
      interactionMode,
      petScreenOffset,
      petStretchX,
      triggerHappy,
      triggerSurprised,
      triggerCurious,
      triggerWorking,
      onPetInteract,
      startEmotionInject,
      endEmotionInject,
      startPetDrag,
      updatePetDrag,
      endPetDrag,
      triggerTimeFreeze,
      activateFragment,
      fireEmotionShockwave,
    ],
  );

  return <BitChanContext.Provider value={value}>{children}</BitChanContext.Provider>;
}

export function useBitChan(): BitChanContextValue {
  const ctx = useContext(BitChanContext);
  if (!ctx) throw new Error('useBitChan must be used within BitChanProvider');
  return ctx;
}

export { FRAGMENT_IDS, RIPPLE_BY_FRAGMENT };

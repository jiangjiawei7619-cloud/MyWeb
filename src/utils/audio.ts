// High-tech Synthesized Audio feedback using browser's Web Audio API.
// Browsers block audio until a user gesture unlocks the AudioContext.

let audioCtx: AudioContext | null = null;
const pendingAfterUnlock: Array<() => void> = [];

function createAudioContextIfNeeded(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    } catch (e) {
      console.warn('Web Audio API not supported in this browser.', e);
    }
  }
  return audioCtx;
}

function flushPendingAfterUnlock() {
  if (audioCtx?.state !== 'running') return;
  const queue = pendingAfterUnlock.splice(0);
  queue.forEach((fn) => fn());
}

/** Run after AudioContext is unlocked by a user gesture (click / key / touch). */
export function runWhenAudioUnlocked(fn: () => void) {
  createAudioContextIfNeeded();
  if (audioCtx?.state === 'running') {
    fn();
    return;
  }
  pendingAfterUnlock.push(fn);
}

/** Prime HTMLMediaElement during a user gesture so delayed play() succeeds. */
const AMBIENT_TRACKS = ['/cutyfull.mp3', '/cutemorefull.mp3'] as const;

let ambientAudio: HTMLAudioElement | null = null;
let ambientTrackIndex = 0;
let isAmbientPlaying = false;
let tabHidden = false;
let mediaUnlocked = false;
let mediaUnlockPromise: Promise<boolean> | null = null;

function onAmbientTrackEnded() {
  if (!isAmbientPlaying || tabHidden) return;
  playNextAmbientTrack(false);
}

function disposeAmbientAudioElement(audio: HTMLAudioElement) {
  audio.removeEventListener('ended', onAmbientTrackEnded);
  audio.pause();
}

function createAmbientAudioElement(trackIndex: number): HTMLAudioElement {
  const audio = new Audio(AMBIENT_TRACKS[trackIndex]!);
  audio.loop = false;
  audio.preload = 'auto';
  audio.addEventListener('ended', onAmbientTrackEnded);
  return audio;
}

function playNextAmbientTrack(resetTime = true) {
  const prevVolume = ambientAudio?.volume ?? getAmbientVolumeForMode();

  if (ambientAudio) {
    disposeAmbientAudioElement(ambientAudio);
  }

  ambientTrackIndex = (ambientTrackIndex + 1) % AMBIENT_TRACKS.length;
  ambientAudio = createAmbientAudioElement(ambientTrackIndex);
  ambientAudio.volume = prevVolume;
  if (resetTime) {
    ambientAudio.currentTime = 0;
  }

  void ambientAudio.play().catch((err) => {
    console.warn('Ambient track advance failed.', err);
  });
}

function getOrCreateAmbientAudio(): HTMLAudioElement {
  if (!ambientAudio) {
    ambientAudio = createAmbientAudioElement(ambientTrackIndex);
  }
  return ambientAudio;
}

export async function unlockMediaFromGesture(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (mediaUnlocked) return true;
  if (mediaUnlockPromise) return mediaUnlockPromise;

  mediaUnlockPromise = (async () => {
    try {
      const audio = getOrCreateAmbientAudio();
      const targetVolume = audio.volume || 0.24;
      audio.volume = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = targetVolume;
      mediaUnlocked = true;
      return true;
    } catch {
      return false;
    } finally {
      mediaUnlockPromise = null;
    }
  })();

  return mediaUnlockPromise;
}

/** Call on pointer / keyboard / touch to satisfy browser autoplay policy. */
export async function unlockAudioFromGesture(): Promise<boolean> {
  const ctx = createAudioContextIfNeeded();
  const mediaUnlock = unlockMediaFromGesture();
  if (!ctx) {
    await mediaUnlock;
    return false;
  }
  if (ctx.state === 'running') {
    flushPendingAfterUnlock();
    await mediaUnlock;
    return true;
  }
  try {
    await ctx.resume();
  } catch {
    await mediaUnlock;
    return false;
  }
  flushPendingAfterUnlock();
  await mediaUnlock;
  return (ctx.state as AudioContextState) === 'running';
}

/** Install global gesture listeners — safe to call from multiple components. */
let unlockListenerCount = 0;

export function installAudioUnlockListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onGesture = () => {
    void unlockAudioFromGesture();
  };

  const opts: AddEventListenerOptions = { capture: true, passive: true };

  if (unlockListenerCount === 0) {
    window.addEventListener('pointerdown', onGesture, opts);
    window.addEventListener('keydown', onGesture, opts);
    window.addEventListener('touchstart', onGesture, opts);
  }
  unlockListenerCount += 1;

  return () => {
    unlockListenerCount -= 1;
    if (unlockListenerCount <= 0) {
      unlockListenerCount = 0;
      window.removeEventListener('pointerdown', onGesture, opts);
      window.removeEventListener('keydown', onGesture, opts);
      window.removeEventListener('touchstart', onGesture, opts);
    }
  };
}

function muteForHiddenTab() {
  if (tabHidden) return;
  tabHidden = true;
  wasAmbientPlayingBeforeHide = isAmbientPlaying;

  cancelAmbientVolumeRamp();
  if (ambientAudio && isAmbientPlaying) {
    ambientAudio.pause();
  }

  if (audioCtx?.state === 'running') {
    void audioCtx.suspend();
  }
}

function unmuteForVisibleTab() {
  if (!tabHidden) return;
  tabHidden = false;

  if (audioCtx?.state === 'suspended') {
    void audioCtx.resume().then(() => flushPendingAfterUnlock());
  }

  if (wasAmbientPlayingBeforeHide && ambientAudio && isAmbientPlaying) {
    ambientAudio.volume = getAmbientVolumeForMode();
    void ambientAudio.play().catch((err) => {
      console.warn('Ambient resume after tab focus failed.', err);
    });
  }

  wasAmbientPlayingBeforeHide = false;
}

function handleVisibilityChange() {
  if (document.hidden) {
    muteForHiddenTab();
  } else {
    unmuteForVisibleTab();
  }
}

/** 标签页切到后台时静音，回到前台时恢复（若之前在播放）。 */
let visibilityListenerCount = 0;

export function installAudioVisibilityListeners(): () => void {
  if (typeof document === 'undefined') return () => {};

  if (visibilityListenerCount === 0) {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (document.hidden) muteForHiddenTab();
  }
  visibilityListenerCount += 1;

  return () => {
    visibilityListenerCount -= 1;
    if (visibilityListenerCount <= 0) {
      visibilityListenerCount = 0;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
}

export function isTabAudioMuted(): boolean {
  return tabHidden;
}

function getAudioContext(): AudioContext | null {
  if (tabHidden) return null;
  const ctx = createAudioContextIfNeeded();
  if (!ctx || ctx.state !== 'running') return null;
  return ctx;
}

/**
 * Play a high-pitched futuristic click/tick sound
 */
export function playClick(frequency = 1200, duration = 0.04, type: OscillatorType = 'sine') {
  runWhenAudioUnlocked(() => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Avoid breaking if audio state issues
  }
  });
}

/**
 * Play a low digital hum/confirm tone
 */
export function playLowHum() {
  runWhenAudioUnlocked(() => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.setValueAtTime(80, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.24, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (err) {}
  });
}

/**
 * Play a glitch synth burst sweep
 */
export function playGlitchSweep() {
  runWhenAudioUnlocked(() => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.15);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc2.start();
    osc.stop(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.15);
  } catch (err) {}
  });
}

/**
 * Play jump / teleport sound (UI page transitions)
 */
export function playJumpSound() {
  runWhenAudioUnlocked(() => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const duration = 0.5;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {}
  });
}

function createSoftNoise(ctx: AudioContext, now: number, duration: number, gainPeak: number) {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(680, now);
  filter.Q.setValueAtTime(0.35, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
  source.stop(now + duration);
}

/** EXPLORE 一段跳 — 柔和赛博：低中频上扬 + 慢衰减 */
export function playCyberJumpSound() {
  runWhenAudioUnlocked(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.46;

      const body = ctx.createOscillator();
      body.type = 'sine';
      body.frequency.setValueAtTime(118, now);
      body.frequency.exponentialRampToValueAtTime(420, now + duration * 0.38);
      body.frequency.exponentialRampToValueAtTime(240, now + duration);

      const warmth = ctx.createOscillator();
      warmth.type = 'triangle';
      warmth.frequency.setValueAtTime(88, now);
      warmth.frequency.exponentialRampToValueAtTime(310, now + duration * 0.42);
      warmth.frequency.exponentialRampToValueAtTime(165, now + duration);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.0001, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.2, now + 0.038);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const warmthGain = ctx.createGain();
      warmthGain.gain.setValueAtTime(0.0001, now);
      warmthGain.gain.exponentialRampToValueAtTime(0.09, now + 0.045);
      warmthGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const master = ctx.createBiquadFilter();
      master.type = 'lowpass';
      master.frequency.setValueAtTime(920, now);
      master.frequency.exponentialRampToValueAtTime(520, now + duration);

      body.connect(bodyGain);
      warmth.connect(warmthGain);
      bodyGain.connect(master);
      warmthGain.connect(master);
      master.connect(ctx.destination);

      body.start(now);
      warmth.start(now);
      body.stop(now + duration);
      warmth.stop(now + duration);

      createSoftNoise(ctx, now, duration * 0.55, 0.035);
    } catch (err) {}
  });
}

/** EXPLORE 二段跳 — 稍亮但仍圆润，比一段跳短一点 */
export function playCyberDoubleJumpSound() {
  runWhenAudioUnlocked(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.34;

      const lift = ctx.createOscillator();
      lift.type = 'sine';
      lift.frequency.setValueAtTime(165, now);
      lift.frequency.exponentialRampToValueAtTime(560, now + duration * 0.45);
      lift.frequency.exponentialRampToValueAtTime(290, now + duration);

      const glow = ctx.createOscillator();
      glow.type = 'triangle';
      glow.frequency.setValueAtTime(220, now + 0.04);
      glow.frequency.exponentialRampToValueAtTime(680, now + duration * 0.55);
      glow.frequency.exponentialRampToValueAtTime(360, now + duration);

      const liftGain = ctx.createGain();
      liftGain.gain.setValueAtTime(0.0001, now);
      liftGain.gain.exponentialRampToValueAtTime(0.17, now + 0.032);
      liftGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const glowGain = ctx.createGain();
      glowGain.gain.setValueAtTime(0.0001, now + 0.04);
      glowGain.gain.exponentialRampToValueAtTime(0.08, now + 0.07);
      glowGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const master = ctx.createBiquadFilter();
      master.type = 'lowpass';
      master.frequency.setValueAtTime(1100, now);
      master.frequency.exponentialRampToValueAtTime(620, now + duration);

      lift.connect(liftGain);
      glow.connect(glowGain);
      liftGain.connect(master);
      glowGain.connect(master);
      master.connect(ctx.destination);

      lift.start(now);
      glow.start(now + 0.04);
      lift.stop(now + duration);
      glow.stop(now + duration);

      createSoftNoise(ctx, now + 0.02, duration * 0.45, 0.028);
    } catch (err) {}
  });
}

/**
 * Play a cyberpunk-style sci-fi 'deng' / high-tech chirp sound.
 * Has a fast attack, bright harmonics, and smooth cyber decay.
 */
export function playGlitchDeng() {
  runWhenAudioUnlocked(() => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const duration = 0.18;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + duration);

    const resonance = ctx.createOscillator();
    resonance.type = 'triangle';
      resonance.frequency.setValueAtTime(360, now);
      resonance.frequency.exponentialRampToValueAtTime(120, now + duration);

    const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    resonance.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    resonance.start(now);
    osc.stop(now + duration);
    resonance.stop(now + duration);
  } catch (err) {}
  });
}

/**
 * Text glitch animation cue (soft multi-stage):
 * layered pulse sequence that follows character flicker progression,
 * avoiding sharp/harsh peaks.
 */
export function playTextGlitchFx(options?: {
  charCount?: number;
}) {
  runWhenAudioUnlocked(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const charCount = Math.max(4, Math.min(options?.charCount ?? 10, 28));
      const steps = Math.max(5, Math.min(Math.round(charCount * 0.55), 14));
      const totalDuration = 0.28 + charCount * 0.015;
      const stepDuration = totalDuration / steps;

      const bus = ctx.createGain();
      bus.gain.setValueAtTime(getTextGlitchBusGain(), now);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2300, now);
      lp.Q.value = 0.6;
      bus.connect(lp);
      lp.connect(ctx.destination);

      for (let i = 0; i < steps; i++) {
        const t = now + i * stepDuration;
        const pulse = ctx.createOscillator();
        pulse.type = i % 3 === 0 ? 'triangle' : 'sine';

        const base = 260 + i * 42;
        pulse.frequency.setValueAtTime(base, t);
        pulse.frequency.exponentialRampToValueAtTime(base * 1.12, t + stepDuration * 0.65);

        const g = ctx.createGain();
        const peak = 0.2261 * (1 - i / (steps * 1.35));
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + stepDuration * 0.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t + stepDuration * 0.96);

        pulse.connect(g);
        g.connect(bus);
        pulse.start(t);
        pulse.stop(t + stepDuration);
      }

      // Very soft texture to avoid sterile beeps.
      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * totalDuration), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.08;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseHp = ctx.createBiquadFilter();
      noiseHp.type = 'highpass';
      noiseHp.frequency.setValueAtTime(1400, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.0527, now + totalDuration * 0.24);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);

      noise.connect(noiseHp);
      noiseHp.connect(noiseGain);
      noiseGain.connect(bus);
      noise.start(now);
      noise.stop(now + totalDuration);
    } catch (err) {}
  });
}

const CAPACITOR_CHIME_DURATION = 0.72;

function playCapacitorFillCompleteInternal() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const duration = CAPACITOR_CHIME_DURATION;

  try {
    const now = ctx.currentTime;

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(52, now);
    sub.frequency.linearRampToValueAtTime(78, now + duration * 0.38);
    sub.frequency.linearRampToValueAtTime(58, now + duration);

    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(98, now);
    body.frequency.linearRampToValueAtTime(147, now + duration * 0.32);
    body.frequency.linearRampToValueAtTime(88, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.6;
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.linearRampToValueAtTime(520, now + duration * 0.28);
    filter.frequency.exponentialRampToValueAtTime(240, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.14);
    gain.gain.linearRampToValueAtTime(0.44, now + duration * 0.48);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    sub.connect(filter);
    body.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    sub.start(now);
    body.start(now);
    sub.stop(now + duration);
    body.stop(now + duration);
  } catch (err) {}
}

/**
 * Smooth low capacitor-full tone — plays when loading logo fill completes.
 * Queued until audio is unlocked by user gesture; onPlayed runs when sound actually starts.
 * When startAmbientAfter is true, ambient background starts once the chime finishes.
 */
export function playCapacitorFillComplete(options?: {
  onPlayed?: () => void;
  startAmbientAfter?: boolean;
}): number {
  const chimeMs = CAPACITOR_CHIME_DURATION * 1000;
  runWhenAudioUnlocked(() => {
    playCapacitorFillCompleteInternal();
    options?.onPlayed?.();
    if (options?.startAmbientAfter) {
      setTimeout(startAmbientBackground, chimeMs);
    }
  });
  return chimeMs;
}

type AmbientStatusListener = (playing: boolean) => void;
const ambientListeners = new Set<AmbientStatusListener>();
let ambientStartQueued = false;

/** 环境背景音常规响度 */
const AMBIENT_NORMAL_VOLUME = 0.24;
/** 博客阅读态下持续抑制的响度（约为常规的 18%） */
const AMBIENT_READING_VOLUME = 0.044;
/** ABOUT/Profile 页背景抑制量 = 博客详情抑制量 × 此比例 */
const ABOUT_FOCUS_SUPPRESSION_RATIO = 0.55;
/** 文字闪动音效常规总线响度 */
const TEXT_GLITCH_NORMAL_BUS_GAIN = 0.8092;
let blogReadingModeActive = false;
let aboutFocusModeActive = false;
let ambientVolumeRampFrame: number | null = null;
let wasAmbientPlayingBeforeHide = false;

/** 背景音在阅读态保留比例 */
function getAmbientRetainRatio() {
  return AMBIENT_READING_VOLUME / AMBIENT_NORMAL_VOLUME;
}

function getSuppressionAmount() {
  const blogSuppression = 1 - getAmbientRetainRatio();
  if (blogReadingModeActive) return blogSuppression;
  if (aboutFocusModeActive) return blogSuppression * ABOUT_FOCUS_SUPPRESSION_RATIO;
  return 0;
}

function getAmbientRetainRatioByMode() {
  return 1 - getSuppressionAmount();
}

/**
 * 文字特效抑制强度 = 背景音抑制强度的一半。
 * 例：背景保留 18% 时，文字保留约 59%。
 */
function getTextGlitchRetainRatio() {
  const ambientRetain = getAmbientRetainRatioByMode();
  return 1 - (1 - ambientRetain) / 2;
}

function getTextGlitchBusGain() {
  const suppressActive = blogReadingModeActive || aboutFocusModeActive;
  return TEXT_GLITCH_NORMAL_BUS_GAIN * (suppressActive ? getTextGlitchRetainRatio() : 1);
}

function cancelAmbientVolumeRamp() {
  if (ambientVolumeRampFrame !== null) {
    cancelAnimationFrame(ambientVolumeRampFrame);
    ambientVolumeRampFrame = null;
  }
}

function getAmbientVolumeForMode() {
  return AMBIENT_NORMAL_VOLUME * getAmbientRetainRatioByMode();
}

function rampAmbientVolume(target: number, durationMs: number) {
  const audio = ambientAudio;
  if (!audio) return;

  cancelAmbientVolumeRamp();
  const from = audio.volume;
  const start = performance.now();

  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = t * t * (3 - 2 * t);
    audio.volume = from + (target - from) * eased;
    if (t < 1) {
      ambientVolumeRampFrame = requestAnimationFrame(tick);
    } else {
      ambientVolumeRampFrame = null;
    }
  };

  ambientVolumeRampFrame = requestAnimationFrame(tick);
}

/**
 * 博客阅读态进入/退出过渡音：多层、更明显，带“空间收束/释放”感。
 */
function playBlogReaderTransition(kind: 'enter' | 'exit') {
  runWhenAudioUnlocked(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = kind === 'enter' ? 0.82 : 0.9;
      const master = ctx.createGain();
      master.gain.setValueAtTime(kind === 'enter' ? 0.3 : 0.28, now);
      master.connect(ctx.destination);

      // 低频“舱门”冲击
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      const subStart = kind === 'enter' ? 140 : 88;
      const subEnd = kind === 'enter' ? 52 : 168;
      sub.frequency.setValueAtTime(subStart, now);
      sub.frequency.exponentialRampToValueAtTime(Math.max(subEnd, 35), now + duration * 0.72);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.linearRampToValueAtTime(0.42, now + 0.05);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      sub.connect(subGain);
      subGain.connect(master);

      // 中频扫频（进入下潜 / 退出抬升）
      const sweep = ctx.createOscillator();
      sweep.type = 'triangle';
      const sweepStart = kind === 'enter' ? 520 : 180;
      const sweepEnd = kind === 'enter' ? 120 : 620;
      sweep.frequency.setValueAtTime(sweepStart, now);
      sweep.frequency.exponentialRampToValueAtTime(Math.max(sweepEnd, 40), now + duration * 0.9);
      const sweepLp = ctx.createBiquadFilter();
      sweepLp.type = 'lowpass';
      sweepLp.frequency.setValueAtTime(kind === 'enter' ? 1200 : 500, now);
      sweepLp.frequency.exponentialRampToValueAtTime(kind === 'enter' ? 320 : 1800, now + duration);
      const sweepGain = ctx.createGain();
      sweepGain.gain.setValueAtTime(0.0001, now);
      sweepGain.gain.linearRampToValueAtTime(0.26, now + duration * 0.16);
      sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      sweep.connect(sweepLp);
      sweepLp.connect(sweepGain);
      sweepGain.connect(master);

      // 噪声快门，强化“切换”感知
      const noiseDur = Math.min(0.22, duration * 0.3);
      const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * noiseDur), ctx.sampleRate);
      const noiseData = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) noiseData[i] = (Math.random() * 2 - 1) * 0.5;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      const noiseHp = ctx.createBiquadFilter();
      noiseHp.type = 'bandpass';
      noiseHp.frequency.setValueAtTime(kind === 'enter' ? 1800 : 1200, now);
      noiseHp.Q.value = 0.8;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now + 0.03);
      noiseGain.gain.linearRampToValueAtTime(0.16, now + 0.07);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03 + noiseDur);
      noise.connect(noiseHp);
      noiseHp.connect(noiseGain);
      noiseGain.connect(master);

      // 收尾提示音：进入/退出各给一个清晰但柔和的“叮”
      const ping = ctx.createOscillator();
      ping.type = 'sine';
      const pingFreq = kind === 'enter' ? 420 : 760;
      ping.frequency.setValueAtTime(pingFreq, now + duration * 0.72);
      ping.frequency.exponentialRampToValueAtTime(pingFreq * 1.08, now + duration * 0.95);
      const pingGain = ctx.createGain();
      pingGain.gain.setValueAtTime(0.0001, now + duration * 0.72);
      pingGain.gain.linearRampToValueAtTime(0.14, now + duration * 0.8);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      ping.connect(pingGain);
      pingGain.connect(master);

      sub.start(now);
      sweep.start(now);
      noise.start(now + 0.03);
      ping.start(now + duration * 0.72);
      sub.stop(now + duration + 0.02);
      sweep.stop(now + duration + 0.02);
      noise.stop(now + 0.03 + noiseDur + 0.02);
      ping.stop(now + duration + 0.02);
    } catch (err) {}
  });
}

function setBlogReadingBodyClass(active: boolean) {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('blog-reading-mode', active);
}

/** 进入博客详情：压低背景音并保持抑制，直到退出阅读态。 */
export function enterBlogReadingMode() {
  if (blogReadingModeActive) return;
  blogReadingModeActive = true;
  setBlogReadingBodyClass(true);
  playBlogReaderTransition('enter');
  if (isAmbientPlaying) {
    rampAmbientVolume(getAmbientVolumeForMode(), 760);
  }
}

/** 退出博客详情：恢复背景音常规响度。 */
export function exitBlogReadingMode() {
  if (!blogReadingModeActive) return;
  blogReadingModeActive = false;
  setBlogReadingBodyClass(false);
  playBlogReaderTransition('exit');
  if (isAmbientPlaying) {
    rampAmbientVolume(getAmbientVolumeForMode(), 920);
  }
}

export function isBlogReadingModeActive() {
  return blogReadingModeActive;
}

/** 进入 ABOUT/Profile 页面：背景抑制量为博客详情的 55%。 */
export function enterAboutFocusMode() {
  if (aboutFocusModeActive) return;
  aboutFocusModeActive = true;
  if (isAmbientPlaying) {
    rampAmbientVolume(getAmbientVolumeForMode(), 760);
  }
}

/** 离开 ABOUT 页面：解除 ABOUT 抑制（若仍在博客阅读态则保持更强抑制）。 */
export function exitAboutFocusMode() {
  if (!aboutFocusModeActive) return;
  aboutFocusModeActive = false;
  if (isAmbientPlaying) {
    rampAmbientVolume(getAmbientVolumeForMode(), 920);
  }
}

/** 文字闪动响度缩放（阅读态约为常规的 59%） */
export function getTextGlitchVolumeScale() {
  return blogReadingModeActive ? getTextGlitchRetainRatio() : 1;
}

/** 文字闪动视觉强度（阅读态约为 55%） */
export function getTextGlitchVisualScale() {
  const ambientRetain = getAmbientRetainRatioByMode();
  const visualRetain = 1 - (1 - ambientRetain) / 2;
  return Math.max(0.55, Math.min(1, visualRetain));
}

export function subscribeAmbientStatus(listener: AmbientStatusListener): () => void {
  ambientListeners.add(listener);
  listener(isAmbientPlaying);
  return () => ambientListeners.delete(listener);
}

function notifyAmbientListeners() {
  ambientListeners.forEach((listener) => listener(isAmbientPlaying));
}

function startAmbientBackgroundInternal() {
  if (tabHidden) {
    wasAmbientPlayingBeforeHide = true;
    isAmbientPlaying = true;
    notifyAmbientListeners();
    return;
  }

  if (isAmbientPlaying) {
    notifyAmbientListeners();
    return;
  }

  try {
    const audio = getOrCreateAmbientAudio();
    audio.volume = getAmbientVolumeForMode();
    isAmbientPlaying = true;
    notifyAmbientListeners();

    void audio.play().catch((err) => {
      console.warn('Audio autoplay was prevented by browser policy.', err);
      isAmbientPlaying = false;
      notifyAmbientListeners();
    });
  } catch (err) {
    console.error('Ambient audio init failed', err);
    isAmbientPlaying = false;
    notifyAmbientListeners();
  }
}

export function startAmbientBackground() {
  if (isAmbientPlaying) {
    notifyAmbientListeners();
    return;
  }
  if (ambientStartQueued) return;
  ambientStartQueued = true;

  const attempt = () => {
    ambientStartQueued = false;
    startAmbientBackgroundInternal();
  };

  if (mediaUnlocked) {
    attempt();
    return;
  }

  void unlockMediaFromGesture().then((unlocked) => {
    if (unlocked) {
      attempt();
      return;
    }
    runWhenAudioUnlocked(attempt);
  });
}

export function stopAmbientBackground() {
  if (ambientAudio) {
    disposeAmbientAudioElement(ambientAudio);
    ambientAudio = null;
  }
  ambientTrackIndex = 0;
  isAmbientPlaying = false;
  wasAmbientPlayingBeforeHide = false;
  notifyAmbientListeners();
}

export function toggleAmbientBackground(): boolean {
  if (isAmbientPlaying) {
    stopAmbientBackground();
    return false;
  } else {
    startAmbientBackground();
    return true;
  }
}

export function getAmbientStatus(): boolean {
  return isAmbientPlaying;
}
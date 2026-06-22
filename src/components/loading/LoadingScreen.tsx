import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import {
  installAudioUnlockListeners,
  playCapacitorFillComplete,
  unlockAudioFromGesture,
} from '@/utils/audio';

interface LoadingScreenProps {
  onComplete: () => void;
  onFlashStart?: () => void;
}

type IntroState = 'boot' | 'idle' | 'transitioning' | 'finished';

type GlitchSlice = {
  id: number;
  top: number;
  height: number;
  dx: number;
  delay: number;
  duration: number;
  tint: 'red' | 'cyan';
};

type GlitchBit = {
  id: number;
  x: number;
  y: number;
  w: number;
  delay: number;
  color: 'red' | 'cyan' | 'white';
};

const LOGO_SRC = '/textures/loading-cat-logo-quiet.png';
const BOOT_MS = 360;
const REVEAL_DELAY_MS = 620;
const FINISH_MS = 1120;
const LOGO_SIZE = 'clamp(176px, 24vw, 310px)';

const GLITCH_SLICES: GlitchSlice[] = [
  { id: 0, top: 16, height: 7, dx: 8, delay: 0.18, duration: 0.11, tint: 'red' },
  { id: 1, top: 31, height: 5, dx: -11, delay: 0.26, duration: 0.09, tint: 'cyan' },
  { id: 2, top: 48, height: 9, dx: 13, delay: 0.34, duration: 0.12, tint: 'red' },
  { id: 3, top: 63, height: 6, dx: -7, delay: 0.42, duration: 0.1, tint: 'cyan' },
  { id: 4, top: 76, height: 5, dx: 5, delay: 0.5, duration: 0.09, tint: 'red' },
];

const GLITCH_BITS: GlitchBit[] = [
  { id: 0, x: 11, y: 27, w: 8, delay: 0.2, color: 'cyan' },
  { id: 1, x: 83, y: 29, w: 10, delay: 1.6, color: 'red' },
  { id: 2, x: 17, y: 68, w: 7, delay: 2.7, color: 'white' },
  { id: 3, x: 79, y: 70, w: 8, delay: 3.8, color: 'cyan' },
  { id: 4, x: 23, y: 19, w: 5, delay: 4.5, color: 'red' },
  { id: 5, x: 74, y: 82, w: 7, delay: 5.4, color: 'cyan' },
];

export default function LoadingScreen({ onComplete, onFlashStart }: LoadingScreenProps) {
  const [introState, setIntroState] = useState<IntroState>('boot');
  const introStateRef = useRef<IntroState>('boot');
  const transitionStarted = useRef(false);
  const finished = useRef(false);
  const revealed = useRef(false);
  const timerIds = useRef<number[]>([]);

  useEffect(() => installAudioUnlockListeners(), []);

  useEffect(() => {
    introStateRef.current = introState;
  }, [introState]);

  const clearTimers = useCallback(() => {
    timerIds.current.forEach((id) => window.clearTimeout(id));
    timerIds.current = [];
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!transitionStarted.current && introStateRef.current === 'boot') {
        setIntroState('idle');
      }
    }, BOOT_MS);
    timerIds.current.push(id);
    return () => {
      window.clearTimeout(id);
    };
  }, []);

  const revealHome = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    onFlashStart?.();
    playCapacitorFillComplete({ startAmbientAfter: true });
  }, [onFlashStart]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    revealHome();
    setIntroState('finished');
    clearTimers();
    onComplete();
  }, [clearTimers, onComplete, revealHome]);

  const startIntro = useCallback(() => {
    if (transitionStarted.current || finished.current || introStateRef.current === 'finished') return;
    transitionStarted.current = true;
    clearTimers();

    void unlockAudioFromGesture();
    setIntroState('transitioning');

    const revealTimer = window.setTimeout(revealHome, REVEAL_DELAY_MS);

    const finishTimer = window.setTimeout(finish, FINISH_MS);
    timerIds.current.push(revealTimer, finishTimer);
  }, [clearTimers, finish, revealHome]);

  useEffect(() => {
    const onGesture = () => startIntro();
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      startIntro();
    };

    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('click', onGesture);
    window.addEventListener('touchstart', onGesture, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('click', onGesture);
      window.removeEventListener('touchstart', onGesture);
      window.removeEventListener('keydown', onKey);
      clearTimers();
    };
  }, [clearTimers, startIntro]);

  const isIdle = introState === 'idle';
  const isTransitioning = introState === 'transitioning';

  return (
    <div
      className={`intro-overlay intro-overlay--${introState} fixed inset-0 z-[200] pointer-events-auto`}
      onPointerDown={startIntro}
      onClick={startIntro}
      onTouchStart={startIntro}
    >
      <div className="intro-noise" aria-hidden />
      <div className="intro-scanline" aria-hidden />
      <div className="intro-flicker" aria-hidden />

      <motion.div
        className="relative z-[5] flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 8, scale: 0.982, filter: 'blur(5px) brightness(0.72)' }}
        animate={{
          opacity: introState === 'finished' ? 0 : isTransitioning ? [0.88, 0.92, 0.68, 0.24, 0] : 0.86,
          y: isTransitioning ? [0, -1, 0] : 0,
          scale: isTransitioning ? [1, 1.022, 1.006, 0.994] : 1,
          filter: isTransitioning
            ? [
                'blur(0px) brightness(0.9)',
                'blur(0px) brightness(1.08)',
                'blur(0px) brightness(0.82)',
                'blur(2px) brightness(0.55)',
              ]
            : 'blur(0px) brightness(0.88)',
        }}
        transition={
          isTransitioning
            ? { duration: FINISH_MS / 1000, times: [0, 0.16, 0.52, 0.78, 1], ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <div
          className={`logo-idle ${isTransitioning ? 'logo-entering' : ''}`}
          style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
          aria-label="site intro logo"
        >
          <img className="intro-logo intro-logo--cyan" src={LOGO_SRC} alt="" draggable={false} />
          <img className="intro-logo intro-logo--red" src={LOGO_SRC} alt="" draggable={false} />
          <img className="intro-logo intro-logo--main" src={LOGO_SRC} alt="" draggable={false} />

          {isTransitioning &&
            GLITCH_SLICES.map((slice) => (
              <img
                key={slice.id}
                className={`intro-logo logo-glitch-slice logo-glitch-slice--${slice.tint}`}
                src={LOGO_SRC}
                alt=""
                draggable={false}
                style={
                  {
                    '--slice-top': `${slice.top}%`,
                    '--slice-height': `${slice.height}%`,
                    '--slice-dx': `${slice.dx}px`,
                    '--slice-delay': `${slice.delay}s`,
                    '--slice-duration': `${slice.duration}s`,
                  } as CSSProperties
                }
              />
            ))}

          <div className="intro-eye-wake intro-eye-wake--left" aria-hidden />
          <div className="intro-eye-wake intro-eye-wake--right" aria-hidden />

          <div className="intro-glitch-bits" aria-hidden>
            {GLITCH_BITS.map((bit) => (
              <span
                key={bit.id}
                className={`intro-glitch-bit intro-glitch-bit--${bit.color}`}
                style={
                  {
                    left: `${bit.x}%`,
                    top: `${bit.y}%`,
                    width: bit.w,
                    '--bit-delay': `${bit.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>

        <motion.div
          className="cat-loader-prompt"
          initial={{ opacity: 0, y: 5 }}
          animate={{
            opacity: isIdle ? [0.34, 0.48, 0.34] : 0,
            y: isTransitioning ? -2 : isIdle ? 0 : 5,
          }}
          transition={
            isIdle
              ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2, ease: 'easeOut' }
          }
        >
          click / press any key
        </motion.div>
      </motion.div>
    </div>
  );
}

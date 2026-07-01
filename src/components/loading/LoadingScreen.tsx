import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  installAudioUnlockListeners,
  playCapacitorFillComplete,
  unlockAudioFromGesture,
} from '@/utils/audio';

import LoadingFace from '@/components/loading/LoadingFace';

interface LoadingScreenProps {
  onEnter: () => void;
  onComplete: () => void;
}

type IntroState = 'idle' | 'exiting';

/** Matches `.explore-vision-reveal` animation duration in index.css */
const EXIT_MS = 820;
/** 进入网站前需等待的时长 */
const ENTER_LOCK_MS = 3000;

export default function LoadingScreen({ onEnter, onComplete }: LoadingScreenProps) {
  const [introState, setIntroState] = useState<IntroState>('idle');
  const introStateRef = useRef<IntroState>('idle');
  const exitStarted = useRef(false);
  const enterReadyRef = useRef(false);
  const timerIds = useRef<number[]>([]);

  useEffect(() => installAudioUnlockListeners(), []);

  useEffect(() => {
    enterReadyRef.current = false;
    const unlockTimer = window.setTimeout(() => {
      enterReadyRef.current = true;
    }, ENTER_LOCK_MS);
    return () => window.clearTimeout(unlockTimer);
  }, []);

  useEffect(() => {
    introStateRef.current = introState;
  }, [introState]);

  const clearTimers = useCallback(() => {
    timerIds.current.forEach((id) => window.clearTimeout(id));
    timerIds.current = [];
  }, []);

  const startExit = useCallback(() => {
    if (!enterReadyRef.current || exitStarted.current || introStateRef.current !== 'idle') return;
    exitStarted.current = true;
    clearTimers();

    void unlockAudioFromGesture();
    onEnter();
    playCapacitorFillComplete({ startAmbientAfter: true });
    setIntroState('exiting');

    const finishTimer = window.setTimeout(onComplete, EXIT_MS);
    timerIds.current.push(finishTimer);
  }, [clearTimers, onComplete, onEnter]);

  useEffect(() => {
    const onGesture = () => startExit();
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      startExit();
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
  }, [clearTimers, startExit]);

  const isExiting = introState === 'exiting';

  return (
    <div
      className={`loading-screen loading-screen--${introState}`}
      onPointerDown={startExit}
      onClick={startExit}
      onTouchStart={startExit}
      role="status"
      aria-label="Loading"
    >
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <LoadingFace active />
        </motion.div>
      )}

      {isExiting && (
        <div className="explore-vision-reveal pointer-events-none fixed inset-0" aria-hidden />
      )}
    </div>
  );
}

import { useEffect, useState, useRef, useCallback } from 'react';
import { getTextGlitchVisualScale, isBlogReadingModeActive, playTextGlitchFx } from '@/utils/audio';

type JapaneseTonePalette = 'default' | 'blue-violet';

interface GlitchTitleProps {
  english: string;
  japanese: string;
  className?: string;
  onHoverGlitch?: boolean;
  autoGlitch?: boolean;
  trigger?: number | boolean;
  /** 日文阶段字色（默认淡粉，与英文红形成对比） */
  japaneseToneClass?: string;
  japaneseTonePalette?: JapaneseTonePalette;
  /** 乱码阶段字色 */
  glitchToneClass?: string;
  glitchShadow?: string;
  /** 每个字符占位宽度（em），越小字距越紧 */
  charSlotEm?: number;
  /** 空格占位宽度（em） */
  spaceSlotEm?: number;
  /** 字符在占位槽内的水平对齐 */
  charAlign?: 'left' | 'center';
}

const KATAKANA = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890%@#&*+=!';

type CharTone = 'english' | 'japanese' | 'glitch';

interface CharState {
  char: string;
  isGlitch: boolean;
  tone: CharTone;
}

const DEFAULT_JAPANESE_TONE = 'text-[#ffe8e4]/88 scale-y-[1.02]';
const DEFAULT_GLITCH_TONE = 'text-[#ff5357] scale-y-110 skew-x-3';
const DEFAULT_GLITCH_TONE_READING = 'text-[#ff5357] scale-y-[1.04] skew-x-1';
const JAPANESE_PINK_TONES = ['#ffe8e4', '#ffd0cb', '#ffb3af', '#ff8d92'];
const JAPANESE_CYAN_TONES = ['#d9ffff', '#9cf8ff', '#67edf5', '#c6fbff'];
const JAPANESE_BLUE_TONES = ['#d9ffff', '#9cf8ff', '#67edf5', '#38a7ff'];
const JAPANESE_VIOLET_TONES = ['#e5e0ff', '#b8adff', '#9a8cff', '#7c6dff'];

function seededToneUnit(seed: number) {
  let hash = Math.imul(seed ^ 0x9e3779b9, 1664525) + 1013904223;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  return (hash >>> 0) / 4294967295;
}

function getJapaneseToneStyle(index: number, cycleId: number, palette: JapaneseTonePalette = 'default') {
  const mix = seededToneUnit((cycleId + 1) * 4099 + index * 9176);
  const shade = seededToneUnit((cycleId + 3) * 2657 + index * 6151);
  if (palette === 'blue-violet') {
    const blueTone = mix > 0.5;
    const tones = blueTone ? JAPANESE_BLUE_TONES : JAPANESE_VIOLET_TONES;
    const color = tones[Math.floor(shade * tones.length) % tones.length];
    const glowColor = blueTone ? 'rgba(35,215,255,0.22)' : 'rgba(124,109,255,0.24)';
    return {
      color,
      textShadow: `0 0 ${blueTone ? 5 : 6}px ${glowColor}`,
    };
  }

  const cyanTone = mix > 0.5;
  const tones = cyanTone ? JAPANESE_CYAN_TONES : JAPANESE_PINK_TONES;
  const color = tones[Math.floor(shade * tones.length) % tones.length];
  const glowColor = cyanTone
    ? 'rgba(0,238,252,0.18)'
    : index % 2 === 0
      ? 'rgba(255,83,87,0.2)'
      : 'rgba(255,179,175,0.16)';
  return {
    color,
    textShadow: `0 0 ${cyanTone ? 5 : 6}px ${glowColor}`,
  };
}

export default function GlitchTitle({
  english,
  japanese,
  className = '',
  onHoverGlitch = true,
  autoGlitch = true,
  trigger,
  japaneseToneClass = DEFAULT_JAPANESE_TONE,
  japaneseTonePalette = 'default',
  glitchToneClass = DEFAULT_GLITCH_TONE,
  glitchShadow,
  charSlotEm = 1.15,
  spaceSlotEm = 0.4,
  charAlign = 'center',
}: GlitchTitleProps) {
  const [charStates, setCharStates] = useState<CharState[]>(() =>
    english.split('').map((c) => ({ char: c, isGlitch: false, tone: 'english' as CharTone })),
  );
  const [globalGlitch, setGlobalGlitch] = useState(false);

  const englishRef = useRef(english);
  const japaneseRef = useRef(japanese);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const cycleIdRef = useRef(0);

  englishRef.current = english;
  japaneseRef.current = japanese;

  const clearGlitchTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    intervalsRef.current.forEach(clearInterval);
    timersRef.current = [];
    intervalsRef.current = [];
  }, []);

  const getCharForIndex = useCallback((index: number, mode: 'english' | 'japanese' | 'glitch') => {
    const eng = englishRef.current;
    const jap = japaneseRef.current;

    if (mode === 'english') return eng[index] || ' ';
    if (mode === 'japanese') {
      if (index < jap.length) return jap[index];
      const hash = (eng.charCodeAt(index % eng.length) + index) % KATAKANA.length;
      return KATAKANA[hash];
    }
    return KATAKANA[Math.floor(Math.random() * KATAKANA.length)];
  }, []);

  const resetChars = useCallback(() => {
    setCharStates(
      englishRef.current.split('').map((c) => ({ char: c, isGlitch: false, tone: 'english' as CharTone })),
    );
    setGlobalGlitch(false);
  }, []);

  const runGlitchCycle = useCallback(
    () => {
      clearGlitchTimers();
      const cycleId = ++cycleIdRef.current;

      // 文字闪动动画每次触发都播放专属音效（根据字符数生成多段脉冲）
      playTextGlitchFx({ charCount: englishRef.current.length });
      setGlobalGlitch(true);

      const eng = englishRef.current;
      const length = eng.length;
      const reading = isBlogReadingModeActive();
      const visualScale = getTextGlitchVisualScale();
      const phaseScale = reading ? visualScale : 1;
      const staggerDelay = 0;
      const baseDuration = 420;
      const durationStep = 22;
      let maxCharEndTime = 0;

      for (let idx = 0; idx < length; idx++) {
        const charEng = getCharForIndex(idx, 'english');
        const charJap = getCharForIndex(idx, 'japanese');
        if (charEng === ' ') continue;

        const charDuration = (baseDuration + idx * durationStep) * (reading ? 0.72 + 0.28 * visualScale : 1);
        const charEndTime = idx * staggerDelay + charDuration;
        if (charEndTime > maxCharEndTime) maxCharEndTime = charEndTime;

        const startTimer = setTimeout(() => {
          if (cycleId !== cycleIdRef.current) return;

          const startTime = Date.now();
          const charInterval = setInterval(() => {
            if (cycleId !== cycleIdRef.current) {
              clearInterval(charInterval);
              return;
            }

            const elapsed = Date.now() - startTime;

            if (elapsed >= charDuration) {
              clearInterval(charInterval);
              intervalsRef.current = intervalsRef.current.filter((id) => id !== charInterval);
              setCharStates((prev) => {
                const next = [...prev];
                if (next[idx]) next[idx] = { char: charEng, isGlitch: false, tone: 'english' };
                return next;
              });
              return;
            }

            const progress = elapsed / charDuration;
            let nextChar = charEng;
            let isGlitch = false;
            let tone: CharTone = 'english';

            const openEnd = 0.14 * phaseScale;
            const midEnd = 0.42 * phaseScale + (reading ? 0.12 * (1 - phaseScale) : 0);
            const glitchRoll = reading ? 0.9 + 0.08 * (1 - phaseScale) : 0.9;

            if (progress < openEnd) {
              // 开场：乱码冲击
              nextChar = getCharForIndex(idx, 'glitch');
              isGlitch = true;
              tone = 'glitch';
            } else if (progress < midEnd) {
              // 中段：日文主导，偶尔闪回乱码
              if (Math.random() > glitchRoll) {
                nextChar = getCharForIndex(idx, 'glitch');
                isGlitch = true;
                tone = 'glitch';
              } else {
                nextChar = charJap;
                isGlitch = false;
                tone = 'japanese';
              }
            } else {
              // 收尾：按进度从日文/乱码平滑回到英文
              const settleSpan = Math.max(0.22, 1 - midEnd);
              const settle = (progress - midEnd) / settleSpan;
              const roll = Math.random();
              const settleBoost = reading ? 0.82 + 0.14 * (1 - phaseScale) : 0.82;
              if (roll < settle * settleBoost) {
                nextChar = charEng;
                isGlitch = roll > settle * (reading ? 0.42 + 0.28 * phaseScale : 0.55);
                tone = isGlitch ? 'glitch' : 'english';
              } else if (roll < glitchRoll) {
                nextChar = charJap;
                isGlitch = false;
                tone = 'japanese';
              } else {
                nextChar = getCharForIndex(idx, 'glitch');
                isGlitch = true;
                tone = 'glitch';
              }
            }

            setCharStates((prev) => {
              const next = [...prev];
              if (next[idx]) next[idx] = { char: nextChar, isGlitch, tone };
              return next;
            });
          }, 30);

          intervalsRef.current.push(charInterval);
        }, idx * staggerDelay);

        timersRef.current.push(startTimer);
      }

      const totalDuration = maxCharEndTime;
      const endTimer = setTimeout(() => {
        if (cycleId !== cycleIdRef.current) return;
        resetChars();
      }, totalDuration);

      timersRef.current.push(endTimer);
    },
    [clearGlitchTimers, getCharForIndex, resetChars],
  );

  const runGlitchCycleRef = useRef(runGlitchCycle);
  runGlitchCycleRef.current = runGlitchCycle;

  useEffect(() => {
    if (typeof trigger === 'number' && trigger > 0) {
      runGlitchCycleRef.current();
    } else if (trigger === true) {
      runGlitchCycleRef.current();
    }
  }, [trigger]);

  useEffect(() => {
    setCharStates(english.split('').map((c) => ({ char: c, isGlitch: false, tone: 'english' as CharTone })));
  }, [english]);

  useEffect(() => {
    if (!autoGlitch) return;

    if (!isBlogReadingModeActive()) {
      runGlitchCycleRef.current();
    }

    const triggerInterval = setInterval(() => {
      if (isBlogReadingModeActive()) return;
      if (Math.random() > 0.85) {
        runGlitchCycleRef.current();
      }
    }, 6000);

    return () => {
      clearInterval(triggerInterval);
      cycleIdRef.current += 1;
      clearGlitchTimers();
    };
  }, [autoGlitch, english, japanese, clearGlitchTimers]);

  useEffect(() => () => {
    cycleIdRef.current += 1;
    clearGlitchTimers();
    setGlobalGlitch(false);
    setCharStates(english.split('').map((c) => ({ char: c, isGlitch: false, tone: 'english' as CharTone })));
  }, [clearGlitchTimers, english]);

  return (
    <span
      className={`inline-block font-sans select-none tracking-tighter ${className}`}
      onMouseEnter={() => {
        if (onHoverGlitch) runGlitchCycle();
      }}
      style={{
        textShadow: globalGlitch
          ? (glitchShadow ?? `${0.7 * getTextGlitchVisualScale()}px 0 #00eefc, -${0.7 * getTextGlitchVisualScale()}px 0 #ff5357, 0 0 ${0.5 * getTextGlitchVisualScale()}px rgba(255,179,175,0.35)`)
          : 'none',
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}
    >
      {charStates.map((state, index) => {
        const slotEm = state.char === ' ' ? spaceSlotEm : charSlotEm;
        const toneStyle =
          state.tone === 'japanese' ? getJapaneseToneStyle(index, cycleIdRef.current, japaneseTonePalette) : undefined;
        return (
        <span
          key={index}
          className={`inline-block ${charAlign === 'left' ? 'text-left' : 'text-center'} transition-[transform,color] duration-75 ${
            state.tone === 'japanese'
              ? japaneseToneClass
              : state.tone === 'glitch' || state.isGlitch
                ? isBlogReadingModeActive()
                  ? DEFAULT_GLITCH_TONE_READING
                  : glitchToneClass
                : ''
          }`}
          style={{ width: `${slotEm}em`, ...toneStyle }}
        >
          {state.char === ' ' ? '\u00A0' : state.char}
        </span>
        );
      })}
    </span>
  );
}

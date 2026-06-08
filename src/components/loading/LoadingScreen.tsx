import { useEffect, useLayoutEffect, useRef, useState, useCallback, type AnimationEvent } from 'react';
import { motion } from 'motion/react';
import {
  playCapacitorFillComplete,
  installAudioUnlockListeners,
  unlockAudioFromGesture,
} from '@/utils/audio';

interface LoadingScreenProps {
  onComplete: () => void;
  onFlashStart?: () => void;
}

type Phase = 'flow' | 'idle' | 'fill' | 'dissolve' | 'exit';

/** Official Ethereum diamond facets — ethereum.org eth-diamond-black.svg */
const ETH_FACETS = [
  {
    id: 'facet-center',
    d: 'm269.9 325.2-269.9 122.7 269.9 159.6 270-159.6z',
    fillOpacity: 0.55,
    origin: '270px 466px',
    dissolveDelay: 0.12,
    drift: { x: 0, y: -32, rotate: 4 },
  },
  {
    id: 'facet-left-top',
    d: 'm0.1 447.8 269.9 159.6v-607.4z',
    fillOpacity: 0.42,
    origin: '180px 318px',
    dissolveDelay: 0.22,
    drift: { x: -38, y: -24, rotate: -12 },
  },
  {
    id: 'facet-right-top',
    d: 'm270 0v607.4l269.9-159.6z',
    fillOpacity: 0.48,
    origin: '360px 318px',
    dissolveDelay: 0.18,
    drift: { x: 38, y: -24, rotate: 12 },
  },
  {
    id: 'facet-left-bot',
    d: 'm0 499 269.9 380.4v-220.9z',
    fillOpacity: 0.42,
    origin: '135px 692px',
    dissolveDelay: 0,
    drift: { x: -42, y: 28, rotate: -8 },
  },
  {
    id: 'facet-right-bot',
    d: 'm269.9 658.5v220.9l270.1-380.4z',
    fillOpacity: 0.48,
    origin: '405px 692px',
    dissolveDelay: 0.06,
    drift: { x: 42, y: 28, rotate: 8 },
  },
] as const;

const CIRCUIT_PATHS = [
  { id: 'outer-l-top', d: 'M270 0 L0.1 447.8', delay: 0 },
  { id: 'outer-l-bot', d: 'M0 499 L269.9 879.4', delay: 0.15 },
  { id: 'outer-r-top', d: 'M270 0 L539.9 447.8', delay: 0.3 },
  { id: 'outer-r-bot', d: 'M540 499 L269.9 879.4', delay: 0.45 },
  { id: 'spine-upper', d: 'M270 0 L270 607.4', delay: 0.6 },
  { id: 'fac-l-up', d: 'M0.1 447.8 L270 607.4', delay: 0.75 },
  { id: 'fac-r-up', d: 'M539.9 447.8 L270 607.4', delay: 0.9 },
  { id: 'band-top-l', d: 'M0.1 447.8 L269.9 325.2', delay: 1.05 },
  { id: 'band-top-r', d: 'M269.9 325.2 L539.9 447.8', delay: 1.2 },
  { id: 'band-bot-l', d: 'M0.1 447.8 L269.9 607.4', delay: 1.35 },
  { id: 'band-bot-r', d: 'M269.9 607.4 L539.9 447.8', delay: 1.5 },
  { id: 'fac-l-lo', d: 'M0 499 L269.9 658.5', delay: 1.65 },
  { id: 'fac-r-lo', d: 'M540 499 L269.9 658.5', delay: 1.8 },
  { id: 'spine-lower', d: 'M269.9 658.5 L269.9 879.4', delay: 1.95 },
] as const;

const JUNCTION_NODES = [
  { cx: 270, cy: 0 },
  { cx: 0.1, cy: 447.8 },
  { cx: 539.9, cy: 447.8 },
  { cx: 270, cy: 607.4 },
  { cx: 269.9, cy: 325.2 },
  { cx: 0, cy: 499 },
  { cx: 540, cy: 499 },
  { cx: 269.9, cy: 658.5 },
  { cx: 269.9, cy: 879.4 },
] as const;

const FLOW_DURATION = 0.5;
const LAST_PATH_DELAY = CIRCUIT_PATHS[CIRCUIT_PATHS.length - 1].delay;
const LOGO_ANIM_MS = (LAST_PATH_DELAY + FLOW_DURATION) * 1000;
const LAST_PATH_ID = CIRCUIT_PATHS[CIRCUIT_PATHS.length - 1].id;

const FILL_MS = Math.round(1050 * 1.35);
const DISSOLVE_MS = 1150;

const ETH_LOGO_WIDTH = 83;
const ETH_LOGO_HEIGHT = 135;
/** Shift up so the bottom-heavy diamond reads visually centered */
const ETH_LOGO_VISUAL_OFFSET_Y = -11;

const MotionPath = motion.path;
const MotionRect = motion.rect;

const FLOW_END_GLOW =
  'drop-shadow(0 0 6px rgba(255,83,87,0.25))';
/** Let paths lock and junction nodes fade in before idle pulse begins */
const IDLE_HANDOFF_MS = 350;

function EthereumLogo({
  pathLengths,
  phase,
  flowDrawingDone,
  setPathRef,
  onPathAnimEnd,
}: {
  pathLengths: Record<string, number>;
  phase: Phase;
  flowDrawingDone: boolean;
  setPathRef: (id: string) => (el: SVGPathElement | null) => void;
  onPathAnimEnd: (id: string, e: AnimationEvent<SVGPathElement>) => void;
}) {
  const isFlow = phase === 'flow';
  const showLines = phase !== 'exit';
  const showFill = phase === 'fill' || phase === 'dissolve';
  const isDissolving = phase === 'dissolve' || phase === 'exit';
  const isIdle = phase === 'idle';
  const pathLocked = flowDrawingDone || !isFlow;

  return (
    <svg
      viewBox="0 0 540 879.4"
      width={ETH_LOGO_WIDTH}
      height={ETH_LOGO_HEIGHT}
      className="circuit-eth-svg"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="circuitNeonGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="bloodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff8a8d" />
          <stop offset="50%" stopColor="#ff5357" />
          <stop offset="100%" stopColor="#b8000f" />
        </linearGradient>
        <linearGradient id="ethFillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffb3af" />
          <stop offset="45%" stopColor="#ff5357" />
          <stop offset="100%" stopColor="#8a0010" />
        </linearGradient>
        <clipPath id="ethFillClip">
          <MotionRect
            x="0"
            width="540"
            initial={false}
            animate={
              phase === 'fill' || phase === 'dissolve'
                ? { y: 0, height: 879.4 }
                : { y: 879.4, height: 0 }
            }
            transition={{ duration: FILL_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
          />
        </clipPath>
      </defs>

      <motion.g
        animate={{ opacity: isDissolving ? 0 : 0.85 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        fill="none"
        stroke="#3d0808"
        strokeWidth="1.2"
        strokeLinejoin="round"
      >
        {ETH_FACETS.map(({ id, d }) => (
          <path key={`facet-base-${id}`} d={d} />
        ))}
      </motion.g>

      {showFill && !isDissolving && (
        <g clipPath="url(#ethFillClip)">
          {ETH_FACETS.map(({ id, d, fillOpacity }) => (
            <MotionPath
              key={`facet-fill-${id}`}
              d={d}
              fill="url(#ethFillGradient)"
              stroke="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: fillOpacity }}
              transition={{ duration: FILL_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </g>
      )}

      {isDissolving &&
        ETH_FACETS.map(({ id, d, fillOpacity, origin, dissolveDelay, drift }) => (
          <MotionPath
            key={`facet-dissolve-${id}`}
            d={d}
            fill="url(#ethFillGradient)"
            stroke="#ff5357"
            strokeWidth="0.6"
            strokeOpacity={0.35}
            style={{ transformOrigin: origin, transformBox: 'fill-box' as const }}
            initial={{ opacity: fillOpacity, scale: 1, x: 0, y: 0, rotate: 0 }}
            animate={{
              opacity: 0,
              scale: 0.5,
              x: drift.x,
              y: drift.y,
              rotate: drift.rotate,
            }}
            transition={{
              duration: 0.9,
              delay: dissolveDelay,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        ))}

      {showLines && (
        <motion.g
          filter="url(#circuitNeonGlow)"
          initial={false}
          animate={{ opacity: isDissolving ? 0 : isIdle ? [1, 1.06, 1] : 1 }}
          transition={
            isIdle
              ? { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.5, ease: 'easeOut' }
          }
        >
          {CIRCUIT_PATHS.map(({ id, d, delay }) => {
            const len = pathLengths[id] ?? 800;
            return (
              <path
                key={`flow-${id}`}
                ref={setPathRef(id)}
                d={d}
                stroke="url(#bloodGradient)"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="circuit-flow-path"
                onAnimationEnd={(e) => onPathAnimEnd(id, e)}
                style={{
                  ['--path-len' as string]: len,
                  strokeDasharray: len,
                  strokeDashoffset: pathLocked ? 0 : len,
                  animation:
                    isFlow && !flowDrawingDone
                      ? `circuitFlowDraw ${FLOW_DURATION}s ease-out ${delay}s forwards`
                      : 'none',
                  opacity: 1,
                }}
              />
            );
          })}
        </motion.g>
      )}

      {showLines && (
        <motion.g
          initial={false}
          animate={{
            opacity: isDissolving ? 0 : !flowDrawingDone ? 0 : isIdle ? [1, 1.12, 1] : 1,
          }}
          transition={
            isIdle
              ? { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.35, ease: 'easeOut' }
          }
        >
          {JUNCTION_NODES.map(({ cx, cy }, i) => (
            <circle
              key={`node-${i}`}
              cx={cx}
              cy={cy}
              r={3.2}
              fill="#ff5357"
              stroke="#ffb3af"
              strokeWidth="0.8"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(255,83,87,0.75))',
              }}
            />
          ))}
        </motion.g>
      )}
    </svg>
  );
}

export default function LoadingScreen({ onComplete, onFlashStart }: LoadingScreenProps) {
  const pathRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const [pathLengths, setPathLengths] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>('flow');
  const [flowDrawingDone, setFlowDrawingDone] = useState(false);
  const finished = useRef(false);
  const flowDone = useRef(false);
  const transitionStarted = useRef(false);

  useEffect(() => installAudioUnlockListeners(), []);

  useLayoutEffect(() => {
    const lengths: Record<string, number> = {};
    pathRefs.current.forEach((el, id) => {
      lengths[id] = el.getTotalLength();
    });
    if (Object.keys(lengths).length > 0) setPathLengths(lengths);
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onComplete();
  }, [onComplete]);

  const enterHome = useCallback(async () => {
    if (transitionStarted.current || finished.current || phase !== 'idle') return;
    transitionStarted.current = true;

    await unlockAudioFromGesture();
    setPhase('fill');

    setTimeout(() => {
      setPhase('dissolve');
      onFlashStart?.();
      playCapacitorFillComplete({ startAmbientAfter: true });
    }, FILL_MS);

    setTimeout(() => {
      setPhase('exit');
      finish();
    }, FILL_MS + DISSOLVE_MS);
  }, [phase, onFlashStart, finish]);

  const onFlowComplete = useCallback(() => {
    if (flowDone.current) return;
    flowDone.current = true;
    setFlowDrawingDone(true);
    window.setTimeout(() => setPhase('idle'), IDLE_HANDOFF_MS);
  }, []);

  useEffect(() => {
    const fallback = setTimeout(onFlowComplete, LOGO_ANIM_MS + 120);
    return () => clearTimeout(fallback);
  }, [onFlowComplete]);

  useEffect(() => {
    if (phase !== 'idle') return;

    const onPointer = () => {
      void enterHome();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      void enterHome();
    };

    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [phase, enterHome]);

  const handlePathAnimEnd = useCallback(
    (id: string, e: AnimationEvent<SVGPathElement>) => {
      if (id !== LAST_PATH_ID || e.animationName !== 'circuitFlowDraw') return;
      onFlowComplete();
    },
    [onFlowComplete],
  );

  const setPathRef = useCallback((id: string) => (el: SVGPathElement | null) => {
    if (el) pathRefs.current.set(id, el);
    else pathRefs.current.delete(id);
  }, []);

  const isDissolving = phase === 'dissolve' || phase === 'exit';
  const isIdle = phase === 'idle';

  return (
    <div className="fixed inset-0 z-[200] pointer-events-auto">
      <motion.div
        className="circuit-loader absolute inset-0 flex items-center justify-center overflow-hidden bg-[#050505] cursor-default"
        animate={{ opacity: isDissolving ? 0 : 1 }}
        transition={{ duration: DISSOLVE_MS / 1000, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="circuit-loader-noise absolute inset-0 pointer-events-none" />
        <div className="circuit-loader-scanlines absolute inset-0 pointer-events-none" />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.35,
            background:
              'radial-gradient(ellipse at 50% 42%, transparent 20%, rgba(0,0,0,0.55) 70%, rgba(20,0,0,0.9) 100%)',
          }}
        />

        <motion.div
          className="relative z-[5] flex flex-col items-center"
          style={{ marginTop: ETH_LOGO_VISUAL_OFFSET_Y }}
          initial={false}
          animate={{
            scale: isIdle
              ? [1, 1.014, 1]
              : isDissolving
                ? 1.02
                : phase === 'fill'
                  ? 1.03
                  : 1,
            filter: isIdle
              ? [
                  FLOW_END_GLOW,
                  'drop-shadow(0 0 18px rgba(255,83,87,0.55))',
                  FLOW_END_GLOW,
                ]
              : isDissolving
                ? 'drop-shadow(0 0 20px rgba(255,83,87,0.35))'
                : phase === 'fill'
                  ? 'drop-shadow(0 0 22px rgba(255,83,87,0.85)) drop-shadow(0 0 44px rgba(255,83,87,0.4))'
                  : FLOW_END_GLOW,
          }}
          transition={
            isIdle
              ? { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
          }
        >
          <EthereumLogo
            pathLengths={pathLengths}
            phase={phase}
            flowDrawingDone={flowDrawingDone}
            setPathRef={setPathRef}
            onPathAnimEnd={handlePathAnimEnd}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

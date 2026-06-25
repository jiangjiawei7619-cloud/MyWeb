import { useEffect, useRef, useState } from 'react';
import RollingNumber from '@/components/leetcode/RollingNumber';
import GlitchTitle from '@/components/ui/GlitchTitle';

type TotalContributionsProps = {
  total: number;
  sourceLabel: string;
};

const TOTAL_ROLLING_UNLOCK_MS = 2600;
const TOTAL_GLITCH_VISIBLE_MS = 430;

const DIGIT_GLITCH_ALTERNATES: Record<string, string> = {
  '0': '\u96f6',
  '1': '\u58f1',
  '2': '\u5f10',
  '3': '\u53c2',
  '4': '\u8086',
  '5': '\u4f0d',
  '6': '\u9678',
  '7': '\u6f06',
  '8': '\u634c',
  '9': '\u7396',
};

export default function TotalContributions({ total, sourceLabel }: TotalContributionsProps) {
  const [totalHoverTrigger, setTotalHoverTrigger] = useState(0);
  const [totalGlitchActive, setTotalGlitchActive] = useState(false);
  const [totalGlitchReady, setTotalGlitchReady] = useState(false);
  const totalGlitchTimerRef = useRef<number | null>(null);
  const totalReadyTimerRef = useRef<number | null>(null);
  const totalLabel = String(total);
  const totalGlitchLabel = totalLabel.replace(/\d/g, (digit) => DIGIT_GLITCH_ALTERNATES[digit] ?? digit);

  const triggerTotalGlitch = () => {
    if (!totalGlitchReady) return;

    if (totalGlitchTimerRef.current) {
      window.clearTimeout(totalGlitchTimerRef.current);
    }

    setTotalGlitchActive(true);
    setTotalHoverTrigger((trigger) => trigger + 1);
    totalGlitchTimerRef.current = window.setTimeout(() => {
      setTotalGlitchActive(false);
    }, TOTAL_GLITCH_VISIBLE_MS);
  };

  useEffect(() => {
    setTotalGlitchReady(false);
    setTotalGlitchActive(false);

    if (totalGlitchTimerRef.current) {
      window.clearTimeout(totalGlitchTimerRef.current);
    }

    if (totalReadyTimerRef.current) {
      window.clearTimeout(totalReadyTimerRef.current);
    }

    totalReadyTimerRef.current = window.setTimeout(() => {
      setTotalGlitchReady(true);
    }, TOTAL_ROLLING_UNLOCK_MS);

    return () => {
      if (totalReadyTimerRef.current) {
        window.clearTimeout(totalReadyTimerRef.current);
      }
    };
  }, [total]);

  useEffect(
    () => () => {
      if (totalGlitchTimerRef.current) {
        window.clearTimeout(totalGlitchTimerRef.current);
      }
      if (totalReadyTimerRef.current) {
        window.clearTimeout(totalReadyTimerRef.current);
      }
    },
    [],
  );

  return (
    <section className="github-total-contributions" aria-label="GitHub total contributions">
      <span className="github-total-contributions__label">TOTAL CONTRIBUTIONS</span>
      <strong
        className={`github-total-contributions__value ${totalGlitchReady ? 'is-glitch-ready' : ''} ${totalGlitchActive ? 'is-glitching' : ''}`}
        tabIndex={0}
        onFocus={triggerTotalGlitch}
        onPointerEnter={triggerTotalGlitch}
      >
        <span className="github-total-contributions__layer github-total-contributions__layer--rolling">
          <RollingNumber value={total} delay={0.08} loops={1} />
        </span>
        <span className="github-total-contributions__layer github-total-contributions__layer--glitch" aria-hidden>
          <GlitchTitle
            english={totalLabel}
            japanese={totalGlitchLabel}
            autoGlitch={false}
            onHoverGlitch={false}
            trigger={totalHoverTrigger}
            japaneseToneClass="text-[#b8adff]/90 scale-y-[1.01]"
            japaneseTonePalette="blue-violet"
            glitchToneClass="text-[#7c6dff] scale-y-[1.06] skew-x-2"
            glitchShadow="0.65px 0 #23d7ff, -0.65px 0 #7c6dff, 0 0 0.5px rgba(124,109,255,0.4)"
            charSlotEm={0.88}
            className="github-total-contributions__glitch"
          />
        </span>
      </strong>
      <span className="github-total-contributions__subcopy">{sourceLabel}</span>
    </section>
  );
}

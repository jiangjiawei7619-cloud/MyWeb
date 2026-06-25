import { useEffect, useRef, useState } from 'react';
import DifficultySplit from '@/components/leetcode/DifficultySplit';
import RollingNumber from '@/components/leetcode/RollingNumber';
import GlitchTitle from '@/components/ui/GlitchTitle';
import type { LeetCodeDifficultyStats } from '@/data/leetcode';

type LeetCodeStatsPanelProps = {
  totalSolved: number;
  difficulty: LeetCodeDifficultyStats;
};

const TOTAL_ROLLING_UNLOCK_MS = 2600;
const TOTAL_GLITCH_VISIBLE_MS = 430;

const DIGIT_GLITCH_ALTERNATES: Record<string, string> = {
  '0': '零',
  '1': '壱',
  '2': '弐',
  '3': '参',
  '4': '肆',
  '5': '伍',
  '6': '陸',
  '7': '漆',
  '8': '捌',
  '9': '玖',
};

export default function LeetCodeStatsPanel({ totalSolved, difficulty }: LeetCodeStatsPanelProps) {
  const [totalHoverTrigger, setTotalHoverTrigger] = useState(0);
  const [totalGlitchActive, setTotalGlitchActive] = useState(false);
  const [totalGlitchReady, setTotalGlitchReady] = useState(false);
  const totalGlitchTimerRef = useRef<number | null>(null);
  const totalReadyTimerRef = useRef<number | null>(null);
  const totalSolvedLabel = String(totalSolved);
  const totalSolvedGlitchLabel = totalSolvedLabel.replace(/\d/g, (digit) => DIGIT_GLITCH_ALTERNATES[digit] ?? digit);

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
  }, [totalSolved]);

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
    <section className="leetcode-stats-panel" aria-label="LeetCode summary stats">
      <div className="leetcode-total-solved">
        <span className="leetcode-total-solved__label">TOTAL SOLVED</span>
        <strong
          className={`leetcode-total-solved__value ${totalGlitchReady ? 'is-glitch-ready' : ''} ${totalGlitchActive ? 'is-glitching' : ''}`}
          tabIndex={0}
          onFocus={triggerTotalGlitch}
          onPointerEnter={triggerTotalGlitch}
        >
          <span className="leetcode-total-solved__layer leetcode-total-solved__layer--rolling">
            <RollingNumber value={totalSolved} />
          </span>
          <span className="leetcode-total-solved__layer leetcode-total-solved__layer--glitch" aria-hidden>
            <GlitchTitle
              english={totalSolvedLabel}
              japanese={totalSolvedGlitchLabel}
              autoGlitch={false}
              onHoverGlitch={false}
              trigger={totalHoverTrigger}
              charSlotEm={1}
              className="leetcode-total-solved__glitch"
            />
          </span>
        </strong>
      </div>

      <DifficultySplit difficulty={difficulty} />
    </section>
  );
}

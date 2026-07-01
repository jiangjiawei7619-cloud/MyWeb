import type { CSSProperties } from 'react';
import RollingNumber from '@/components/leetcode/RollingNumber';
import type { LeetCodeDifficultyStats } from '@/data/leetcode';

type DifficultySplitProps = {
  difficulty: LeetCodeDifficultyStats;
};

const SEGMENTS = [
  { key: 'easy', label: 'EASY' },
  { key: 'medium', label: 'MEDIUM' },
  { key: 'hard', label: 'HARD' },
] as const;

export default function DifficultySplit({ difficulty }: DifficultySplitProps) {
  const total = difficulty.easy + difficulty.medium + difficulty.hard;

  return (
    <section className="leetcode-difficulty" aria-label="LeetCode difficulty distribution">
      <div className="leetcode-module-label">
        <span>DIFFICULTY SPLIT</span>
        <span>
          <RollingNumber value={total} className="leetcode-inline-rolling-number" loops={1} /> accepted
        </span>
      </div>

      <div className="leetcode-difficulty__bar" role="img" aria-label="Easy, medium and hard solved distribution">
        {SEGMENTS.map((segment, index) => {
          const count = difficulty[segment.key];
          const percent = total > 0 ? (count / total) * 100 : 0;

          return (
            <span
              key={segment.key}
              className={`leetcode-difficulty__segment leetcode-difficulty__segment--${segment.key}`}
              style={
                {
                  width: `${percent}%`,
                  '--difficulty-segment-delay': `${0.16 + index * 0.18}s`,
                } as CSSProperties
              }
              title={`${segment.label}: ${count} (${percent.toFixed(1)}%)`}
            >
              <span className="leetcode-difficulty__segment-fill" aria-hidden />
            </span>
          );
        })}
      </div>

      <div className="leetcode-difficulty__legend">
        {SEGMENTS.map((segment, index) => {
          const count = difficulty[segment.key];
          const percent = total > 0 ? (count / total) * 100 : 0;

          return (
            <span
              key={segment.key}
              className={`leetcode-difficulty__stat leetcode-difficulty__stat--${segment.key}`}
              style={{ '--difficulty-stat-delay': `${0.62 + index * 0.12}s` } as CSSProperties}
            >
              <span>{segment.label}</span>
              <strong>
                <RollingNumber value={count} loops={1} />
              </strong>
              <em>{percent.toFixed(0)}%</em>
            </span>
          );
        })}
      </div>
    </section>
  );
}

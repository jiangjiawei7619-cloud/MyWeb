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
          <RollingNumber value={total} className="leetcode-inline-rolling-number" delay={0.16} loops={1} /> accepted
        </span>
      </div>

      <div className="leetcode-difficulty__bar" role="img" aria-label="Easy, medium and hard solved distribution">
        {SEGMENTS.map((segment) => {
          const count = difficulty[segment.key];
          const percent = total > 0 ? (count / total) * 100 : 0;

          return (
            <span
              key={segment.key}
              className={`leetcode-difficulty__segment leetcode-difficulty__segment--${segment.key}`}
              style={{ width: `${percent}%` } as CSSProperties}
              title={`${segment.label}: ${count} (${percent.toFixed(1)}%)`}
            >
              <span className="leetcode-difficulty__segment-fill" aria-hidden />
            </span>
          );
        })}
      </div>

      <div className="leetcode-difficulty__legend">
        {SEGMENTS.map((segment) => {
          const count = difficulty[segment.key];
          const percent = total > 0 ? (count / total) * 100 : 0;

          return (
            <span key={segment.key} className={`leetcode-difficulty__stat leetcode-difficulty__stat--${segment.key}`}>
              <span>{segment.label}</span>
              <strong>
                <RollingNumber value={count} delay={0.22} loops={1} />
              </strong>
              <em>{percent.toFixed(0)}%</em>
            </span>
          );
        })}
      </div>
    </section>
  );
}

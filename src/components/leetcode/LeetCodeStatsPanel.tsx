import DifficultySplit from '@/components/leetcode/DifficultySplit';
import RollingNumber from '@/components/leetcode/RollingNumber';
import type { LeetCodeDifficultyStats } from '@/data/leetcode';

type LeetCodeStatsPanelProps = {
  totalSolved: number;
  difficulty: LeetCodeDifficultyStats;
};

export default function LeetCodeStatsPanel({ totalSolved, difficulty }: LeetCodeStatsPanelProps) {
  return (
    <section className="leetcode-stats-panel" aria-label="LeetCode summary stats">
      <div className="leetcode-total-solved">
        <span className="leetcode-total-solved__label">TOTAL SOLVED</span>
        <strong className="leetcode-total-solved__value">
          <RollingNumber value={totalSolved} />
        </strong>
        <span className="leetcode-total-solved__subcopy">ACCEPTED PROBLEMS / ALL TIME</span>
      </div>

      <DifficultySplit difficulty={difficulty} />
    </section>
  );
}

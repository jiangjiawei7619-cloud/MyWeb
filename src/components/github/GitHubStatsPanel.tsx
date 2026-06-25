import CommitPulseLine from '@/components/github/CommitPulseLine';
import CommitStreakStrip from '@/components/github/CommitStreakStrip';
import TotalContributions from '@/components/github/TotalContributions';
import type { GitHubStats } from '@/data/github';

type GitHubStatsPanelProps = {
  stats: GitHubStats;
};

export default function GitHubStatsPanel({ stats }: GitHubStatsPanelProps) {
  const sourceLabel = stats.source === 'mock' ? 'PUBLIC ACTIVITY / MOCK RANGE' : 'PUBLIC ACTIVITY / LIVE RANGE';

  return (
    <section className="github-stats-panel" aria-label="GitHub signal stats">
      <TotalContributions total={stats.totalContributions} sourceLabel={sourceLabel} />
      <CommitPulseLine pulse={stats.commitPulse} />
      <CommitStreakStrip streak={stats.commitStreak} />
    </section>
  );
}

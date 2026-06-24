import BlogHudPanel from '@/components/blogs/BlogHudPanel';
import { CyberHeatmapGrid } from '@/components/blogs/CyberHeatmap';
import LeetCodeStatsPanel from '@/components/leetcode/LeetCodeStatsPanel';
import RecentSubmissions from '@/components/leetcode/RecentSubmissions';
import TopicTagBars from '@/components/leetcode/TopicTagBars';
import type { LeetCodeStats } from '@/data/leetcode';

type LeetCodePanelProps = {
  stats: LeetCodeStats;
  loading?: boolean;
  error?: string;
};

function LeetCodeLoadingProtocol() {
  return (
    <div className="leetcode-loading-protocol" aria-live="polite">
      <span>&gt; SYNCING LEETCODE PROTOCOL</span>
      <i />
      <i />
      <i />
    </div>
  );
}

export default function LeetCodePanel({ stats, loading = false, error }: LeetCodePanelProps) {
  const fallbackActive = Boolean(error || stats.error || stats.source === 'mock');

  return (
    <div className="cyber-heatmap cyber-heatmap--leetcode" data-variant="leetcode">
      <BlogHudPanel
        variant="red"
        className="leetcode-panel"
        header={
          <div className="leetcode-panel__header">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-white/90" aria-hidden>
                  code_blocks
                </span>
                <h3 className="m-0 font-mono text-[13px] font-bold uppercase text-[#9cf8ff]">
                  LEETCODE ACTIVITY MATRIX
                </h3>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase text-white/42">
                custom calendar feed / coding stats interface
              </p>
            </div>

            <div className="leetcode-panel__header-meta">
              <span className={`leetcode-source-badge ${fallbackActive ? 'is-fallback' : 'is-live'}`}>
                {fallbackActive ? 'MOCK PROTOCOL FALLBACK' : 'LIVE GRAPHQL'}
              </span>
              <span className="leetcode-username">@{stats.username}</span>
            </div>
          </div>
        }
      >
        {loading ? (
          <LeetCodeLoadingProtocol />
        ) : (
          <>
            {fallbackActive && (
              <div className="leetcode-fallback-line" role={error || stats.error ? 'alert' : 'status'}>
                &gt; {error ?? stats.error ?? 'MOCK PROTOCOL FALLBACK ACTIVE'} // page remains online
              </div>
            )}

            <div className="leetcode-panel__main-grid">
              <section className="leetcode-panel__heatmap" aria-label="LeetCode calendar heatmap">
                <CyberHeatmapGrid data={stats.calendar} variant="leetcode" />
              </section>

              <LeetCodeStatsPanel totalSolved={stats.totalSolved} difficulty={stats.difficulty} />
            </div>

            <div className="leetcode-panel__bottom-grid">
              <RecentSubmissions submissions={stats.recentSubmissions} />
              <TopicTagBars tags={stats.topicTags} />
            </div>
          </>
        )}
      </BlogHudPanel>
    </div>
  );
}

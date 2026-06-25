import BlogHudPanel from '@/components/blogs/BlogHudPanel';
import { CyberHeatmapGrid } from '@/components/blogs/CyberHeatmap';
import GitHubStatsPanel from '@/components/github/GitHubStatsPanel';
import LatestActivityFeed from '@/components/github/LatestActivityFeed';
import TechStackRing from '@/components/github/TechStackRing';
import type { GitHubStats } from '@/data/github';

type GitHubPanelProps = {
  stats: GitHubStats;
  entryKey?: number | string;
  loading?: boolean;
  error?: string;
};

function GitHubLoadingProtocol() {
  return (
    <div className="github-loading-protocol" aria-live="polite">
      <span>&gt; SYNCING GITHUB SIGNAL BUS</span>
      <i />
      <i />
      <i />
    </div>
  );
}

export default function GitHubPanel({ stats, entryKey, loading = false, error }: GitHubPanelProps) {
  const fallbackActive = Boolean(error || stats.error || stats.source === 'mock');

  return (
    <div className="cyber-heatmap cyber-heatmap--github" data-variant="github">
      <BlogHudPanel
        variant="cyan"
        className="github-panel"
        entryAnimation
        entryKey={entryKey}
        header={
          <div className="github-panel__header">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-white/90" aria-hidden>
                  hub
                </span>
                <h3 className="m-0 font-mono text-[13px] font-bold uppercase text-[#9cf8ff]">
                  / GITHUB MATRIX
                </h3>
              </div>
            </div>

            <div className="github-panel__header-meta">
              <span className={`github-source-badge ${fallbackActive ? 'is-fallback' : 'is-live'}`}>
                {fallbackActive ? 'MOCK PROTOCOL FALLBACK' : 'LIVE API SIGNAL'}
              </span>
            </div>
          </div>
        }
      >
        {loading ? (
          <GitHubLoadingProtocol />
        ) : (
          <>
            {(error || stats.error) && (
              <div className="github-fallback-line">&gt; API SIGNAL DROPPED / USING LOCAL MOCK FALLBACK</div>
            )}

            <div className="github-panel__main-grid">
              <section className="github-panel__heatmap" aria-label="GitHub contribution calendar heatmap">
                <CyberHeatmapGrid data={stats.contributionCalendar} variant="github" />
              </section>

              <GitHubStatsPanel stats={stats} />
            </div>

            <div className="github-panel__bottom-grid">
              <LatestActivityFeed activities={stats.latestActivity} />
              <TechStackRing languages={stats.languages} techStack={stats.techStack} />
            </div>
          </>
        )}
      </BlogHudPanel>
    </div>
  );
}

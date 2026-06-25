import { useEffect, useState, type CSSProperties } from 'react';
import type { GitHubActivity, GitHubActivityType } from '@/data/github';

type LatestActivityFeedProps = {
  activities: GitHubActivity[];
};

const ACTIVITY_META: Record<GitHubActivityType, { code: string; tone: string }> = {
  PushEvent: { code: 'PUSH', tone: 'push' },
  PullRequestEvent: { code: 'PR', tone: 'pr' },
  IssuesEvent: { code: 'ISSUE', tone: 'issue' },
  WatchEvent: { code: 'STAR', tone: 'watch' },
  ForkEvent: { code: 'FORK', tone: 'fork' },
  ReleaseEvent: { code: 'REL', tone: 'release' },
};

const ACTIVITY_ENTER_FLASH_MS = 2740;
const ACTIVITY_ENTER_DELAY_MAX_MS = 1260;

function formatTimeAgo(createdAt: string): string {
  if (createdAt.toLowerCase().includes('ago')) return createdAt;

  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return createdAt;

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86_400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  return `${Math.floor(elapsedSeconds / 86_400)}d ago`;
}

function activityMeta(type: GitHubActivity['type']) {
  return ACTIVITY_META[type] ?? { code: type.replace('Event', '').slice(0, 5).toUpperCase(), tone: 'unknown' };
}

function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function tokenStyle(seed: string): CSSProperties {
  return {
    '--activity-token-enter-delay': `${Math.round(80 + seededUnit(seed) * 1180)}ms`,
  } as CSSProperties;
}

export default function LatestActivityFeed({ activities }: LatestActivityFeedProps) {
  const [entryComplete, setEntryComplete] = useState(false);

  useEffect(() => {
    setEntryComplete(false);
    const entryTimer = window.setTimeout(
      () => setEntryComplete(true),
      ACTIVITY_ENTER_DELAY_MAX_MS + ACTIVITY_ENTER_FLASH_MS + 120,
    );

    return () => window.clearTimeout(entryTimer);
  }, [activities]);

  return (
    <section className="github-activity-panel" aria-label="Latest GitHub activity">
      <div className="github-module-label">
        <span>LATEST ACTIVITY</span>
        <span>{activities.length ? `${activities.length} events` : 'empty feed'}</span>
      </div>

      <div className={`github-activity-feed ${entryComplete ? 'github-activity-feed--entry-complete' : ''}`}>
        {activities.length === 0 && (
          <div className="github-empty-line">&gt; NO RECENT SIGNAL</div>
        )}

        {activities.map((activity) => {
          const meta = activityMeta(activity.type);
          const sideSignal = activity.branch ?? (activity.commitCount ? `${activity.commitCount} commits` : '');
          const rowSeed = `${activity.type}:${activity.repo}:${activity.createdAt}`;
          const content = (
            <>
              <span
                className={`github-activity-feed__token github-activity-feed__type is-${meta.tone}`}
                style={tokenStyle(`${rowSeed}:type`)}
              >
                <span className="github-activity-feed__token-text">{meta.code}</span>
              </span>
              <span
                className="github-activity-feed__token github-activity-feed__repo"
                style={tokenStyle(`${rowSeed}:repo`)}
              >
                <span className="github-activity-feed__token-text">{activity.repo}</span>
              </span>
              <span
                className="github-activity-feed__token github-activity-feed__message"
                style={tokenStyle(`${rowSeed}:message`)}
              >
                <span className="github-activity-feed__token-text">{activity.message}</span>
              </span>
              <span
                className="github-activity-feed__token github-activity-feed__meta"
                style={tokenStyle(`${rowSeed}:meta`)}
              >
                <span className="github-activity-feed__token-text">{sideSignal}</span>
              </span>
              <time
                className="github-activity-feed__token github-activity-feed__time"
                style={tokenStyle(`${rowSeed}:time`)}
              >
                <span className="github-activity-feed__token-text">{formatTimeAgo(activity.createdAt)}</span>
              </time>
            </>
          );

          if (activity.url) {
            return (
              <a
                key={`${activity.type}-${activity.repo}-${activity.createdAt}`}
                className="github-activity-feed__row"
                href={activity.url}
                target="_blank"
                rel="noreferrer"
                title={`${meta.code} / ${activity.repo} / ${activity.message}`}
              >
                {content}
              </a>
            );
          }

          return (
            <div
              key={`${activity.type}-${activity.repo}-${activity.createdAt}`}
              className="github-activity-feed__row"
              title={`${meta.code} / ${activity.repo} / ${activity.message}`}
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

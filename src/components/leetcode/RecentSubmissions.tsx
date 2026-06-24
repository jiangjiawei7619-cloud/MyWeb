import { useEffect, useState, type CSSProperties } from 'react';
import type { LeetCodeRecentSubmission } from '@/data/leetcode';

type RecentSubmissionsProps = {
  submissions: LeetCodeRecentSubmission[];
};

const SUBMISSION_ENTER_FLASH_MS = 2740;
const SUBMISSION_ENTER_DELAY_MAX_MS = 1260;

function statusCode(statusDisplay: string): string {
  const status = statusDisplay.trim().toLowerCase();

  if (status === 'ac' || status.includes('accepted')) return 'AC';
  if (status === 'wa' || status.includes('wrong')) return 'WA';
  if (status === 'tle' || status.includes('time limit')) return 'TLE';
  if (status === 're' || status.includes('runtime')) return 'RE';
  if (status === 'mle' || status.includes('memory')) return 'MLE';

  return statusDisplay.slice(0, 3).toUpperCase();
}

function isAccepted(statusDisplay: string): boolean {
  return statusCode(statusDisplay) === 'AC';
}

function formatTimestamp(timestamp: LeetCodeRecentSubmission['timestamp']): string {
  if (typeof timestamp === 'string' && Number.isNaN(Number(timestamp))) {
    return timestamp;
  }

  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp)) return String(timestamp);

  const milliseconds = numericTimestamp < 10_000_000_000 ? numericTimestamp * 1000 : numericTimestamp;
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - milliseconds) / 1000));

  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86_400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  return `${Math.floor(elapsedSeconds / 86_400)}d ago`;
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
    '--submission-token-enter-delay': `${Math.round(80 + seededUnit(seed) * 1180)}ms`,
  } as CSSProperties;
}

export default function RecentSubmissions({ submissions }: RecentSubmissionsProps) {
  const [entryComplete, setEntryComplete] = useState(false);

  useEffect(() => {
    setEntryComplete(false);
    const entryTimer = window.setTimeout(
      () => setEntryComplete(true),
      SUBMISSION_ENTER_DELAY_MAX_MS + SUBMISSION_ENTER_FLASH_MS + 120,
    );

    return () => window.clearTimeout(entryTimer);
  }, [submissions]);

  return (
    <section className="leetcode-terminal-panel" aria-label="Recent LeetCode submissions">
      <div className="leetcode-module-label">
        <span>RECENT SUBMISSIONS</span>
        <span>{submissions.length ? `${submissions.length} packets` : 'empty feed'}</span>
      </div>

      <div className={`leetcode-submission-feed ${entryComplete ? 'leetcode-submission-feed--entry-complete' : ''}`}>
        {submissions.length === 0 && (
          <div className="leetcode-empty-line">&gt; NO RECENT SUBMISSIONS</div>
        )}

        {submissions.map((submission) => {
          const code = statusCode(submission.statusDisplay);
          const accepted = isAccepted(submission.statusDisplay);
          const rowSeed = `${submission.titleSlug ?? submission.title}:${submission.timestamp}`;
          const content = (
            <>
              <span
                className={`leetcode-submission-feed__token leetcode-submission-feed__status ${accepted ? 'is-ac' : 'is-miss'}`}
                style={tokenStyle(`${rowSeed}:status`)}
              >
                <span className="leetcode-submission-feed__token-text">{code}</span>
              </span>
              <span
                className="leetcode-submission-feed__token leetcode-submission-feed__title"
                style={tokenStyle(`${rowSeed}:title`)}
              >
                <span className="leetcode-submission-feed__token-text">{submission.title}</span>
              </span>
              {submission.difficulty && (
                <span
                  className={`leetcode-submission-feed__token leetcode-submission-feed__difficulty is-${submission.difficulty.toLowerCase()}`}
                  style={tokenStyle(`${rowSeed}:difficulty`)}
                >
                  <span className="leetcode-submission-feed__token-text">{submission.difficulty}</span>
                </span>
              )}
              <span
                className="leetcode-submission-feed__token leetcode-submission-feed__lang"
                style={tokenStyle(`${rowSeed}:lang`)}
              >
                <span className="leetcode-submission-feed__token-text">{submission.lang}</span>
              </span>
              <time
                className="leetcode-submission-feed__token leetcode-submission-feed__time"
                style={tokenStyle(`${rowSeed}:time`)}
              >
                <span className="leetcode-submission-feed__token-text">{formatTimestamp(submission.timestamp)}</span>
              </time>
            </>
          );

          if (submission.titleSlug) {
            return (
              <a
                key={`${submission.titleSlug}-${submission.timestamp}`}
                className="leetcode-submission-feed__row"
                href={`https://leetcode.com/problems/${submission.titleSlug}/`}
                target="_blank"
                rel="noreferrer"
                title={`${submission.title} / ${submission.statusDisplay}`}
              >
                {content}
              </a>
            );
          }

          return (
            <div
              key={`${submission.title}-${submission.timestamp}`}
              className="leetcode-submission-feed__row"
              title={`${submission.title} / ${submission.statusDisplay}`}
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

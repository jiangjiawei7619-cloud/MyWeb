import { useId, type CSSProperties } from 'react';
import type { GitHubCommitPulse } from '@/data/github';

type CommitPulseLineProps = {
  pulse: GitHubCommitPulse;
};

const VIEWBOX_WIDTH = 260;
const VIEWBOX_HEIGHT = 62;
const VIEWBOX_PADDING = 7;

function buildPointCoordinates(points: GitHubCommitPulse['points']): string {
  const maxCount = Math.max(1, ...points.map((point) => point.count));
  const drawableWidth = VIEWBOX_WIDTH - VIEWBOX_PADDING * 2;
  const drawableHeight = VIEWBOX_HEIGHT - VIEWBOX_PADDING * 2;
  const step = points.length > 1 ? drawableWidth / (points.length - 1) : drawableWidth;

  return points
    .map((point, index) => {
      const x = VIEWBOX_PADDING + index * step;
      const y = VIEWBOX_HEIGHT - VIEWBOX_PADDING - (point.count / maxCount) * drawableHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function pointCoordinates(points: GitHubCommitPulse['points']) {
  const maxCount = Math.max(1, ...points.map((point) => point.count));
  const drawableWidth = VIEWBOX_WIDTH - VIEWBOX_PADDING * 2;
  const drawableHeight = VIEWBOX_HEIGHT - VIEWBOX_PADDING * 2;
  const step = points.length > 1 ? drawableWidth / (points.length - 1) : drawableWidth;

  return points.map((point, index) => ({
    ...point,
    x: VIEWBOX_PADDING + index * step,
    y: VIEWBOX_HEIGHT - VIEWBOX_PADDING - (point.count / maxCount) * drawableHeight,
  }));
}

export default function CommitPulseLine({ pulse }: CommitPulseLineProps) {
  const reactId = useId();
  const revealClipId = `github-commit-pulse-reveal-${reactId.replace(/:/g, '')}`;
  const polylinePoints = buildPointCoordinates(pulse.points);
  const coordinates = pointCoordinates(pulse.points);
  const peakCount = Math.max(1, ...pulse.points.map((point) => point.count));

  return (
    <section className="github-commit-pulse" aria-label="GitHub commit pulse">
      <div className="github-module-label">
        <span>COMMITS / {pulse.range}</span>
        <span>{pulse.total}</span>
      </div>

      <div className="github-commit-pulse__scope" aria-hidden>
        <span>7D</span>
        <span className={pulse.range === '30D' ? 'is-active' : ''}>30D</span>
        <span>90D</span>
      </div>

      <svg className="github-commit-pulse__svg" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} role="img">
        <title>Recent GitHub commit activity pulse</title>
        <clipPath id={revealClipId} clipPathUnits="userSpaceOnUse">
          <rect className="github-commit-pulse__reveal-mask" x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} />
        </clipPath>
        <g clipPath={`url(#${revealClipId})`}>
          <line
            className="github-commit-pulse__baseline"
            x1={VIEWBOX_PADDING}
            x2={VIEWBOX_WIDTH - VIEWBOX_PADDING}
            y1={VIEWBOX_HEIGHT - VIEWBOX_PADDING}
            y2={VIEWBOX_HEIGHT - VIEWBOX_PADDING}
          />
          <polyline className="github-commit-pulse__trace github-commit-pulse__trace--shadow" points={polylinePoints} />
          <polyline className="github-commit-pulse__trace" points={polylinePoints} />
          <polyline className="github-commit-pulse__trace github-commit-pulse__trace--flow" points={polylinePoints} />
          {coordinates.map((point, index) => {
            const enterDelay = Math.round(320 + Math.pow(index, 1.24) * 38);

            return (
              <circle
                key={`${point.date}-${index}`}
                className="github-commit-pulse__dot"
                cx={point.x}
                cy={point.y}
                r={point.count >= peakCount * 0.72 ? 2.3 : 1.35}
                style={
                  {
                    '--pulse-dot-delay': `${index * 42}ms`,
                    '--pulse-enter-delay': `${enterDelay}ms`,
                  } as CSSProperties
                }
              >
                <title>{`${point.date} / ${point.count} commits`}</title>
              </circle>
            );
          })}
        </g>
      </svg>
    </section>
  );
}

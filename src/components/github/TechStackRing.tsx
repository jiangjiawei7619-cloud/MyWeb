import type { CSSProperties } from 'react';
import type { GitHubLanguage, GitHubTechStackItem } from '@/data/github';

type TechStackRingProps = {
  languages: GitHubLanguage[];
  techStack: GitHubTechStackItem[];
};

type LanguageSegment = {
  id: string;
  name: string;
  percentage: number;
  value: number;
  start: number;
  color: string;
};

type StackSegment = {
  id: string;
  name: string;
  value: number;
  start: number;
  color: string;
  language: string;
  kind: GitHubTechStackItem['kind'];
};

const LANGUAGE_RING_RADIUS = 28;
const STACK_RING_RADIUS = 40;
const RING_CENTER = 50;
const LANGUAGE_GAP = 0.42;
const STACK_GAP = 0.34;
const EMPTY_COLOR = '#23d7ff';

function ringDash(value: number, gap: number): string {
  return `${Math.max(0.45, value - gap).toFixed(2)} 100`;
}

function segmentMidpoint(segment: { start: number; value: number }, radius: number) {
  const angle = ((segment.start + segment.value / 2) / 100) * Math.PI * 2 - Math.PI / 2;

  return {
    x: RING_CENTER + Math.cos(angle) * radius,
    y: RING_CENTER + Math.sin(angle) * radius,
  };
}

function buildLanguageSegments(languages: GitHubLanguage[]): LanguageSegment[] {
  const totalPercentage = languages.reduce((total, language) => total + Math.max(0, language.percentage), 0);
  let cursor = 0;

  return languages
    .filter((language) => language.percentage > 0)
    .map((language) => {
      const value = totalPercentage > 0 ? (language.percentage / totalPercentage) * 100 : 0;
      const segment = {
        id: language.name,
        name: language.name,
        percentage: language.percentage,
        value,
        start: cursor,
        color: language.color ?? EMPTY_COLOR,
      };
      cursor += value;

      return segment;
    });
}

function groupStackByLanguage(techStack: GitHubTechStackItem[]) {
  return techStack.reduce<Map<string, GitHubTechStackItem[]>>((groups, item) => {
    const group = groups.get(item.language);
    if (group) {
      group.push(item);
      return groups;
    }

    groups.set(item.language, [item]);
    return groups;
  }, new Map<string, GitHubTechStackItem[]>());
}

function buildStackSegments(
  languageSegments: LanguageSegment[],
  techStack: GitHubTechStackItem[],
): StackSegment[] {
  const stackByLanguage = groupStackByLanguage(techStack);

  return languageSegments.flatMap((language) => {
    const children = stackByLanguage.get(language.name) ?? [];
    const totalWeight = children.reduce((total, item) => total + Math.max(0, item.weight), 0);
    let cursor = language.start;

    return children
      .filter((item) => item.weight > 0 && totalWeight > 0)
      .map((item) => {
        const value = language.value * (item.weight / totalWeight);
        const segment = {
          id: `${language.name}-${item.name}`,
          name: item.name,
          value,
          start: cursor,
          color: item.color ?? language.color,
          language: language.name,
          kind: item.kind,
        };
        cursor += value;

        return segment;
      });
  });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function TechStackRing({ languages, techStack }: TechStackRingProps) {
  const languageSegments = buildLanguageSegments(languages);
  const stackSegments = buildStackSegments(languageSegments, techStack);
  const dominantLanguage = languageSegments[0];
  const dominantStack = stackSegments[0];

  return (
    <section className="github-tech-stack-panel" aria-label="GitHub technology stack ratio ring">
      <div className="github-module-label">
        <span>TECH STACK RING</span>
        <span>
          {languageSegments.length} LANG / {stackSegments.length} STACK
        </span>
      </div>

      <div className="github-tech-stack-ring">
        {languageSegments.length === 0 && (
          <div className="github-empty-line">&gt; NO STACK SIGNAL</div>
        )}

        {languageSegments.length > 0 && (
          <>
            <div className="github-tech-stack-ring__stage">
              <svg className="github-tech-stack-ring__svg" viewBox="0 0 100 100" role="img">
                <title>Technology stack ratio grouped by GitHub language share</title>
                <circle className="github-tech-stack-ring__track github-tech-stack-ring__track--stack" cx="50" cy="50" r={STACK_RING_RADIUS} />
                <circle
                  className="github-tech-stack-ring__track github-tech-stack-ring__track--language"
                  cx="50"
                  cy="50"
                  r={LANGUAGE_RING_RADIUS}
                />

                <g className="github-tech-stack-ring__connectors" aria-hidden>
                  {stackSegments.map((segment, index) => {
                    const innerPoint = segmentMidpoint(segment, LANGUAGE_RING_RADIUS + 5);
                    const outerPoint = segmentMidpoint(segment, STACK_RING_RADIUS - 5);

                    return (
                      <line
                        key={`${segment.id}-connector`}
                        x1={innerPoint.x}
                        y1={innerPoint.y}
                        x2={outerPoint.x}
                        y2={outerPoint.y}
                        style={
                          {
                            '--segment-color': segment.color,
                            '--segment-delay': `${index * 70}ms`,
                          } as CSSProperties
                        }
                      />
                    );
                  })}
                </g>

                <g className="github-tech-stack-ring__segments github-tech-stack-ring__segments--language">
                  {languageSegments.map((segment, index) => (
                    <circle
                      key={segment.id}
                      className="github-tech-stack-ring__segment github-tech-stack-ring__segment--language"
                      cx="50"
                      cy="50"
                      r={LANGUAGE_RING_RADIUS}
                      pathLength={100}
                      strokeDasharray="var(--segment-dash)"
                      strokeDashoffset="var(--segment-offset)"
                      transform="rotate(-90 50 50)"
                      style={
                        {
                          '--segment-color': segment.color,
                          '--segment-dash': ringDash(segment.value, LANGUAGE_GAP),
                          '--segment-offset': `${-segment.start.toFixed(2)}`,
                          '--segment-delay': `${index * 95}ms`,
                        } as CSSProperties
                      }
                    >
                      <title>
                        {segment.name} language share {formatPercent(segment.percentage)}
                      </title>
                    </circle>
                  ))}
                </g>

                <g className="github-tech-stack-ring__segments github-tech-stack-ring__segments--stack">
                  {stackSegments.map((segment, index) => (
                    <circle
                      key={segment.id}
                      className="github-tech-stack-ring__segment github-tech-stack-ring__segment--stack"
                      cx="50"
                      cy="50"
                      r={STACK_RING_RADIUS}
                      pathLength={100}
                      strokeDasharray="var(--segment-dash)"
                      strokeDashoffset="var(--segment-offset)"
                      transform="rotate(-90 50 50)"
                      style={
                        {
                          '--segment-color': segment.color,
                          '--segment-dash': ringDash(segment.value, STACK_GAP),
                          '--segment-offset': `${-segment.start.toFixed(2)}`,
                          '--segment-delay': `${index * 70 + 120}ms`,
                        } as CSSProperties
                      }
                    >
                      <title>
                        {segment.name} under {segment.language}: {formatPercent(segment.value)}
                      </title>
                    </circle>
                  ))}
                </g>
              </svg>

              <div className="github-tech-stack-ring__center">
                <span>DOMINANT</span>
                <strong>{dominantLanguage?.name ?? 'N/A'}</strong>
                <em>{dominantStack?.name ?? 'API ONLY'}</em>
              </div>
            </div>

            <div className="github-tech-stack-ring__legend">
              {languageSegments.slice(0, 5).map((language, index) => {
                const childStacks = stackSegments.filter((segment) => segment.language === language.name).slice(0, 3);

                return (
                  <div
                    className="github-tech-stack-ring__legend-row"
                    key={language.id}
                    style={{ '--legend-row-delay': `${260 + index * 135}ms` } as CSSProperties}
                  >
                    <div className="github-tech-stack-ring__legend-language">
                      <span
                        className="github-tech-stack-ring__swatch"
                        style={{ '--segment-color': language.color } as CSSProperties}
                        aria-hidden
                      />
                      <strong>{language.name}</strong>
                      <em>{formatPercent(language.percentage)}</em>
                    </div>

                    <div className="github-tech-stack-ring__stack-list">
                      {childStacks.length > 0 ? (
                        childStacks.map((stack) => (
                          <span className="github-tech-stack-ring__stack-chip" key={stack.id}>
                            <i style={{ '--segment-color': stack.color } as CSSProperties} aria-hidden />
                            <span>{stack.name}</span>
                          </span>
                        ))
                      ) : (
                        <span className="github-tech-stack-ring__stack-chip is-muted">
                          <span>API ONLY</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

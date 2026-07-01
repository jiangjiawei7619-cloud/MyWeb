import type { CSSProperties } from 'react';
import type { LeetCodeTopicTag } from '@/data/leetcode';

type TopicTagBarsProps = {
  tags: LeetCodeTopicTag[];
};

const TOPIC_BAR_DURATION_SCALE = 1.15;

export default function TopicTagBars({ tags }: TopicTagBarsProps) {
  const sortedTags = [...tags].sort((a, b) => b.problemsSolved - a.problemsSolved);
  const maxSolved = Math.max(0, ...sortedTags.map((tag) => tag.problemsSolved));

  return (
    <section className="leetcode-topic-panel" aria-label="LeetCode topic tag distribution">
      <div className="leetcode-module-label">
        <span>TOPIC TAGS DISTRIBUTION</span>
        <span>top {sortedTags.length}</span>
      </div>

      <div className="leetcode-topic-bars">
        {sortedTags.length === 0 && (
          <div className="leetcode-empty-line">&gt; NO TOPIC TAG SIGNAL</div>
        )}

        {sortedTags.map((tag, index) => {
          const percent = maxSolved > 0 ? (tag.problemsSolved / maxSolved) * 100 : 0;
          const duration = (0.58 + (percent / 100) * 0.82) * TOPIC_BAR_DURATION_SCALE;

          return (
            <div
              key={tag.tagSlug ?? tag.tagName}
              className="leetcode-topic-bars__row"
              style={{ '--topic-row-delay': `${index * 0.075}s` } as CSSProperties}
              title={`${tag.tagName}: ${tag.problemsSolved} solved`}
            >
              <span className="leetcode-topic-bars__name">
                <span className="leetcode-topic-bars__token-text">{tag.tagName.toUpperCase()}</span>
              </span>
              <span className="leetcode-topic-bars__count">{tag.problemsSolved}</span>
              <span className="leetcode-topic-bars__track" aria-hidden>
                <span
                  className="leetcode-topic-bars__fill"
                  style={
                    {
                      '--topic-bar-width': `${percent}%`,
                      '--topic-bar-delay': `${index * 0.1}s`,
                      '--topic-bar-duration': `${duration}s`,
                    } as CSSProperties
                  }
                />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

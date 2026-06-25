import type { CSSProperties } from 'react';
import type { GitHubCommitStreak } from '@/data/github';

type CommitStreakStripProps = {
  streak: GitHubCommitStreak;
};

export default function CommitStreakStrip({ streak }: CommitStreakStripProps) {
  const maxCount = Math.max(1, ...streak.days.map((day) => day.count));

  return (
    <section className="github-streak-strip" aria-label="GitHub commit streak">
      <div className="github-module-label">
        <span>COMMIT STREAK</span>
        <span>{streak.longest ? `longest ${streak.longest}d` : 'rhythm strip'}</span>
      </div>

      <div className="github-streak-strip__summary">
        <strong>{streak.current}</strong>
        <span>DAYS</span>
      </div>

      <div
        className="github-streak-strip__bars"
        style={{ '--github-streak-days': streak.days.length } as CSSProperties}
      >
        {streak.days.map((day, index) => {
          const height = day.count > 0 ? 18 + (day.count / maxCount) * 82 : 9;
          const alpha = day.count > 0 ? 0.38 + (day.count / maxCount) * 0.58 : 0.16;
          const enterDelay = Math.round(Math.pow(index, 1.36) * 8);

          return (
            <span
              key={day.date}
              className={`github-streak-strip__bar ${day.count > 0 ? 'is-active' : 'is-empty'}`}
              style={
                {
                  '--streak-height': `${height}%`,
                  '--streak-alpha': alpha,
                  '--streak-delay': `${index * 22}ms`,
                  '--streak-enter-delay': `${enterDelay}ms`,
                } as CSSProperties
              }
              title={`${day.date} / ${day.count} commits`}
            />
          );
        })}
      </div>
    </section>
  );
}

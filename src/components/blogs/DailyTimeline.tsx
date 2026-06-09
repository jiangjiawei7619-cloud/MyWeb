import { AnimatePresence, motion } from 'motion/react';
import BlogHudPanel from '@/components/blogs/BlogHudPanel';
import type { DailyLog } from '@/data/blogs';

type DailyTimelineProps = {
  logs: DailyLog[];
  expandedDailyLogIds: string[];
  onToggleLog: (id: string) => void;
  className?: string;
};

export default function DailyTimeline({
  logs,
  expandedDailyLogIds,
  onToggleLog,
  className = '',
}: DailyTimelineProps) {
  return (
    <BlogHudPanel
      variant="cyan"
      className={className}
      header={
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#ff5357]" aria-hidden>
              menu_book
            </span>
            <h3 className="m-0 font-mono text-[13px] font-bold uppercase text-[#ff5357]">
              Daily / Life Notes
            </h3>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase text-[#9cf8ff]/70">
            View All -&gt;
          </span>
        </div>
      }
    >
      <div className="daily-timeline">
        {logs.map((log) => {
          const expanded = expandedDailyLogIds.includes(log.id);

          return (
            <article key={log.id} className={`daily-timeline-item ${expanded ? 'daily-timeline-item--expanded' : ''}`}>
              <button type="button" className="daily-timeline-button" onClick={() => onToggleLog(log.id)}>
                <span className="daily-timeline-node" aria-hidden />
                <span className="min-w-0 flex-1 text-left">
                  <span className="daily-timeline-date">{log.date}</span>
                  <span className="daily-timeline-title">{log.title}</span>
                  <span className="daily-timeline-summary">{log.summary}</span>
                </span>
                <span
                  className={`material-symbols-outlined daily-timeline-arrow ${expanded ? 'daily-timeline-arrow--open' : ''}`}
                  aria-hidden
                >
                  keyboard_arrow_right
                </span>
              </button>

              <AnimatePresence initial={false}>
                {expanded && log.content && (
                  <motion.div
                    key={`${log.id}-content`}
                    initial={{ height: 0, opacity: 0, filter: 'blur(4px)' }}
                    animate={{ height: 'auto', opacity: 1, filter: 'blur(0px)' }}
                    exit={{ height: 0, opacity: 0, filter: 'blur(4px)' }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="daily-timeline-content">{log.content}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}
      </div>
    </BlogHudPanel>
  );
}

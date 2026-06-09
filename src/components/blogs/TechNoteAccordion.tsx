import { AnimatePresence, motion } from 'motion/react';
import BlogHudPanel from '@/components/blogs/BlogHudPanel';
import type { TechNote } from '@/data/blogs';

type TechNoteAccordionProps = {
  notes: TechNote[];
  expandedTechNoteIds: string[];
  onToggleNote: (id: string) => void;
  className?: string;
};

export default function TechNoteAccordion({
  notes,
  expandedTechNoteIds,
  onToggleNote,
  className = '',
}: TechNoteAccordionProps) {
  return (
    <BlogHudPanel
      variant="red"
      className={className}
      header={
        <div className="flex items-center justify-between gap-4">
          <h3 className="m-0 font-mono text-[13px] font-bold uppercase text-[#ff5357]">
            Tech Notes
          </h3>
          <span className="font-mono text-[10px] font-bold uppercase text-[#ff5357]/80">
            View All -&gt;
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        {notes.map((note) => {
          const expanded = expandedTechNoteIds.includes(note.id);

          return (
            <article key={note.id} className={`tech-note-card ${expanded ? 'tech-note-card--expanded' : ''}`}>
              <div className="tech-note-card__inner">
                <div className="tech-note-card__cover">
                  {note.cover && <img src={note.cover} alt={note.title} />}
                  <span>{note.id.slice(0, 7)}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h4 className="m-0 text-[16px] font-bold leading-tight text-[#f5dbd8] md:text-[18px]">
                          {note.title}
                        </h4>
                        <span className="rounded-sm border border-[#ff5357]/45 px-2 py-0.5 font-mono text-[8px] uppercase text-[#ff8d8f]">
                          Tech Notes
                        </span>
                      </div>
                      <p className="m-0 font-mono text-[11px] leading-5 text-[#f4d8d3]/58 md:text-[12px]">
                        {note.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label={expanded ? `Collapse ${note.title}` : `Expand ${note.title}`}
                      aria-expanded={expanded}
                      onClick={() => onToggleNote(note.id)}
                      className="blog-icon-button blog-icon-button--red shrink-0"
                    >
                      <span className={`material-symbols-outlined transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                        keyboard_arrow_down
                      </span>
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {note.tags.map((tag) => (
                      <span key={tag} className="blog-tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase text-white/42">
                    <span>{note.date}</span>
                    <span>{note.readTime}</span>
                  </div>

                  <AnimatePresence initial={false}>
                    {expanded && note.content && (
                      <motion.div
                        key={`${note.id}-content`}
                        initial={{ height: 0, opacity: 0, filter: 'blur(4px)' }}
                        animate={{ height: 'auto', opacity: 1, filter: 'blur(0px)' }}
                        exit={{ height: 0, opacity: 0, filter: 'blur(4px)' }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="mt-3 border-t border-white/10 pt-3 font-mono text-[12px] leading-6 text-[#9cf8ff]/66">
                          {note.content}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </BlogHudPanel>
  );
}

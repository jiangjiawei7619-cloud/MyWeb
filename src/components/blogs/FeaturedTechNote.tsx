import { AnimatePresence, motion } from 'motion/react';
import BlogHudPanel from '@/components/blogs/BlogHudPanel';
import type { TechNote } from '@/data/blogs';

type FeaturedTechNoteProps = {
  note: TechNote;
  expanded: boolean;
  onToggle: () => void;
};

const accordionTransition = {
  duration: 0.32,
  ease: [0.16, 1, 0.3, 1],
} as const;

export default function FeaturedTechNote({ note, expanded, onToggle }: FeaturedTechNoteProps) {
  return (
    <BlogHudPanel variant="red" className="featured-tech-note group">
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6">
        <div className="featured-tech-note__cover">
          {note.cover && <img src={note.cover} alt={note.title} />}
          <div className="featured-tech-note__cover-code">cover_01</div>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase text-[#ff5357]">
                  Featured Tech Note
                </span>
                <span className="rounded-sm border border-[#ff5357]/50 px-2 py-0.5 font-mono text-[8px] uppercase text-[#ffb3af]">
                  Tech Notes
                </span>
              </div>
              <h2 className="blog-glitch-heading m-0 text-[24px] font-black leading-tight text-[#ffdad8] md:text-[34px]">
                {note.title}
              </h2>
            </div>

            <button
              type="button"
              aria-label={expanded ? 'Collapse featured tech note' : 'Expand featured tech note'}
              aria-expanded={expanded}
              onClick={onToggle}
              className="blog-icon-button blog-icon-button--red shrink-0"
            >
              <span className={`material-symbols-outlined transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                keyboard_arrow_down
              </span>
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <span key={tag} className="blog-tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase text-[#ffb3af]/65">
            <span>{note.date}</span>
            <span>{note.readTime}</span>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="featured-expanded"
                initial={{ height: 0, opacity: 0, filter: 'blur(4px)' }}
                animate={{ height: 'auto', opacity: 1, filter: 'blur(0px)' }}
                exit={{ height: 0, opacity: 0, filter: 'blur(4px)' }}
                transition={accordionTransition}
                className="overflow-hidden"
              >
                <p className="m-0 max-w-4xl font-mono text-[12px] leading-6 text-[#f2d8d4]/78 md:text-[13px]">
                  {note.summary}
                </p>
                {note.content && (
                  <p className="mt-3 max-w-4xl font-mono text-[12px] leading-6 text-[#9cefff]/62 md:text-[13px]">
                    {note.content}
                  </p>
                )}
                <button
                  type="button"
                  className="mt-4 font-mono text-[10px] font-bold uppercase text-[#ff5357] transition-all duration-300 hover:text-[#ffdad8] hover:drop-shadow-[0_0_10px_rgba(255,83,87,0.8)]"
                >
                  Read More -&gt;
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </BlogHudPanel>
  );
}

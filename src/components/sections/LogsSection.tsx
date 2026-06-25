import { useMemo, useState, type ReactNode } from 'react';
import BlogCategoryTabs, { type BlogCategory } from '@/components/blogs/BlogCategoryTabs';
import DailyTimeline from '@/components/blogs/DailyTimeline';
import FeaturedTechNote from '@/components/blogs/FeaturedTechNote';
import HeatmapPanel from '@/components/blogs/HeatmapPanel';
import LeetCodePanel from '@/components/leetcode/LeetCodePanel';
import TechNoteAccordion from '@/components/blogs/TechNoteAccordion';
import {
  dailyLogs,
  githubHeatmap,
  techNotes,
  type HeatmapDay,
} from '@/data/blogs';
import { getLeetCodeStats } from '@/data/leetcode';
import { playClick, playJumpSound } from '@/utils/audio';

function sumCounts(days: HeatmapDay[]): number {
  return days.reduce((total, day) => total + day.count, 0);
}

function BlogReveal({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export default function LogsSection() {
  const featuredNote = useMemo(() => techNotes.find((note) => note.featured) ?? techNotes[0], []);
  const accordionNotes = useMemo(() => techNotes.filter((note) => note.id !== featuredNote?.id), [featuredNote]);
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory>('tech');
  const [expandedFeatured, setExpandedFeatured] = useState(true);
  const [expandedTechNoteIds, setExpandedTechNoteIds] = useState<string[]>(() =>
    accordionNotes[0] ? [accordionNotes[0].id] : [],
  );
  const [expandedDailyLogIds, setExpandedDailyLogIds] = useState<string[]>([]);

  const leetcodeStats = useMemo(() => getLeetCodeStats(), []);
  const githubTotal = useMemo(() => sumCounts(githubHeatmap), []);

  const handleSelectCategory = (category: BlogCategory) => {
    if (category === selectedCategory) return;
    playJumpSound();
    setSelectedCategory(category);
  };

  const toggleFeatured = () => {
    playClick(920, 0.025);
    setExpandedFeatured((expanded) => !expanded);
  };

  const toggleTechNote = (id: string) => {
    playClick(980, 0.025);
    setExpandedTechNoteIds((current) =>
      current.includes(id) ? current.filter((noteId) => noteId !== id) : [...current, id],
    );
  };

  const toggleDailyLog = (id: string) => {
    playClick(980, 0.025);
    setExpandedDailyLogIds((current) =>
      current.includes(id) ? current.filter((logId) => logId !== id) : [...current, id],
    );
  };

  const showFeatured = selectedCategory === 'tech';
  const showLeetcode = selectedCategory === 'leetcode';
  const showGithub = selectedCategory === 'github';
  const showDaily = selectedCategory === 'daily';
  const showTechList = selectedCategory === 'tech';

  return (
    <section className="blogs-hub w-full select-none">
      <div className="blogs-grid-texture" aria-hidden />

      <BlogCategoryTabs selectedCategory={selectedCategory} onSelect={handleSelectCategory} />

      <div className={`blogs-content-shell space-y-4 md:space-y-5 ${showLeetcode ? 'blogs-content-shell--leetcode' : ''}`}>
        {showFeatured && featuredNote && (
          <BlogReveal key={`featured-${selectedCategory}`}>
            <FeaturedTechNote note={featuredNote} expanded={expandedFeatured} onToggle={toggleFeatured} />
          </BlogReveal>
        )}

        {(showLeetcode || showGithub) && (
          <div className="grid grid-cols-1 gap-4 md:gap-5">
            {showLeetcode && (
              <BlogReveal key="leetcode">
                <LeetCodePanel stats={leetcodeStats} />
              </BlogReveal>
            )}
            {showGithub && (
              <BlogReveal key="github">
                <HeatmapPanel
                  title="GitHub Contribution Matrix"
                  subtitle="repo signal feed / mock protocol"
                  totalLabel={`Contributions: ${githubTotal}`}
                  data={githubHeatmap}
                  variant="github"
                />
              </BlogReveal>
            )}
          </div>
        )}

        {(showDaily || showTechList) && (
          <div className="grid grid-cols-1 gap-4 md:gap-5">
            {showDaily && (
              <BlogReveal key="daily">
                <DailyTimeline
                  logs={dailyLogs}
                  expandedDailyLogIds={expandedDailyLogIds}
                  onToggleLog={toggleDailyLog}
                />
              </BlogReveal>
            )}

            {showTechList && (
              <BlogReveal key="tech-list">
                <TechNoteAccordion
                  notes={accordionNotes}
                  expandedTechNoteIds={expandedTechNoteIds}
                  onToggleNote={toggleTechNote}
                />
              </BlogReveal>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import BlogCategoryTabs, { type BlogCategory } from '@/components/blogs/BlogCategoryTabs';
import DailyTimeline from '@/components/blogs/DailyTimeline';
import FeaturedTechNote from '@/components/blogs/FeaturedTechNote';
import HeatmapPanel from '@/components/blogs/HeatmapPanel';
import TechNoteAccordion from '@/components/blogs/TechNoteAccordion';
import {
  dailyLogs,
  githubHeatmap,
  leetcodeHeatmap,
  techNotes,
  type HeatmapDay,
} from '@/data/blogs';
import { playClick } from '@/utils/audio';

function sumCounts(days: HeatmapDay[]): number {
  return days.reduce((total, day) => total + day.count, 0);
}

export default function LogsSection() {
  const featuredNote = useMemo(() => techNotes.find((note) => note.featured) ?? techNotes[0], []);
  const accordionNotes = useMemo(() => techNotes.filter((note) => note.id !== featuredNote?.id), [featuredNote]);
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory>('all');
  const [expandedFeatured, setExpandedFeatured] = useState(true);
  const [expandedTechNoteIds, setExpandedTechNoteIds] = useState<string[]>(() =>
    accordionNotes[0] ? [accordionNotes[0].id] : [],
  );
  const [expandedDailyLogIds, setExpandedDailyLogIds] = useState<string[]>([]);

  const leetcodeTotal = useMemo(() => sumCounts(leetcodeHeatmap), []);
  const githubTotal = useMemo(() => sumCounts(githubHeatmap), []);

  const handleSelectCategory = (category: BlogCategory) => {
    playClick(880, 0.025);
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

  const showFeatured = selectedCategory === 'all' || selectedCategory === 'tech';
  const showLeetcode = selectedCategory === 'all' || selectedCategory === 'leetcode';
  const showGithub = selectedCategory === 'all' || selectedCategory === 'github';
  const showDaily = selectedCategory === 'all' || selectedCategory === 'daily';
  const showTechList = selectedCategory === 'all' || selectedCategory === 'tech';

  return (
    <section className="blogs-hub w-full select-none">
      <div className="blogs-grid-texture" aria-hidden />

      <BlogCategoryTabs selectedCategory={selectedCategory} onSelect={handleSelectCategory} />

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCategory}
          className="space-y-4 md:space-y-5"
          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        >
          {showFeatured && featuredNote && (
            <FeaturedTechNote note={featuredNote} expanded={expandedFeatured} onToggle={toggleFeatured} />
          )}

          {(showLeetcode || showGithub) && (
            <div
              className={`grid gap-4 md:gap-5 ${
                selectedCategory === 'all' ? 'xl:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {showLeetcode && (
                <HeatmapPanel
                  title="LeetCode Activity Matrix"
                  subtitle="custom calendar feed / mock protocol"
                  totalLabel={`Total Solved: ${leetcodeTotal}`}
                  data={leetcodeHeatmap}
                  variant="leetcode"
                />
              )}
              {showGithub && (
                <HeatmapPanel
                  title="GitHub Contribution Matrix"
                  subtitle="repo signal feed / mock protocol"
                  totalLabel={`Contributions: ${githubTotal}`}
                  data={githubHeatmap}
                  variant="github"
                />
              )}
            </div>
          )}

          {(showDaily || showTechList) && (
            <div
              className={`grid gap-4 md:gap-5 ${
                selectedCategory === 'all' ? 'xl:grid-cols-[0.92fr_1.58fr]' : 'grid-cols-1'
              }`}
            >
              {showDaily && (
                <DailyTimeline
                  logs={dailyLogs}
                  expandedDailyLogIds={expandedDailyLogIds}
                  onToggleLog={toggleDailyLog}
                />
              )}

              {showTechList && (
                <TechNoteAccordion
                  notes={accordionNotes}
                  expandedTechNoteIds={expandedTechNoteIds}
                  onToggleNote={toggleTechNote}
                />
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

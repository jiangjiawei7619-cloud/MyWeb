export type BlogCategory = 'all' | 'tech' | 'leetcode' | 'github' | 'daily';

type BlogCategoryTabsProps = {
  selectedCategory: BlogCategory;
  onSelect: (category: BlogCategory) => void;
};

const BLOG_TABS: Array<{ id: BlogCategory; label: string; icon: string }> = [
  { id: 'all', label: 'ALL', icon: 'dashboard' },
  { id: 'tech', label: 'TECH NOTES', icon: 'deployed_code' },
  { id: 'leetcode', label: 'LEETCODE', icon: 'code_blocks' },
  { id: 'github', label: 'GITHUB', icon: 'hub' },
  { id: 'daily', label: 'DAILY LOGS', icon: 'adjust' },
];

export default function BlogCategoryTabs({ selectedCategory, onSelect }: BlogCategoryTabsProps) {
  return (
    <nav className="blog-category-tabs" aria-label="Blog categories">
      {BLOG_TABS.map((tab) => {
        const isActive = selectedCategory === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(tab.id)}
            className={`blog-category-tab ${isActive ? 'blog-category-tab--active' : ''}`}
          >
            <span className="material-symbols-outlined text-[17px]" aria-hidden>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

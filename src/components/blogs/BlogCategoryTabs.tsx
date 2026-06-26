export type BlogCategory = 'tech' | 'leetcode' | 'github' | 'daily';

type BlogCategoryTabsProps = {
  selectedCategory: BlogCategory;
  onSelect: (category: BlogCategory) => void;
};

const BLOG_TABS: Array<{ id: BlogCategory; label: string }> = [
  { id: 'daily', label: 'Daily' },
  { id: 'leetcode', label: 'LeetCode' },
  { id: 'github', label: 'GitHub' },
  { id: 'tech', label: 'Tech Notes' },
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
            aria-label={tab.label}
            aria-pressed={isActive}
            onClick={() => onSelect(tab.id)}
            className={`blog-category-tab ${isActive ? 'blog-category-tab--active' : ''}`}
          >
            <span className="blog-category-tab__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

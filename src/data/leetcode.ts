import { leetcodeHeatmap, type HeatmapDay } from '@/data/blogs';

export type LeetCodeDifficulty = 'Easy' | 'Medium' | 'Hard';

export type LeetCodeDifficultyStats = {
  easy: number;
  medium: number;
  hard: number;
};

export type LeetCodeRecentSubmission = {
  title: string;
  titleSlug?: string;
  statusDisplay: string;
  lang: string;
  timestamp: number | string;
  difficulty?: LeetCodeDifficulty;
};

export type LeetCodeTopicTag = {
  tagName: string;
  tagSlug?: string;
  problemsSolved: number;
};

export type LeetCodeStats = {
  username: string;
  source: 'api' | 'mock';
  totalSolved: number;
  difficulty: LeetCodeDifficultyStats;
  recentSubmissions: LeetCodeRecentSubmission[];
  topicTags: LeetCodeTopicTag[];
  calendar: HeatmapDay[];
  error?: string;
};

export const LEETCODE_USERNAME = 'mock-protocol-runner';
export const LEETCODE_RECENT_SUBMISSION_LIMIT = 7;
export const LEETCODE_TOPIC_TAG_LIMIT = 10;

const MOCK_DIFFICULTY_TEMPLATE: LeetCodeDifficultyStats = {
  easy: 120,
  medium: 270,
  hard: 72,
};

const MOCK_RECENT_SUBMISSIONS: LeetCodeRecentSubmission[] = [
  {
    title: 'Minimum Window Substring',
    titleSlug: 'minimum-window-substring',
    statusDisplay: 'Accepted',
    lang: 'TypeScript',
    timestamp: '2h ago',
    difficulty: 'Hard',
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    titleSlug: 'longest-substring-without-repeating-characters',
    statusDisplay: 'Accepted',
    lang: 'Java',
    timestamp: '6h ago',
    difficulty: 'Medium',
  },
  {
    title: 'Binary Tree Level Order Traversal',
    titleSlug: 'binary-tree-level-order-traversal',
    statusDisplay: 'Wrong Answer',
    lang: 'Java',
    timestamp: '1d ago',
    difficulty: 'Medium',
  },
  {
    title: 'Two Sum',
    titleSlug: 'two-sum',
    statusDisplay: 'Accepted',
    lang: 'JavaScript',
    timestamp: '1d ago',
    difficulty: 'Easy',
  },
  {
    title: 'Kth Largest Element in an Array',
    titleSlug: 'kth-largest-element-in-an-array',
    statusDisplay: 'Accepted',
    lang: 'TypeScript',
    timestamp: '2d ago',
    difficulty: 'Medium',
  },
  {
    title: 'Word Ladder',
    titleSlug: 'word-ladder',
    statusDisplay: 'Time Limit Exceeded',
    lang: 'Java',
    timestamp: '3d ago',
    difficulty: 'Hard',
  },
  {
    title: 'Merge Intervals',
    titleSlug: 'merge-intervals',
    statusDisplay: 'Accepted',
    lang: 'Python3',
    timestamp: '4d ago',
    difficulty: 'Medium',
  },
  {
    title: 'Valid Parentheses',
    titleSlug: 'valid-parentheses',
    statusDisplay: 'Accepted',
    lang: 'TypeScript',
    timestamp: '5d ago',
    difficulty: 'Easy',
  },
];

const MOCK_TOPIC_TAGS: LeetCodeTopicTag[] = [
  { tagName: 'Array', tagSlug: 'array', problemsSolved: 83 },
  { tagName: 'String', tagSlug: 'string', problemsSolved: 68 },
  { tagName: 'Hash Table', tagSlug: 'hash-table', problemsSolved: 64 },
  { tagName: 'Dynamic Programming', tagSlug: 'dynamic-programming', problemsSolved: 52 },
  { tagName: 'Math', tagSlug: 'math', problemsSolved: 47 },
  { tagName: 'Tree', tagSlug: 'tree', problemsSolved: 36 },
  { tagName: 'Binary Search', tagSlug: 'binary-search', problemsSolved: 31 },
  { tagName: 'Graph', tagSlug: 'graph', problemsSolved: 28 },
  { tagName: 'Two Pointers', tagSlug: 'two-pointers', problemsSolved: 27 },
  { tagName: 'Stack', tagSlug: 'stack', problemsSolved: 24 },
  { tagName: 'Heap Priority Queue', tagSlug: 'heap-priority-queue', problemsSolved: 18 },
  { tagName: 'Sliding Window', tagSlug: 'sliding-window', problemsSolved: 17 },
];

function sumHeatmapCounts(days: HeatmapDay[]): number {
  return days.reduce((total, day) => total + day.count, 0);
}

function buildMockDifficulty(totalSolved: number): LeetCodeDifficultyStats {
  const templateTotal =
    MOCK_DIFFICULTY_TEMPLATE.easy + MOCK_DIFFICULTY_TEMPLATE.medium + MOCK_DIFFICULTY_TEMPLATE.hard;

  if (totalSolved === templateTotal) return MOCK_DIFFICULTY_TEMPLATE;
  if (totalSolved <= 0 || templateTotal <= 0) return { easy: 0, medium: 0, hard: 0 };

  const easy = Math.round((totalSolved * MOCK_DIFFICULTY_TEMPLATE.easy) / templateTotal);
  const medium = Math.round((totalSolved * MOCK_DIFFICULTY_TEMPLATE.medium) / templateTotal);
  const hard = Math.max(0, totalSolved - easy - medium);

  return { easy, medium, hard };
}

function sortTopicTags(tags: LeetCodeTopicTag[]): LeetCodeTopicTag[] {
  return [...tags].sort((a, b) => b.problemsSolved - a.problemsSolved);
}

export function getLeetCodeStats(): LeetCodeStats {
  const totalSolved = sumHeatmapCounts(leetcodeHeatmap);

  return {
    username: LEETCODE_USERNAME,
    source: 'mock',
    totalSolved,
    difficulty: buildMockDifficulty(totalSolved),
    recentSubmissions: MOCK_RECENT_SUBMISSIONS.slice(0, LEETCODE_RECENT_SUBMISSION_LIMIT),
    topicTags: sortTopicTags(MOCK_TOPIC_TAGS).slice(0, LEETCODE_TOPIC_TAG_LIMIT),
    calendar: leetcodeHeatmap,
  };
}

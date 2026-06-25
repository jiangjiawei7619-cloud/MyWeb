import { githubHeatmap, type HeatmapDay } from '@/data/blogs';

export type GitHubCommitPulseRange = '7D' | '30D' | '90D';

export type GitHubCommitPulsePoint = {
  date: string;
  count: number;
};

export type GitHubCommitPulse = {
  total: number;
  range: GitHubCommitPulseRange;
  points: GitHubCommitPulsePoint[];
};

export type GitHubLanguage = {
  name: string;
  percentage: number;
  bytes?: number;
  color?: string;
};

export type GitHubTechStackKind = 'framework' | 'runtime' | 'library' | 'tooling' | 'platform' | 'shader';

export type GitHubTechStackItem = {
  name: string;
  language: string;
  weight: number;
  kind: GitHubTechStackKind;
  color?: string;
};

export type GitHubActivityType =
  | 'PushEvent'
  | 'PullRequestEvent'
  | 'IssuesEvent'
  | 'WatchEvent'
  | 'ForkEvent'
  | 'ReleaseEvent';

export type GitHubActivity = {
  type: GitHubActivityType;
  repo: string;
  message: string;
  url?: string;
  createdAt: string;
  branch?: string;
  commitCount?: number;
};

export type GitHubCommitStreak = {
  current: number;
  longest?: number;
  days: GitHubCommitPulsePoint[];
};

export type GitHubStats = {
  username: string;
  source: 'api' | 'mock';
  totalContributions: number;
  contributionCalendar: HeatmapDay[];
  commitPulse: GitHubCommitPulse;
  languages: GitHubLanguage[];
  techStack: GitHubTechStackItem[];
  latestActivity: GitHubActivity[];
  commitStreak: GitHubCommitStreak;
  error?: string;
};

export const GITHUB_USERNAME = 'mock-protocol-runner';
export const GITHUB_ACTIVITY_LIMIT = 7;
export const GITHUB_LANGUAGE_LIMIT = 7;
export const GITHUB_COMMIT_PULSE_RANGE: GitHubCommitPulseRange = '30D';
export const GITHUB_STREAK_DAYS = 30;

const DAYS_BY_RANGE: Record<GitHubCommitPulseRange, number> = {
  '7D': 7,
  '30D': 30,
  '90D': 90,
};

const MOCK_LANGUAGES: GitHubLanguage[] = [
  { name: 'TypeScript', percentage: 38.2, bytes: 412_600, color: '#23d7ff' },
  { name: 'JavaScript', percentage: 21.7, bytes: 234_380, color: '#38a7ff' },
  { name: 'Java', percentage: 15.6, bytes: 168_480, color: '#1fc7b6' },
  { name: 'CSS', percentage: 9.4, bytes: 101_520, color: '#7c6dff' },
  { name: 'Python', percentage: 6.8, bytes: 73_440, color: '#5ce6d6' },
  { name: 'HTML', percentage: 5.2, bytes: 56_160, color: '#72b8ff' },
  { name: 'GLSL', percentage: 3.1, bytes: 33_480, color: '#9a8cff' },
];

// Manual stack layer: add or edit items here. Weights are normalized inside each parent language arc.
const MANUAL_TECH_STACK: GitHubTechStackItem[] = [
  { name: 'React', language: 'TypeScript', weight: 30, kind: 'framework', color: '#23d7ff' },
  { name: 'Vite', language: 'TypeScript', weight: 15, kind: 'tooling', color: '#9a8cff' },
  { name: 'R3F', language: 'TypeScript', weight: 13, kind: 'library', color: '#38a7ff' },
  { name: 'Three.js', language: 'JavaScript', weight: 18, kind: 'library', color: '#72b8ff' },
  { name: 'Motion', language: 'JavaScript', weight: 10, kind: 'library', color: '#7c6dff' },
  { name: 'Spring Boot', language: 'Java', weight: 14, kind: 'framework', color: '#1fc7b6' },
  { name: 'Tailwind', language: 'CSS', weight: 17, kind: 'framework', color: '#8f7cff' },
  { name: 'Python Tools', language: 'Python', weight: 9, kind: 'tooling', color: '#5ce6d6' },
  { name: 'Semantic HTML', language: 'HTML', weight: 8, kind: 'platform', color: '#72b8ff' },
  { name: 'Shader Lab', language: 'GLSL', weight: 6, kind: 'shader', color: '#b8adff' },
];

const MOCK_LATEST_ACTIVITY: GitHubActivity[] = [
  {
    type: 'PushEvent',
    repo: 'Myweb',
    message: 'pushed 3 commits into logs surface',
    branch: 'main',
    commitCount: 3,
    createdAt: '2026-06-25T06:20:00Z',
    url: 'https://github.com/',
  },
  {
    type: 'PullRequestEvent',
    repo: 'personal-site',
    message: 'merged matrix panel refresh',
    createdAt: '2026-06-24T14:10:00Z',
    url: 'https://github.com/',
  },
  {
    type: 'IssuesEvent',
    repo: 'java-notes',
    message: 'closed cache invalidation bug',
    createdAt: '2026-06-23T18:45:00Z',
    url: 'https://github.com/',
  },
  {
    type: 'WatchEvent',
    repo: 'spring-demo',
    message: '+1 external signal',
    createdAt: '2026-06-22T12:30:00Z',
    url: 'https://github.com/',
  },
  {
    type: 'ForkEvent',
    repo: 'shader-lab',
    message: 'forked runtime experiment',
    createdAt: '2026-06-21T09:20:00Z',
    url: 'https://github.com/',
  },
  {
    type: 'ReleaseEvent',
    repo: 'cyber-ui-kit',
    message: 'published v0.4.2',
    createdAt: '2026-06-20T21:05:00Z',
    url: 'https://github.com/',
  },
  {
    type: 'PushEvent',
    repo: 'leetcode-matrix',
    message: 'updated mock protocol adapter',
    branch: 'feature/signals',
    commitCount: 2,
    createdAt: '2026-06-19T11:40:00Z',
    url: 'https://github.com/',
  },
];

function sumCounts(days: Array<{ count: number }>): number {
  return days.reduce((total, day) => total + day.count, 0);
}

function sortCalendar(calendar: HeatmapDay[]): HeatmapDay[] {
  return [...calendar].sort((a, b) => a.date.localeCompare(b.date));
}

function trailingCalendarDays(calendar: HeatmapDay[], limit: number): HeatmapDay[] {
  return sortCalendar(calendar).slice(-limit);
}

function buildCommitPulse(calendar: HeatmapDay[], range: GitHubCommitPulseRange): GitHubCommitPulse {
  const points = trailingCalendarDays(calendar, DAYS_BY_RANGE[range]).map(({ date, count }) => ({ date, count }));

  return {
    total: sumCounts(points),
    range,
    points,
  };
}

function buildCommitStreak(calendar: HeatmapDay[]): GitHubCommitStreak {
  const sortedCalendar = sortCalendar(calendar);
  const days = sortedCalendar.slice(-GITHUB_STREAK_DAYS).map(({ date, count }) => ({ date, count }));
  let current = 0;
  let longest = 0;
  let activeRun = 0;

  for (let index = sortedCalendar.length - 1; index >= 0; index -= 1) {
    if (sortedCalendar[index].count <= 0) break;
    current += 1;
  }

  sortedCalendar.forEach((day) => {
    if (day.count > 0) {
      activeRun += 1;
      longest = Math.max(longest, activeRun);
      return;
    }

    activeRun = 0;
  });

  return {
    current,
    longest,
    days,
  };
}

function sortLanguages(languages: GitHubLanguage[]): GitHubLanguage[] {
  return [...languages].sort((a, b) => b.percentage - a.percentage);
}

function sortTechStack(techStack: GitHubTechStackItem[]): GitHubTechStackItem[] {
  return [...techStack].sort((a, b) => b.weight - a.weight);
}

export function getGitHubStats(): GitHubStats {
  const contributionCalendar = sortCalendar(githubHeatmap);

  return {
    username: GITHUB_USERNAME,
    source: 'mock',
    totalContributions: sumCounts(contributionCalendar),
    contributionCalendar,
    commitPulse: buildCommitPulse(contributionCalendar, GITHUB_COMMIT_PULSE_RANGE),
    languages: sortLanguages(MOCK_LANGUAGES).slice(0, GITHUB_LANGUAGE_LIMIT),
    techStack: sortTechStack(MANUAL_TECH_STACK),
    latestActivity: MOCK_LATEST_ACTIVITY.slice(0, GITHUB_ACTIVITY_LIMIT),
    commitStreak: buildCommitStreak(contributionCalendar),
  };
}

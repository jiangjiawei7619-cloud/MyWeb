export type HeatmapDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type TechNote = {
  id: string;
  title: string;
  summary: string;
  content?: string;
  tags: string[];
  date: string;
  readTime: string;
  cover?: string;
  featured?: boolean;
};

export type DailyLog = {
  id: string;
  date: string;
  title: string;
  summary: string;
  content?: string;
};

export const blogApiEndpoints = {
  githubContributions: '/api/github-contributions',
  leetcodeCalendar: '/api/leetcode-calendar',
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const HEATMAP_START_UTC = Date.UTC(2025, 11, 8);
const HEATMAP_DAYS = 183;

function formatDateUTC(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function levelFromCount(count: number, thresholds: [number, number, number]): HeatmapDay['level'] {
  if (count <= 0) return 0;
  if (count <= thresholds[0]) return 1;
  if (count <= thresholds[1]) return 2;
  if (count <= thresholds[2]) return 3;
  return 4;
}

function makeHeatmap(kind: 'leetcode' | 'github'): HeatmapDay[] {
  const seed = kind === 'leetcode' ? 7 : 19;
  const thresholds: [number, number, number] = kind === 'leetcode' ? [1, 3, 5] : [2, 5, 9];

  return Array.from({ length: HEATMAP_DAYS }, (_, index) => {
    const timestamp = HEATMAP_START_UTC + index * DAY_MS;
    const weekday = new Date(timestamp).getUTCDay();
    const wave = Math.abs(Math.sin((index + seed) * 0.37) + Math.cos((index + seed) * 0.13));
    const burst = (index + seed) % (kind === 'leetcode' ? 17 : 23) === 0 ? 3 : 0;
    const weekendBoost = weekday === 0 || weekday === 6 ? (kind === 'leetcode' ? 1 : 0) : 0;
    const quietDay = (index + seed) % (kind === 'leetcode' ? 13 : 11) === 0;
    const base = kind === 'leetcode' ? wave * 2.8 + weekendBoost + burst : wave * 4.6 + burst;
    const count = quietDay ? 0 : Math.max(1, Math.round(base));

    return {
      date: formatDateUTC(timestamp),
      count,
      level: levelFromCount(count, thresholds),
    };
  });
}

export const techNotes: TechNote[] = [
  {
    id: 'webgl-cyber-architecture',
    title: 'Cyber-Architecture in WebGL',
    summary:
      'Analyzing spatial rendering pipelines for non-euclidean digital environments, from city depth to shader-driven facade systems.',
    content:
      'A field note on building readable cyber-city depth: instanced geometry, layered material passes, reflection budgets, and camera pacing that keeps dense scenes legible.',
    tags: ['WEBGL', 'SHADERS', 'MATRIX', 'R3F'],
    date: '2026-05-14',
    readTime: '18 min read',
    cover: '/textures/neon-posters/poster_09.png',
    featured: true,
  },
  {
    id: 'terminal-overrides',
    title: 'Terminal Overrides and UI Injection',
    summary:
      'Redacted protocol for bypassing standard component libraries to enforce brutalist interface patterns without losing usability.',
    content:
      'This note tracks a reusable HUD recipe: small type, hard alignment, glow that reacts only on intent, and command surfaces that feel hostile but remain predictable.',
    tags: ['TERMINAL', 'UI/UX', 'WEB'],
    date: '2026-05-10',
    readTime: '12 min read',
    cover: '/textures/neon-posters/poster_06.png',
  },
  {
    id: 'postprocess-breakdown',
    title: 'Fragmented Reality: Postprocess Breakdown',
    summary:
      'Exploring glitch, chromatic aberration, noise fields, and feedback loops for controlled visual corruption.',
    content:
      'The useful trick is restraint: split channels for emphasis, keep noise below the reading threshold, and let animation enter only during state transitions.',
    tags: ['POSTPROCESS', 'GLSL', 'EFFECTS'],
    date: '2026-05-08',
    readTime: '9 min read',
    cover: '/textures/gipsy-danger-poster.png',
  },
  {
    id: 'vector-search-notes',
    title: 'Vector Databases for Creative Search',
    summary:
      'Building semantic search systems for design references, code snippets, and personal research archives.',
    content:
      'Chunking strategy matters more than the brand of database. Keep metadata rich, score recency separately, and expose source traces beside answers.',
    tags: ['VECTOR DB', 'AI', 'SEARCH'],
    date: '2026-05-05',
    readTime: '11 min read',
    cover: '/textures/rebecca-hologram.png',
  },
];

export const dailyLogs: DailyLog[] = [
  {
    id: 'daily-old-scifi',
    date: '2026-06-08',
    title: 'Found inspiration in old sci-fi again',
    summary: 'Blade Runner ambience, neon rain, and cities that feel alive. Fuel for new environment experiments.',
    content:
      'Collected frame references, noted lighting ratios, and sketched a few ideas for making background architecture feel inhabited without adding visual clutter.',
  },
  {
    id: 'daily-run-idea-dump',
    date: '2026-06-07',
    title: 'Morning run plus idea dump',
    summary: 'Best ideas hit between kilometer five and seven. Jotted down concepts for generative city layouts.',
    content:
      'The strongest idea was a route-aware city generator where buildings lean toward the camera path instead of simply filling a grid.',
  },
  {
    id: 'daily-three-scene-graph',
    date: '2026-06-06',
    title: 'Refactored three.js scene graph',
    summary: 'Cleaner structure, better performance, and fewer invisible state leaks. Always satisfying.',
    content:
      'Pulled effect layers away from content nodes and tightened the ownership boundary between camera state, city geometry, and postprocessing.',
  },
  {
    id: 'daily-reading-mode',
    date: '2026-06-04',
    title: 'Reading mode should feel quieter',
    summary: 'High intensity UI is fun, but long-form reading needs a lower pulse.',
    content:
      'Kept the cyber shell, reduced background interference, and wrote down rules for when animation should step aside for comprehension.',
  },
];

export const leetcodeHeatmap: HeatmapDay[] = makeHeatmap('leetcode');
export const githubHeatmap: HeatmapDay[] = makeHeatmap('github');

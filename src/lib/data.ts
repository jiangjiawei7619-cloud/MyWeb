import { ProjectWork, SystemLog } from './types';
import { BLOG_POSTS } from './blogs';

export const INITIAL_PROJECTS: ProjectWork[] = [
  {
    id: 'clonex',
    title: 'Clonex',
    japaneseTitle: 'クローンエックス',
    subtitle: 'Nxt / Prev',
    ref: 'REF_001',
    date: '2026.05.15',
    description: 'NEXT PHASE: REVEAL. STAY TUNED. A state-of-the-art WebGL identity incubator mapping physical bodies into digital cyberware.',
    imgUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop',
    techStack: ['WebGL', 'GLSL', 'Vite', 'ThreeJS'],
    visitUrl: 'https://clone.smsy.co',
    infosUrl: 'https://info.smsy.co'
  },
  {
    id: 'webgpu-core',
    title: 'WebGPU Core',
    japaneseTitle: 'WebGPU コア機能',
    subtitle: 'High performance rasterizer',
    ref: 'REF_002',
    date: '2026.04.30',
    description: 'A pure rust-to-wasm GPU rasterization pipeline running directly inside the browser using modern WGSL computing shaders.',
    imgUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
    techStack: ['WebGPU', 'Rust', 'WASM', 'WGSL'],
    visitUrl: 'https://gpu.smsy.co',
    infosUrl: 'https://info.smsy.co'
  },
  {
    id: 'matrix-shader',
    title: 'Cyber Grid',
    japaneseTitle: 'サイバー・グリッド',
    subtitle: 'Dynamic rendering canvas',
    ref: 'REF_003',
    date: '2026.03.12',
    description: 'An expansive interactive coordinate lattice tracking particle clusters on high frequency canvas drawing planes.',
    imgUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop',
    techStack: ['Canvas2D', 'Sora', 'Tailwind', 'Motion'],
    visitUrl: 'https://grid.smsy.co',
    infosUrl: 'https://info.smsy.co'
  }
];

/**
 * Blogs 页面实际消费的列表（兼容现有组件字段）。
 * 内容来源：`src/lib/blogs.ts`（推荐仅在那边录入/维护）。
 */
export const INITIAL_LOGS: SystemLog[] = BLOG_POSTS.map((post, index) => ({
  id: post.id,
  ref: post.tag ?? `REF_${String(100 + index).padStart(3, '0')}`,
  date: post.publishedAt,
  title: post.title,
  japaneseTitle: post.subtitle,
  description: post.intro,
  body: post.body,
  imgUrl: post.imageUrl,
  tag: post.tag ?? 'STABLE_COMPILED',
  isActiveTrace: post.isActiveTrace,
}));

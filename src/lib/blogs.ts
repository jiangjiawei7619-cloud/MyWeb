import { BlogPost } from './types';

/**
 * 这里是 Blogs 页的唯一内容入口。
 *
 * 录入规范（按字段填）：
 * - `imageUrl`: 写封面图片 URL
 * - `title`: 写卡片标题
 * - `intro`: 写卡片简介（短文案）
 * - `body`: 写文章正文（长文案，可多段）
 *
 * 其他辅助字段：
 * - `publishedAt`: 发布时间
 * - `subtitle`: 副标题（可选）
 * - `tag`: 状态标签（可选）
 * - `isActiveTrace`: 是否高亮（可选）
 */
export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'blog-01',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop',
    title: 'Cyber-Architecture in WebGL',
    subtitle: 'WebGLサイバー建築構造学',
    publishedAt: '2026.04.12::14:02:00',
    intro:
      'Analyzing the spatial rendering pipelines required to construct non-euclidean digital environments. Shader optimization techniques detailed within.',
    body:
      '本文聚焦在 WebGL 场景中如何构建可扩展的赛博建筑系统：包括实例化网格策略、层级材质组织、以及在中低端设备上保持帧率稳定的着色器裁剪方案。我们同时对城市纵深、雾效密度与发光阈值做了联动调参，让视觉风格统一且具有空间节奏。',
    tag: 'STABLE_COMPILED',
  },
  {
    id: 'blog-02',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
    title: 'The Art of the Glitch',
    subtitle: 'グリッチの美学概論',
    publishedAt: '2026.04.09::08:44:12',
    intro:
      'Harnessing framebuffer feedback loops to generate controlled visual chaos. Aesthetic applications of data corruption.',
    body:
      '本篇记录了故障艺术（Glitch）在实时图形中的可控实现路径：通过反馈缓冲、时控实现路径：通过反馈缓冲、时控实现路径：通过反馈缓冲、时控实现路径：通过反馈缓冲、时控实现路径：通过反馈缓冲、时控实现路径：通过反馈缓冲、时控实现路径：通过反馈缓冲、时控实现路径：通过反馈缓冲、时控实现路径：通过反馈缓冲、时控实现路径：通过反馈缓冲、时域扰动和分层通道错位，制造“失真但可读”的视觉语言。重点在于控制强度曲线，避免只剩噪声而失去信息表达。',
    tag: 'DEVIATION_DETECTED',
  },
  {
    id: 'blog-03',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop',
    title: 'Terminal Overrides & UI Injection',
    subtitle: '端末介入とUIインジェクション',
    publishedAt: '2026.04.02::23:59:59',
    intro:
      '[REDACTED] Protocol for bypassing standard component libraries to enforce brutalist interface paradigms.',
    body:
      '这篇文章总结了终端式交互在现代前端中的收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾总结了终端式交互在现代前端中的收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收总结了终端式交互在现代前端中的收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收总结了终端式交互在现代前端中的收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收总结了终端式交互在现代前端中的收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾收拾试试落地方式：包括如何在不破坏可访问性的前提下，实现强风格化视觉层、交互音效层和状态叠加层。并给出了“沉浸感”与“可用性”之间的平衡策略。',
    tag: 'ACTIVE_TRACE',
    isActiveTrace: true,
  },
];

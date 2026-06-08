export type ActivePage = 'EXPLORE' | 'WORKS' | 'ABOUT' | 'LOGS';

export interface ProjectWork {
  id: string;
  title: string;
  japaneseTitle?: string;
  subtitle: string;
  ref: string;
  date: string;
  description: string;
  imgUrl: string;
  visitUrl?: string;
  infosUrl?: string;
  techStack: string[];
}

export interface SystemLog {
  id: string;
  ref: string;
  date: string;
  title: string;
  japaneseTitle?: string;
  description: string;
  body?: string;
  imgUrl: string;
  tag: string;
  isActiveTrace?: boolean;
}

/**
 * Blogs 页的结构化录入模型（建议仅在 `src/lib/blogs.ts` 中维护）。
 */
export interface BlogPost {
  /** 唯一 ID（建议英文短横线命名）。 */
  id: string;
  /** 封面图 URL（支持本地 / 网络地址）。 */
  imageUrl: string;
  /** 标题（卡片主标题）。 */
  title: string;
  /** 副标题（可选，会作为日文/副标题展示位）。 */
  subtitle?: string;
  /** 发布日期（建议格式：YYYY.MM.DD::HH:mm:ss）。 */
  publishedAt: string;
  /** 简介（卡片上的简短说明）。 */
  intro: string;
  /** 正文（点击卡片弹窗里展示的详细内容）。 */
  body: string;
  /** 状态标签（用于视觉状态，如 STABLE_COMPILED）。 */
  tag?: string;
  /** 是否高亮为活动追踪状态。 */
  isActiveTrace?: boolean;
}

export interface Coordinates {
  x: number;
  y: number;
}

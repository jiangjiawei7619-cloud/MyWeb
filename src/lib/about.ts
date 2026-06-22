/** About 页简介 — 直接改下面的文案即可 */

export const ABOUT_ROLE_TITLE = 'Backend Software Engineer (Java / Go)';

export const ABOUT_INTRO_PARAGRAPHS = [
  'Results-driven Backend Engineer with 2 years of experience building scalable, high-performance distributed systems. Possess a hybrid skill set combining deep expertise in the Java ecosystem (Spring Boot/Cloud) with the efficiency of Go (Gin) for cloud-native development.',
  'Proficient in designing microservice architectures, optimizing MySQL performance (Indexing & Sharding), and implementing robust caching strategies with Redis. Experienced in message-driven systems using Kafka/RabbitMQ and containerized deployments via Docker/K8s. Adept at translating complex business requirements into stable, maintainable code with a strong focus on system reliability and low-latency optimization.',
] as const;

/** 简介区 LinkedIn — 改成你的个人主页 URL */
export const ABOUT_LINKEDIN_URL = 'https://www.linkedin.com/in/javin-jiang-62697b3a5/';
export const ABOUT_WECHAT_QR_SRC = '/wechat-qr.jpg';

/** About 页右侧社交链接 — 直接改下面的 href 即可 */

export interface AboutSocialLink {
  label: string;
  /** 完整 URL；Wechat 可填微信号页面、二维码图片链接或留空 */
  href: string;
}

export const ABOUT_SOCIAL_LINKS: AboutSocialLink[] = [
  {
    label: 'LinkedIn',
    href: ABOUT_LINKEDIN_URL,
  },
  {
    label: 'X',
    href: 'https://x.com/',
  },
  {
    label: 'Wechat',
    href: '',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/',
  },
];

export const ABOUT_CONTACT_EMAIL = 'jiangjiawei7619@gmail.com';

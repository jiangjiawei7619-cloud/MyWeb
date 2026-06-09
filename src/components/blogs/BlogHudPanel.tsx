import type { ReactNode } from 'react';

type BlogHudPanelProps = {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  variant?: 'red' | 'cyan' | 'violet';
};

export default function BlogHudPanel({
  children,
  className = '',
  header,
  variant = 'cyan',
}: BlogHudPanelProps) {
  return (
    <section className={`blog-hud-panel blog-hud-panel--${variant} ${className}`}>
      <span className="blog-hud-corner blog-hud-corner--tl" aria-hidden />
      <span className="blog-hud-corner blog-hud-corner--tr" aria-hidden />
      <span className="blog-hud-corner blog-hud-corner--bl" aria-hidden />
      <span className="blog-hud-corner blog-hud-corner--br" aria-hidden />
      {header && <div className="relative z-10 mb-4">{header}</div>}
      <div className="relative z-10">{children}</div>
    </section>
  );
}

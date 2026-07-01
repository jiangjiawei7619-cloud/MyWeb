import { type ReactNode } from 'react';

type BlogHudPanelProps = {
  children: ReactNode;
  className?: string;
  entryAnimation?: boolean;
  entryKey?: number | string;
  header?: ReactNode;
  variant?: 'red' | 'cyan' | 'violet';
};

export default function BlogHudPanel({
  children,
  className = '',
  entryAnimation = false,
  entryKey,
  header,
  variant = 'cyan',
}: BlogHudPanelProps) {
  const entryClasses = entryAnimation ? 'hud-matrix-panel is-entering' : '';
  const panelKey = entryAnimation ? `hud-entry-${String(entryKey ?? 'static')}` : undefined;

  return (
    <section key={panelKey} className={`blog-hud-panel blog-hud-panel--${variant} ${entryClasses} ${className}`}>
      {entryAnimation && <span className="hud-frame-reveal-layer" aria-hidden />}
      <span className="blog-hud-corner blog-hud-corner--tl" aria-hidden />
      <span className="blog-hud-corner blog-hud-corner--tr" aria-hidden />
      <span className="blog-hud-corner blog-hud-corner--bl" aria-hidden />
      <span className="blog-hud-corner blog-hud-corner--br" aria-hidden />
      {header && <div className="relative z-10 mb-4">{header}</div>}
      <div className="relative z-10">{children}</div>
    </section>
  );
}

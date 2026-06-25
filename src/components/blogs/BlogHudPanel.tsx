import { useEffect, useState, type ReactNode } from 'react';

const HUD_ENTRY_SETTLE_MS = 760;

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
  const [entryIdle, setEntryIdle] = useState(!entryAnimation);

  useEffect(() => {
    if (!entryAnimation) {
      setEntryIdle(true);
      return;
    }

    setEntryIdle(false);
    const entryTimer = window.setTimeout(() => setEntryIdle(true), HUD_ENTRY_SETTLE_MS);

    return () => window.clearTimeout(entryTimer);
  }, [entryAnimation, entryKey]);

  const entryClasses = entryAnimation ? `hud-matrix-panel is-entering ${entryIdle ? 'is-idle' : ''}` : '';

  return (
    <section className={`blog-hud-panel blog-hud-panel--${variant} ${entryClasses} ${className}`}>
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

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

type CyberTextRevealProps = {
  text: string;
  active?: boolean;
  as?: 'div' | 'p';
  delayBaseMs?: number;
  className?: string;
};

function splitRevealSegments(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

const REVEAL_ANIMATION_MS = 954;
const REVEAL_LINE_STAGGER_MS = 129;

export default function CyberTextReveal({
  text,
  active = true,
  as: Tag = 'div',
  delayBaseMs = 0,
  className,
}: CyberTextRevealProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [playId, setPlayId] = useState(0);
  const [settled, setSettled] = useState(true);
  const words = useMemo(() => splitRevealSegments(text), [text]);
  const [lines, setLines] = useState<string[]>(() => [text]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const measure = () => {
      const wordNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal-measure-word]'));
      if (wordNodes.length === 0) {
        setLines([text]);
        return;
      }

      const grouped: string[][] = [];
      let currentTop: number | null = null;
      wordNodes.forEach((node) => {
        const top = Math.round(node.offsetTop);
        const word = node.dataset.word ?? '';
        if (currentTop === null || Math.abs(top - currentTop) > 2) {
          grouped.push([word]);
          currentTop = top;
          return;
        }
        grouped[grouped.length - 1].push(word);
      });

      const nextLines = grouped.map((group) => group.join(' ')).filter(Boolean);
      setLines(nextLines.length > 0 ? nextLines : [text]);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [text, words]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active || !isVisible) return;
    setPlayId((value) => value + 1);
    setSettled(false);
    const duration = delayBaseMs + REVEAL_ANIMATION_MS + lines.length * REVEAL_LINE_STAGGER_MS;
    const timeout = window.setTimeout(() => setSettled(true), duration);
    return () => window.clearTimeout(timeout);
  }, [active, delayBaseMs, isVisible, lines.length, text]);

  return (
    <Tag
      ref={rootRef as never}
      className={`${className ?? ''} cyber-text-reveal${settled ? ' cyber-text-reveal--settled' : ''}`}
      aria-label={text}
    >
      <span className="cyber-text-reveal-measure" aria-hidden="true">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} data-reveal-measure-word data-word={word}>
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>

      {lines.map((line, index) => (
        <span
          key={`${playId}-${index}-${line}`}
          className="cyber-text-reveal-line"
          style={{ '--reveal-delay': `${delayBaseMs + index * REVEAL_LINE_STAGGER_MS}ms` } as CSSProperties}
          aria-hidden="true"
        >
          <span className="cyber-text-reveal-copy">
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}

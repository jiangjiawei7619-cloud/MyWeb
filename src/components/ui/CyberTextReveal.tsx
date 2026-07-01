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

function linesKey(lines: string[]) {
  return lines.join('\n');
}

function measureLines(root: HTMLElement, text: string) {
  const wordNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal-measure-word]'));
  if (wordNodes.length === 0) return [text];

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
  return nextLines.length > 0 ? nextLines : [text];
}

export default function CyberTextReveal({
  text,
  active = true,
  as: Tag = 'div',
  delayBaseMs = 0,
  className,
}: CyberTextRevealProps) {
  const rootRef = useRef<HTMLElement>(null);
  const linesRef = useRef<string[]>([]);
  const measureFrameRef = useRef<number | null>(null);
  const hasPlayedRef = useRef(false);
  const settledRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasured, setIsMeasured] = useState(false);
  const [playId, setPlayId] = useState(0);
  const [settled, setSettled] = useState(true);
  const words = useMemo(() => splitRevealSegments(text), [text]);
  const [lines, setLines] = useState<string[]>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const applyLines = (nextLines: string[]) => {
      const normalized = nextLines.length > 0 ? nextLines : [text];
      if (linesKey(normalized) === linesKey(linesRef.current)) return false;
      linesRef.current = normalized;
      setLines(normalized);
      return true;
    };

    const measure = (markReady: boolean) => {
      if (settledRef.current) return;
      const changed = applyLines(measureLines(root, text));
      if (markReady || changed) {
        setIsMeasured(true);
      }
    };

    const scheduleMeasure = () => {
      if (settledRef.current) return;
      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
      }
      measureFrameRef.current = window.requestAnimationFrame(() => {
        measureFrameRef.current = null;
        measure(false);
      });
    };

    measure(true);

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(root);

    return () => {
      observer.disconnect();
      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
        measureFrameRef.current = null;
      }
    };
  }, [text, words]);

  useEffect(() => {
    hasPlayedRef.current = false;
    settledRef.current = false;
    linesRef.current = [];
    setLines([]);
    setIsMeasured(false);
    setSettled(true);
    setIsVisible(false);
  }, [text]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      setIsMeasured(true);
      setSettled(true);
      settledRef.current = true;
      linesRef.current = [text];
      setLines([text]);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [text]);

  useEffect(() => {
    if (!active || !isVisible || !isMeasured || hasPlayedRef.current) return undefined;

    hasPlayedRef.current = true;
    setPlayId((value) => value + 1);
    setSettled(false);
    settledRef.current = false;

    const duration =
      delayBaseMs + REVEAL_ANIMATION_MS + linesRef.current.length * REVEAL_LINE_STAGGER_MS;
    const timeout = window.setTimeout(() => {
      settledRef.current = true;
      setSettled(true);
    }, duration);

    return () => window.clearTimeout(timeout);
  }, [active, delayBaseMs, isMeasured, isVisible, text]);

  const readyToReveal = isMeasured && isVisible;

  return (
    <Tag
      ref={rootRef as never}
      className={`${className ?? ''} cyber-text-reveal${settled ? ' cyber-text-reveal--settled' : ''}${readyToReveal ? ' cyber-text-reveal--ready' : ''}`}
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

      {isMeasured &&
        lines.map((line, index) => (
          <span
            key={`${playId}-${index}-${line}`}
            className="cyber-text-reveal-line"
            style={
              {
                '--reveal-delay': readyToReveal
                  ? `${delayBaseMs + index * REVEAL_LINE_STAGGER_MS}ms`
                  : '0ms',
              } as CSSProperties
            }
            aria-hidden="true"
          >
            <span className="cyber-text-reveal-copy">{line}</span>
          </span>
        ))}
    </Tag>
  );
}

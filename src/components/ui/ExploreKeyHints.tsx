import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';

interface ExploreKeyHintsProps {
  visible: boolean;
}

/** 进入 EXPLORE 后稍晚再播按键闪动 */
const BOOT_DELAY_MS = 420;

function KeyLetter({ letter }: { letter: string }) {
  return <span className="text-[10px] leading-none">{letter}</span>;
}

function KeyCap({
  children,
  wide,
  boot,
  delayMs = 0,
}: {
  children: React.ReactNode;
  wide?: boolean;
  boot: boolean;
  delayMs?: number;
}) {
  return (
    <div
      className={
        'explore-key-cap flex items-center justify-center rounded-md bg-[#ff5357] font-bold text-black ' +
        'shadow-[0_0_10px_rgba(255,83,87,0.45)] ' +
        (wide ? 'h-7 min-w-[4rem] px-2.5 text-[9px] tracking-[0.2em] ' : 'h-7 w-7 ') +
        (boot ? 'explore-key-cap--boot' : '')
      }
      style={boot ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function HintLabel({
  children,
  boot,
  delayMs = 0,
  className = '',
}: {
  children: React.ReactNode;
  boot: boolean;
  delayMs?: number;
  className?: string;
}) {
  return (
    <span
      className={
        'explore-key-label font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#ff5357] leading-none ' +
        (boot ? 'explore-key-label--boot' : '') +
        (className ? ` ${className}` : '')
      }
      style={boot ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </span>
  );
}

export default function ExploreKeyHints({ visible }: ExploreKeyHintsProps) {
  const [boot, setBoot] = useState(false);

  useEffect(() => {
    if (!visible) {
      setBoot(false);
      return;
    }

    const timer = window.setTimeout(() => setBoot(true), BOOT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <div
          key="explore-key-hints"
          className={
            'pointer-events-none select-none hidden lg:flex flex-col items-end ' +
            'md:absolute md:right-10 md:top-[4.35rem] z-[58]'
          }
          aria-hidden
        >
          <div className="flex items-start gap-2.5">
            <div className="flex flex-col items-center gap-1">
              <div className="grid grid-cols-3 gap-0.5">
                <div className="h-7 w-7" />
                <KeyCap boot={boot} delayMs={0}>
                  <KeyLetter letter="W" />
                </KeyCap>
                <div className="h-7 w-7" />
                <KeyCap boot={boot} delayMs={70}>
                  <KeyLetter letter="A" />
                </KeyCap>
                <KeyCap boot={boot} delayMs={130}>
                  <KeyLetter letter="S" />
                </KeyCap>
                <KeyCap boot={boot} delayMs={190}>
                  <KeyLetter letter="D" />
                </KeyCap>
              </div>

              <div
                className={
                  'explore-key-hints-connector w-px h-[0.5rem] border-l border-dashed border-[#ff5357]/45 ' +
                  (boot ? 'explore-key-hints-connector--boot' : '')
                }
                style={boot ? { animationDelay: '260ms' } : undefined}
                aria-hidden
              />

              <KeyCap boot={boot} delayMs={320} wide>
                SPACE
              </KeyCap>
            </div>

            <div className="flex flex-col justify-between h-[5.85rem] py-0.5">
              <HintLabel boot={boot} delayMs={90} className="pt-1.5">
                CONTROL
              </HintLabel>
              <HintLabel boot={boot} delayMs={380} className="pb-0.5">
                JUMP
              </HintLabel>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

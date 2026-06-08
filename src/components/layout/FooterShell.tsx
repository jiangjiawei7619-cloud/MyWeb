import { useState, useEffect, useRef } from 'react';
import {
  startAmbientBackground,
  stopAmbientBackground,
  getAmbientStatus,
  subscribeAmbientStatus,
} from '@/utils/audio';

interface FooterShellProps {
  onPrev?: () => void;
  onNext?: () => void;
  hidePageNav?: boolean;
}

export default function FooterShell({ onPrev, onNext, hidePageNav = false }: FooterShellProps) {
  const [isSoundOn, setIsSoundOn] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    return subscribeAmbientStatus((playing) => {
      setIsSoundOn(playing);
      if (playing) hasStarted.current = true;
    });
  }, []);

  const handleToggleSound = () => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      startAmbientBackground();
      return;
    }

    if (getAmbientStatus()) {
      stopAmbientBackground();
    } else {
      startAmbientBackground();
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 w-full p-6 md:p-10 flex flex-col md:flex-row justify-between items-end gap-4 z-[60] pointer-events-none select-none">

      {/* Keyboard transition hints - Hidden on mobile, visible on medium+ screens */}
      <div
        className={`hidden md:flex items-center gap-3.5 pointer-events-auto select-none font-sans transition-all duration-300 ${
          hidePageNav ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100'
        }`}
      >
        <div className="flex gap-2">
          {/* Left Arrow Key Cap */}
          <button
            onClick={onPrev}
            aria-label="Previous Page"
            className="w-8 h-8 bg-[#ff5357] rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(255,83,87,0.4)] active:scale-90 hover:brightness-110 transition-all cursor-pointer outline-none border-none"
          >
            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-black fill-current">
              <polygon points="17,5 8,12 17,19" />
            </svg>
          </button>

          {/* Right Arrow Key Cap */}
          <button
            onClick={onNext}
            aria-label="Next Page"
            className="w-8 h-8 bg-[#ff5357] rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(255,83,87,0.4)] active:scale-90 hover:brightness-110 transition-all cursor-pointer outline-none border-none"
          >
            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-black fill-current">
              <polygon points="7,5 16,12 7,19" />
            </svg>
          </button>
        </div>

        <span className="text-[#ff5357] font-bold text-[13px] md:text-sm tracking-wide font-space leading-none uppercase">
          Nxt / Prev.
        </span>
      </div>

      {/* Cyberpunk BG Sound status toggle button - Visible and sticky on all devices */}
      <div className="flex items-center gap-3.5 pointer-events-auto select-none font-sans ml-auto">
        <span className={`font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-[#ffb3af] transition-opacity duration-300 ${isSoundOn ? 'opacity-100 animate-pulse' : 'opacity-40'}`}>
          {isSoundOn ? 'SOUND_SYS: ACTIVE' : 'SOUND_SYS: MUTED'}
        </span>
        <button
          onClick={handleToggleSound}
          aria-label="Toggle Background Hum"
          className={`w-9 h-9 md:w-11 md:h-11 rounded-lg flex items-center justify-center transition-all cursor-pointer outline-none border-none ${
            isSoundOn
              ? 'bg-[#ff5357] text-black shadow-[0_0_15px_rgba(255,83,87,0.6)] hover:brightness-110 active:scale-90'
              : 'bg-neutral-900 text-[#ffb3af]/70 border border-white/10 hover:border-[#ff5357]/45 active:scale-95'
          }`}
        >
          <div className="flex items-end justify-center gap-[3px] h-4 w-5">
            <span className={`w-[2.5px] rounded-full bg-current sound-bar h-4 ${isSoundOn ? 'sound-bar-1' : 'scale-y-[0.25]'}`}></span>
            <span className={`w-[2.5px] rounded-full bg-current sound-bar h-4 ${isSoundOn ? 'sound-bar-2' : 'scale-y-[0.25]'}`}></span>
            <span className={`w-[2.5px] rounded-full bg-current sound-bar h-4 ${isSoundOn ? 'sound-bar-3' : 'scale-y-[0.25]'}`}></span>
            <span className={`w-[2.5px] rounded-full bg-current sound-bar h-4 ${isSoundOn ? 'sound-bar-4' : 'scale-y-[0.25]'}`}></span>
          </div>
        </button>
      </div>

    </footer>
  );
}

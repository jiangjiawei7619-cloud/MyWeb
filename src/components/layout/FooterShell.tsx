import { useState, useEffect, useRef, type CSSProperties } from 'react';
import {
  startAmbientBackground,
  stopAmbientBackground,
  getAmbientStatus,
  subscribeAmbientStatus,
} from '@/utils/audio';
import {
  ABOUT_SOCIAL_LINKS,
  ABOUT_WECHAT_QR_SRC,
} from '@/lib/about';

interface FooterShellProps {
  onPrev?: () => void;
  onNext?: () => void;
  hidePageNav?: boolean;
  showAboutSocial?: boolean;
}

const QR_PIXEL_COUNT = 100;
const QR_PIXEL_DELAYS = Array.from({ length: QR_PIXEL_COUNT }, (_, index) => {
  const row = Math.floor(index / 10);
  const col = index % 10;
  const diagonal = (row + col) / 18;
  const noise = ((index * 37) % QR_PIXEL_COUNT) / (QR_PIXEL_COUNT - 1);
  const rank = Math.min(1, Math.max(0, noise * 0.74 + diagonal * 0.26));
  return Math.round(35 + Math.pow(rank, 2.15) * 430);
});

function renderAboutSocialLinks() {
  return ABOUT_SOCIAL_LINKS.map((link) => {
    const hasHref = link.href.trim().length > 0;
    const isWechat = link.label.toLowerCase() === 'wechat';
    const className =
      'about-social-link ' +
      (hasHref || isWechat
        ? 'about-social-link--active text-[#ff5357] cursor-pointer'
        : 'about-social-link--disabled text-[#ffb3af]/40 cursor-default pointer-events-none');

    if (isWechat) {
      return (
        <span
          key={link.label}
          className="about-social-trigger about-social-trigger--wechat relative inline-flex flex-col items-center outline-none"
          tabIndex={0}
        >
          <span className="about-social-intro-frame">
            <span className={className}>{link.label}</span>
          </span>
          <span className="about-social-qr about-social-qr--footer pointer-events-none absolute z-50 w-36 rounded border border-[#ff5357]/50 bg-black/90 p-2 opacity-0 shadow-[0_0_24px_rgba(255,83,87,0.35)] transition duration-200">
            <span className="about-social-qr-frame" aria-hidden="true" />
            <img
              src={ABOUT_WECHAT_QR_SRC}
              alt="Wechat QR code"
              className="block aspect-square w-full rounded-sm bg-white object-cover"
              loading="lazy"
            />
            <span className="about-social-qr-pixels" aria-hidden="true">
              {QR_PIXEL_DELAYS.map((delay, index) => (
                <span
                  key={index}
                  style={{ '--qr-pixel-delay': `${delay}ms` } as CSSProperties}
                />
              ))}
            </span>
          </span>
        </span>
      );
    }

    if (!hasHref) {
      return (
        <span key={link.label} className={className} title="Set href in src/lib/about.ts">
          {link.label}
        </span>
      );
    }

    return (
      <span key={link.label} className="about-social-trigger">
        <span className="about-social-intro-frame">
          <a href={link.href} target="_blank" rel="noreferrer" className={className}>
            {link.label}
          </a>
        </span>
      </span>
    );
  });
}

export default function FooterShell({
  onPrev,
  onNext,
  hidePageNav = false,
  showAboutSocial = false,
}: FooterShellProps) {
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

        {showAboutSocial && (
          <nav className="about-social-footer-nav about-social-nav--hover-ready flex flex-wrap items-center gap-x-6 gap-y-2 pl-4 font-mono text-[12px] md:text-[13px] uppercase tracking-[0.18em]">
            {renderAboutSocialLinks()}
          </nav>
        )}
      </div>

      {/* Cyberpunk BG Sound status toggle button - Visible and sticky on all devices */}
      <div className="flex items-center pointer-events-auto select-none font-sans ml-auto">
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

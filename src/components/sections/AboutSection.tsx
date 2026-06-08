import { useState } from 'react';
import GlitchTitle from '@/components/ui/GlitchTitle';
import TiltWrapper from '@/components/ui/TiltWrapper';
import {
  ABOUT_CONTACT_EMAIL,
  ABOUT_INTRO_PARAGRAPHS,
  ABOUT_LINKEDIN_URL,
  ABOUT_ROLE_TITLE,
  ABOUT_SOCIAL_LINKS,
} from '@/lib/about';

const socialLinkClass =
  'font-bold text-[15px] md:text-base uppercase tracking-[0.14em] underline underline-offset-[6px] decoration-2 transition-colors duration-300';
const socialLinkActive =
  `${socialLinkClass} text-[#ff5357] decoration-[#ff5357]/80 hover:text-[#ffb3af] hover:decoration-[#ffb3af] cursor-pointer`;
const socialLinkDisabled =
  `${socialLinkClass} text-[#ffb3af]/40 decoration-[#ffb3af]/25 cursor-default pointer-events-none`;

export default function AboutSection() {
  const [titleHoverTrigger, setTitleHoverTrigger] = useState(0);

  return (
    <div className="w-full max-w-5xl mx-auto min-h-[60vh] flex flex-col justify-start relative mt-4 md:mt-8 py-2 select-none">
      {/* 大标题不放进 TiltWrapper，避免 3D 倾斜 + 切页退出时产生上飘残影 */}
      <div className="mb-6 select-none relative z-30">
        <h2
          className="pointer-events-auto inline-block cursor-pointer"
          onMouseEnter={() => setTitleHoverTrigger((n) => n + 1)}
        >
          <GlitchTitle
            english="PROFILE"
            japanese="プロフィール"
            onHoverGlitch={false}
            autoGlitch={false}
            trigger={titleHoverTrigger > 0 ? titleHoverTrigger : false}
            className="text-5xl sm:text-7xl md:text-[140px] text-[#ffb3af] opacity-90 leading-none m-0 tracking-tighter uppercase font-extrabold pointer-events-none"
          />
        </h2>
        <p className="font-mono text-[10px] sm:text-xs text-[#ffb3af]/70 mt-2 tracking-[0.2em]">
          BACKEND ENGINEER // JAVA · GO · DISTRIBUTED SYSTEMS
        </p>
      </div>

      <TiltWrapper className="w-full flex flex-col flex-1">
        {/* Two Column Layout (Dual English & Japanese) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-start mt-4 max-w-6xl w-full tilt-layer-content">
          {/* Left Column — Profile intro */}
          <div className="md:col-span-6 space-y-6 font-mono text-[14px] md:text-[15px] text-[#ffb3af]/90 leading-relaxed">
            <p className="text-[#ff5357] font-bold text-[15px] md:text-base tracking-wide uppercase">
              {ABOUT_ROLE_TITLE}
            </p>
            {ABOUT_INTRO_PARAGRAPHS.map((paragraph, index) => (
              <p
                key={index}
                className="hover:text-white transition-colors duration-300"
              >
                {paragraph}
              </p>
            ))}
            <p className="hover:text-white transition-colors duration-300">
              Professional profile &amp; background on{' '}
              <a
                href={ABOUT_LINKEDIN_URL}
                target="_blank"
                rel="noreferrer"
                className={`${socialLinkActive} normal-case tracking-normal`}
              >
                LinkedIn
              </a>
              .
            </p>
          </div>

          {/* Right Column — Social links */}
          <div className="md:col-span-6 space-y-6 font-mono text-[14px] md:text-[15px] text-[#ffb3af]/80 leading-relaxed border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-10">
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[12px] md:text-[13px] uppercase tracking-[0.18em] select-none tilt-layer-deco">
              {ABOUT_SOCIAL_LINKS.map((link) => {
                const hasHref = link.href.trim().length > 0;
                const className =
                  'underline underline-offset-[5px] decoration-1 transition-colors duration-300 ' +
                  (hasHref
                    ? 'text-[#ff5357] decoration-[#ff5357]/70 hover:text-[#ffb3af] hover:decoration-[#ffb3af] cursor-pointer'
                    : 'text-[#ffb3af]/40 decoration-[#ffb3af]/25 cursor-default pointer-events-none');

                if (!hasHref) {
                  return (
                    <span key={link.label} className={className} title="在 src/lib/about.ts 填写 href">
                      {link.label}
                    </span>
                  );
                }

                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className={className}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer Meta Sections */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end gap-6 mt-16 pt-6 border-t border-white/5 w-full max-w-6xl">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto font-mono text-sm md:text-base uppercase tracking-widest text-[#ffb3af]">
            <a
              href={`mailto:${ABOUT_CONTACT_EMAIL}`}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-[#ff5357]/10 hover:bg-[#ff5357] hover:text-black border border-[#ff5357]/30 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(255,83,87,0.4)] rounded transition-all font-extrabold text-center"
            >
              <span>[MAIL_CONTACT]</span>
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3 bg-neutral-900 hover:bg-[#ff5357] hover:text-black border border-white/10 hover:border-transparent rounded transition-all font-extrabold text-center"
            >
              <span>[X_TWITTER]</span>
            </a>
            <a
              href={ABOUT_LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3 bg-neutral-900 hover:bg-[#ff5357] hover:text-black border border-white/10 hover:border-transparent rounded transition-all font-extrabold text-center"
            >
              <span>[LINKEDIN]</span>
            </a>
          </div>

          <div className="font-mono text-[10px] text-[#ffb3af]/60 text-left w-full md:max-w-sm space-y-1 bg-black/50 p-4 border border-white/10 rounded tilt-layer-deco">
            <div className="text-[#ff5357] uppercase font-bold text-[11px] tracking-wider mb-2">CREDITS:</div>
            <div>[Avatar model modified]</div>
            <div>[Interfaces help from Acolad]</div>
            <div>
              [Forever building cybercity with Julien]
              <span className="terminal-cursor"></span>
            </div>
          </div>
        </div>
      </TiltWrapper>
    </div>
  );
}

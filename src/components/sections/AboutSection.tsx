import { useState } from 'react';
import GlitchTitle from '@/components/ui/GlitchTitle';
import CyberTextReveal from '@/components/ui/CyberTextReveal';
import {
  ABOUT_INTRO_PARAGRAPHS,
  ABOUT_ROLE_TITLE,
} from '@/lib/about';

export default function AboutSection() {
  const [titleHoverTrigger, setTitleHoverTrigger] = useState(0);

  return (
    <div className="w-full min-h-[60vh] flex flex-col justify-start relative mt-0 md:mt-1 py-1 select-none">
      <div className="max-w-[1460px] w-full">
        <div className="mb-2 md:mb-3 select-none relative z-30">
          <div className="about-heading-cut about-heading-cut--title block w-fit origin-top-left scale-90">
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
                charSlotEm={0.82}
                charAlign="left"
                className="text-5xl sm:text-7xl md:text-[140px] text-[#ff5357] leading-none m-0 tracking-normal uppercase font-extrabold pointer-events-none"
              />
            </h2>
          </div>
        </div>

        <div className="w-full tilt-layer-content">
          <div className="mb-6 md:mb-8">
            <p className="text-[#ff5357] font-medium text-[15px] md:text-base tracking-wide uppercase font-mono md:max-w-[380px] shrink-0">
              <span className="about-heading-cut about-heading-cut--role">
                {ABOUT_ROLE_TITLE}
              </span>
            </p>
          </div>

          <div className="about-intro-columns-wrap">
            <div className="about-intro-columns">
              {ABOUT_INTRO_PARAGRAPHS.map((paragraph, index) => (
                <div key={index} className="min-w-0">
                  <CyberTextReveal
                    as="p"
                    text={paragraph}
                    delayBaseMs={index === 1 ? 1090 : 850}
                    className="font-mono text-[calc(12px*1.18)] md:text-[calc(13px*1.18)] font-normal text-[#ff5357] leading-[1.72] tracking-[0.035em] hover:text-white transition-colors duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

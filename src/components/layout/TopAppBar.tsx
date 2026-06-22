import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ActivePage } from '@/lib/types';
import GlitchTitle from '@/components/ui/GlitchTitle';
import ExploreKeyHints from '@/components/ui/ExploreKeyHints';

interface TopAppBarProps {
  currentPage: ActivePage;
  onPageChange: (page: ActivePage) => void;
  hideStatusReadout?: boolean;
  showExploreKeyHints?: boolean;
}

export default function TopAppBar({
  currentPage,
  onPageChange,
  hideStatusReadout = false,
  showExploreKeyHints = false,
}: TopAppBarProps) {
  const [fps, setFps] = useState(62);
  const [frameTime, setFrameTime] = useState(5.8);
  const [isChanging, setIsChanging] = useState(false);
  const [hoverTriggers, setHoverTriggers] = useState<Record<string, number>>({});

  const handleHoverItem = (key: string) => {
    setHoverTriggers((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
  };

  useEffect(() => {
    setIsChanging(true);
    const timeout = setTimeout(() => setIsChanging(false), 350);
    return () => clearTimeout(timeout);
  }, [currentPage]);

  // Fluctuating FPS to look super realistic and advanced!
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(Math.floor(58 + Math.random() * 8));
      setFrameTime(parseFloat((5.2 + Math.random() * 1.5).toFixed(1)));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (page: ActivePage) => {
    onPageChange(page);
  };

  return (
    <header className="fixed top-0 left-0 w-full p-6 md:p-10 z-[60] flex flex-col gap-4 md:block pointer-events-none select-none">
      {/* Brand & Subtitle */}
      <div className="flex flex-col items-start gap-1 pointer-events-auto md:max-w-[38vw]">
        <h1
          onClick={() => handleNavClick('EXPLORE')}
          onMouseEnter={() => handleHoverItem('LOGO')}
          className="cursor-pointer select-none"
        >
          <GlitchTitle
            english="Javin Jiang"
            japanese="創造技術"
            autoGlitch={false}
            onHoverGlitch={false}
            trigger={hoverTriggers['LOGO'] || false}
            charSlotEm={0.82}
            spaceSlotEm={0.28}
            className="text-3xl md:text-4xl font-extrabold text-[#ff5357] tracking-[-0.05em] uppercase"
          />
        </h1>
        <div className="hidden md:flex flex-col gap-0.5 text-[#ff5357]/70 font-mono text-[10px] mt-2 tracking-widest leading-normal uppercase">
          <span>クリエイティブテクノロジスト</span>
          <span>CREATIVE DEVELOPMENT & EXPERIENCE DESIGNER</span>
          <span>RAISED ON '90S CLASSICS</span>
        </div>
      </div>

      {/* Navigation Tabs — 绝对居中，避免左右栏宽度变化带动导航位移 */}
      <nav
        id="crt-nav"
        className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1 border border-white/5 rounded-full pointer-events-auto self-center md:absolute md:left-1/2 md:top-10 md:-translate-x-1/2 md:self-auto transition-colors"
      >
        {(['EXPLORE', 'WORKS', 'LOGS', 'ABOUT'] as ActivePage[]).map((page) => {
          const isActive = currentPage === page;

          const getEnglishPageName = (p: ActivePage) => {
            if (p === 'LOGS') return 'Blogs';
            return p;
          };

          const getJapanesePageName = (p: ActivePage) => {
            switch (p) {
              case 'EXPLORE': return '探索';
              case 'WORKS': return '作品';
              case 'ABOUT': return '経歴';
              case 'LOGS': return 'ブログ';
              default: return 'システム';
            }
          };

          const getButtonWidth = (p: ActivePage) => {
            switch (p) {
              case 'EXPLORE': return 'w-[96px] md:w-[124px]';
              case 'WORKS': return 'w-[80px] md:w-[102px]';
              case 'ABOUT': return 'w-[80px] md:w-[102px]';
              case 'LOGS': return 'w-[76px] md:w-[96px]';
              default: return 'w-[80px]';
            }
          };

          return (
            <button
              key={page}
              onClick={() => handleNavClick(page)}
              onMouseEnter={() => handleHoverItem(page)}
              className={`relative rounded-full py-1.5 md:py-2 font-space text-[10px] md:text-[11px] font-bold tracking-widest transition-colors duration-300 ${getButtonWidth(page)} flex items-center justify-center text-center select-none shrink-0 outline-none focus:outline-none focus-visible:outline-none ${
                isActive
                  ? 'text-black z-10'
                  : 'text-[#ffb3af] hover:text-[#ffdad8] hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute inset-0 bg-[#ff5357] rounded-full shadow-[0_0_22px_rgba(255,83,87,0.6)] z-[-1] origin-center"
                  animate={{
                    scaleX: isChanging ? [1, 1.22, 0.93, 1] : 1,
                    scaleY: isChanging ? [1, 0.82, 1.06, 1] : 1,
                  }}
                  transition={{
                    layout: { type: 'spring', stiffness: 440, damping: 16, mass: 0.72 },
                    scaleX: { duration: 0.35, ease: 'easeOut' },
                    scaleY: { duration: 0.35, ease: 'easeOut' },
                  }}
                />
              )}
              <GlitchTitle
                english={getEnglishPageName(page)}
                japanese={getJapanesePageName(page)}
                autoGlitch={false}
                onHoverGlitch={false}
                trigger={hoverTriggers[page] !== undefined ? hoverTriggers[page] : isActive}
                className={isActive ? 'text-black font-extrabold' : 'text-inherit font-bold'}
              />
            </button>
          );
        })}
      </nav>

      {/* System Status Readout — 等宽数字，避免 FPS 刷新挤动布局 */}
      <div
        className={`flex items-center gap-3 text-[#ff5357]/80 font-mono text-[10px] tracking-tight pointer-events-auto self-end md:absolute md:right-10 md:top-10 transition-all duration-300 ${
          hideStatusReadout ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100'
        }`}
      >
        <div className="hidden lg:block text-right tabular-nums">
          CONNECTED: 1. ENGINE: <span className="text-[#ff5357]">WEBGPU</span>, FRAME:{' '}
          <span className="inline-block min-w-[4.5ch] text-right text-[#ff5357]">{frameTime} ms</span>, FPS:{' '}
          <span className="inline-block min-w-[2ch] text-right text-[#ff5357]">{fps}</span>
        </div>
        <div className="flex items-center gap-1 text-[#ff5357]">
          <span className="w-1.5 h-1.5 bg-[#ff5357] rounded-full animate-ping"></span>
          <span className="material-symbols-outlined text-xs">bar_chart</span>
        </div>
      </div>

      <ExploreKeyHints visible={showExploreKeyHints && currentPage === 'EXPLORE'} />
    </header>
  );
}

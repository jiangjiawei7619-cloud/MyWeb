import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { ActivePage } from '@/lib/types';
import { playJumpSound, installAudioUnlockListeners, installAudioVisibilityListeners, enterAboutFocusMode, exitAboutFocusMode } from '@/utils/audio';
import TopAppBar from '@/components/layout/TopAppBar';
import AboutSection from '@/components/sections/AboutSection';
import LogsSection from '@/components/sections/LogsSection';
import FooterShell from '@/components/layout/FooterShell';
import FirstPersonScene from '@/components/canvas/FirstPersonScene';
import { preloadExploreWorldAssets } from '@/lib/explore-world-preload';

export default function App() {
  const appRevealed = true;
  const introDone = true;
  const [activePage, setActivePage] = useState<ActivePage>('EXPLORE');
  const [exploreVisionReveal, setExploreVisionReveal] = useState(false);
  
  // Custom states for interactive elements
  
  const [isFlickering, setIsFlickering] = useState(false);
  const [exploreScroll, setExploreScroll] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const previousPageRef = useRef<ActivePage>(activePage);

  useEffect(() => {
    const removeUnlock = installAudioUnlockListeners();
    const removeVisibility = installAudioVisibilityListeners();
    return () => {
      removeUnlock();
      removeVisibility();
    };
  }, []);

  useEffect(() => {
    void import('@dimforge/rapier3d-compat').then((m) => m.default.init());
    void preloadExploreWorldAssets();
  }, []);

  useEffect(() => {
    if (activePage === 'ABOUT') {
      enterAboutFocusMode();
    } else {
      exitAboutFocusMode();
    }
  }, [activePage]);

  useEffect(() => {
    if (
      appRevealed &&
      introDone &&
      activePage === 'EXPLORE' &&
      previousPageRef.current !== 'EXPLORE'
    ) {
      setExploreVisionReveal(true);
      const timeout = window.setTimeout(() => setExploreVisionReveal(false), 940);
      previousPageRef.current = activePage;
      return () => window.clearTimeout(timeout);
    }

    previousPageRef.current = activePage;
    return undefined;
  }, [activePage, appRevealed, introDone]);

  // 切页时重置主内容区滚动，避免上一页 scrollTop 影响布局感知
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [activePage]);

  // Bind Wheel & Swipe Gestures to drive 3D backdrop flight walkthrough
  useEffect(() => {
    if (activePage !== 'EXPLORE') {
      setExploreScroll(0);
      return;
    }

    const handleWheel = (e: WheelEvent) => {
      
      // Stop page scrolling container if we are on the interactive explore tab
      e.preventDefault();
      
      setExploreScroll((prev) => {
        const step = 0.0011 * e.deltaY;
        return Math.max(0, Math.min(1, prev + step));
      });
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      
      // If we are touching interactive elements, allow default scroll
      const target = e.target as HTMLElement;
      if (
        target.closest('button') || 
        target.closest('a') || 
        target.closest('input') || 
        target.closest('textarea') || 
        target.closest('#crt-nav')
      ) {
        return;
      }
      
      e.preventDefault();
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      touchStartY = touchY;

      setExploreScroll((prev) => {
        const step = 0.0055 * deltaY;
        return Math.max(0, Math.min(1, prev + step));
      });
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [activePage]);

  // Trigger occasional subtle neon flickers for high tech aesthetic
  useEffect(() => {
    const flickerInterval = setInterval(() => {
      if (Math.random() > 0.8) {
        setIsFlickering(true);
        setTimeout(() => setIsFlickering(false), 90);
      }
    }, 2500);
    return () => clearInterval(flickerInterval);
  }, []);

  const navigateToPage = useCallback(
    (page: ActivePage) => {
      if (page === activePage) return;
      if (page !== 'ABOUT') {
        playJumpSound();
      }
      setActivePage(page);
    },
    [activePage],
  );

  // Global keydown listener for Arrow Up/Down/Left/Right tab transitions
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const PAGELIST: ActivePage[] = ['EXPLORE', 'WORKS', 'LOGS', 'ABOUT'];
      const currentIndex = PAGELIST.indexOf(activePage);

        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + PAGELIST.length) % PAGELIST.length;
          void navigateToPage(PAGELIST[prevIndex]);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % PAGELIST.length;
          void navigateToPage(PAGELIST[nextIndex]);
        }
      };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activePage, navigateToPage]);

  const isLogsPage = activePage === 'LOGS';

  const uiChromeOpacity =
    activePage === 'EXPLORE'
      ? Math.max(0.1, 1 - exploreScroll * 3)
      : 1;
  const uiChromePointerEvents = activePage === 'EXPLORE' && exploreScroll > 0.3 ? 'none' : 'auto';

  return (
  <>
    {/* 3D 垫底；UI 壳层 z-10 叠在上方便于导航/页脚可见 */}
    <FirstPersonScene
      interactive={activePage === 'EXPLORE' && introDone}
      activeSection={activePage}
    />

    {exploreVisionReveal && (
      <div className="explore-vision-reveal pointer-events-none fixed inset-0 z-[9]" aria-hidden />
    )}

    {activePage === 'ABOUT' && (
      <div className="about-world-mask pointer-events-none fixed inset-0 z-[9]" aria-hidden />
    )}

    {activePage === 'LOGS' && (
      <div className="blogs-world-mask pointer-events-none fixed inset-0 z-[9]" aria-hidden />
    )}

    <motion.div
      className={`home-reveal fixed inset-0 z-10 flex h-screen w-screen flex-col overflow-hidden pointer-events-none text-white font-mono select-none ${
        isFlickering ? 'opacity-85' : 'opacity-100'
      }`}
      initial={false}
      animate={{
        opacity: appRevealed ? 1 : 0,
        scale: 1,
        filter: appRevealed ? 'blur(0px) brightness(1)' : 'blur(6px) brightness(0.72)',
      }}
      transition={{
        opacity: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
        filter: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      
      {/* CRT / 扫描线装饰 — 不挡 3D 背景 */}
      {/* Top Embedded Navigation HUD */}
      <div 
        style={{ 
          opacity: uiChromeOpacity,
          pointerEvents: uiChromePointerEvents,
        }} 
        className="transition-opacity duration-300 relative z-20 pointer-events-none"
      >
        <TopAppBar
          currentPage={activePage}
          onPageChange={(p) => {
            void navigateToPage(p);
          }}
          hideStatusReadout={isLogsPage}
          showExploreKeyHints={appRevealed}
        />
      </div>

      {/* Dynamic Route views rendered inside centered main view box */}
      <main
        ref={mainRef}
        className={`relative z-10 min-h-0 w-full flex-1 px-4 sm:px-6 md:px-12 lg:px-20 xl:px-28 flex flex-col overflow-y-auto pb-28 md:pb-32 ${
          activePage === 'LOGS' ? 'justify-start pt-28 md:pt-32' : 'justify-center pt-20 md:pt-24'
        } ${
          activePage === 'EXPLORE' || activePage === 'WORKS' ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
      >
        <div
          className={`w-full mx-auto ${activePage === 'LOGS' ? 'max-w-[1350px] overflow-visible' : 'max-w-7xl overflow-hidden'}`}
        >
          <div
            key={activePage}
            className="route-view-shell w-full"
          >
            {activePage === 'ABOUT' && (
              <AboutSection />
            )}

            {activePage === 'LOGS' && (
              <LogsSection />
            )}
          </div>
        </div>
      </main>

      {/* Bottom Global Status Footer bar */}
      <div 
        style={{ 
          opacity: uiChromeOpacity,
          pointerEvents: uiChromePointerEvents,
        }} 
        className="transition-opacity duration-300 relative z-20 pointer-events-none"
      >
        <FooterShell
          hidePageNav={isLogsPage}
          onPrev={() => {
            const PAGELIST: ActivePage[] = ['EXPLORE', 'WORKS', 'LOGS', 'ABOUT'];
            const currentIndex = PAGELIST.indexOf(activePage);
            const prevIndex = (currentIndex - 1 + PAGELIST.length) % PAGELIST.length;
            void navigateToPage(PAGELIST[prevIndex]);
          }}
          onNext={() => {
            const PAGELIST: ActivePage[] = ['EXPLORE', 'WORKS', 'LOGS', 'ABOUT'];
            const currentIndex = PAGELIST.indexOf(activePage);
            const nextIndex = (currentIndex + 1) % PAGELIST.length;
            void navigateToPage(PAGELIST[nextIndex]);
          }}
        />
      </div>

    </motion.div>
  </>
  );
}

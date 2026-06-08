import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActivePage } from '@/lib/types';
import { INITIAL_PROJECTS, INITIAL_LOGS } from '@/lib/data';
import { playJumpSound, installAudioUnlockListeners, installAudioVisibilityListeners, enterAboutFocusMode, exitAboutFocusMode } from '@/utils/audio';
import TopAppBar from '@/components/layout/TopAppBar';
import WorksSection from '@/components/sections/WorksSection';
import AboutSection from '@/components/sections/AboutSection';
import LogsSection from '@/components/sections/LogsSection';
import FooterShell from '@/components/layout/FooterShell';
import FirstPersonScene from '@/components/canvas/FirstPersonScene';
import LoadingScreen from '@/components/loading/LoadingScreen';
import { preloadExploreWorldAssets } from '@/lib/explore-world-preload';

function shouldSkipInitialLoading(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('skipLoading') === '1' ||
    params.get('debugDepthFade') === '1' ||
    params.get('debugFresnel') === '1' ||
    params.get('debugReflectionOnly') === '1' ||
    params.get('debugMicroVariation') === '1'
  );
}

export default function App() {
  const skipInitialLoading = shouldSkipInitialLoading();
  const [showLoading, setShowLoading] = useState(!skipInitialLoading);
  const [appRevealed, setAppRevealed] = useState(skipInitialLoading);
  const [introActive, setIntroActive] = useState(false);
  const [introDone, setIntroDone] = useState(skipInitialLoading);
  const [activePage, setActivePage] = useState<ActivePage>('EXPLORE');
  const logs = INITIAL_LOGS;
  
  // Custom states for interactive elements
  
  const [isFlickering, setIsFlickering] = useState(false);
  const [exploreScroll, setExploreScroll] = useState(0);
  const mainRef = useRef<HTMLElement>(null);

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
        setActivePage(PAGELIST[prevIndex]);
        playJumpSound();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % PAGELIST.length;
        setActivePage(PAGELIST[nextIndex]);
        playJumpSound();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activePage]);

  const handleLoadingFlashStart = useCallback(() => {
    setAppRevealed(true);
    setIntroActive(true);
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setShowLoading(false);
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroActive(false);
    setIntroDone(true);
  }, []);

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
      introActive={introActive}
      onIntroComplete={handleIntroComplete}
    />

    {showLoading && (
      <LoadingScreen onComplete={handleLoadingComplete} onFlashStart={handleLoadingFlashStart} />
    )}

    <motion.div
      className={`fixed inset-0 z-10 flex h-screen w-screen flex-col overflow-hidden pointer-events-none text-white font-mono select-none ${
        isFlickering ? 'opacity-85' : 'opacity-100'
      }`}
      initial={false}
      animate={{
        opacity: appRevealed ? 1 : 0,
        scale: appRevealed ? 1 : 1.02,
        filter: appRevealed ? 'blur(0px) brightness(1)' : 'blur(6px) brightness(0.7)',
      }}
      transition={{
        opacity: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 1.35, ease: [0.16, 1, 0.3, 1] },
        filter: { duration: 1.25, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      
      {/* CRT / 扫描线装饰 — 不挡 3D 背景 */}
      <div className="crt-overlay pointer-events-none" id="crt-layer" />
      <div className="noise-bg pointer-events-none" id="noise-layer" />
      <div className="scanlines fixed inset-0 z-30 pointer-events-none" id="scanlines-layer" />

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
          onPageChange={(p) => setActivePage(p)}
          hideStatusReadout={isLogsPage}
          showExploreKeyHints={appRevealed}
        />
      </div>

      {/* Dynamic Route views rendered inside centered main view box */}
      <main
        ref={mainRef}
        className={`relative z-10 min-h-0 w-full flex-1 px-4 sm:px-6 md:px-12 lg:px-24 xl:px-44 flex flex-col justify-center overflow-y-auto pt-20 pb-28 md:pt-24 md:pb-32 ${
          activePage === 'EXPLORE' ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
      >
        <div
          className={`w-full max-w-7xl mx-auto ${activePage === 'LOGS' ? 'overflow-visible' : 'overflow-hidden'}`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              className="w-full"
              initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, x: -20, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.32, 1] }}
            >
              {activePage === 'WORKS' && (
                <WorksSection projects={INITIAL_PROJECTS} />
              )}

              {activePage === 'ABOUT' && (
                <AboutSection />
              )}

              {activePage === 'LOGS' && (
                <LogsSection logs={logs} />
              )}
            </motion.div>
          </AnimatePresence>
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
            setActivePage(PAGELIST[prevIndex]);
            playJumpSound();
          }}
          onNext={() => {
            const PAGELIST: ActivePage[] = ['EXPLORE', 'WORKS', 'LOGS', 'ABOUT'];
            const currentIndex = PAGELIST.indexOf(activePage);
            const nextIndex = (currentIndex + 1) % PAGELIST.length;
            setActivePage(PAGELIST[nextIndex]);
            playJumpSound();
          }}
        />
      </div>

    </motion.div>
  </>
  );
}

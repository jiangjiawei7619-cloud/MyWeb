import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { motion } from 'motion/react';
import { ProjectWork } from '@/lib/types';
import { playClick, playGlitchDeng } from '@/utils/audio';
import GlitchTitle from '@/components/ui/GlitchTitle';
import TiltWrapper from '@/components/ui/TiltWrapper';

interface WorksSectionProps {
  projects: ProjectWork[];
  active?: boolean;
}

export default function WorksSection({ projects }: WorksSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [glowIndex, setGlowIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isProjectNavChanging, setIsProjectNavChanging] = useState(false);
  const [titleGlitchTrigger, setTitleGlitchTrigger] = useState(0);
  
  // Transition state tracking the source and target project indices
  const [transitionState, setTransitionState] = useState<{ from: number; to: number } | null>(null);

  const currentProject = projects[activeIndex];

  // Animation Refs
  const mainImageRef = useRef<HTMLImageElement>(null);
  const glitchImage1Ref = useRef<HTMLImageElement>(null);
  const glitchImage2Ref = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsProjectNavChanging(true);
    const timeout = window.setTimeout(() => setIsProjectNavChanging(false), 350);
    return () => window.clearTimeout(timeout);
  }, [glowIndex]);

  // Clean up any GSAP tweens on unmount to prevent leaks
  useEffect(() => {
    return () => {
      gsap.killTweensOf(mainImageRef.current);
      if (glitchImage1Ref.current) gsap.killTweensOf(glitchImage1Ref.current);
      if (glitchImage2Ref.current) gsap.killTweensOf(glitchImage2Ref.current);
      gsap.killTweensOf(titleContainerRef.current);
    };
  }, []);

  const animateTitleIn = () => {
    if (!titleContainerRef.current) return;
    gsap.fromTo(
      titleContainerRef.current,
      {
        x: 120,
        opacity: 0,
        skewX: 12,
        scaleX: 1.12,
      },
      {
        x: 0,
        opacity: 1,
        skewX: 0,
        scaleX: 1,
        duration: 0.72,
        ease: 'elastic.out(0.9, 0.48)',
        clearProps: 'transform',
      },
    );
  };

  // Complex CSS-Filter + random clip-path horizontal slicing glitch
  const transitionToProject = (targetIndex: number) => {
    if (targetIndex === activeIndex || isTransitioning) return;
    setIsTransitioning(true);
    setIsGlitching(true);
    setGlowIndex(targetIndex);
    
    // Mount the dual transition rendering (underlay & overlay state)
    setTransitionState({ from: activeIndex, to: targetIndex });

    playGlitchDeng();

    // Zero-delay timeout deferring execution until React mounts target elements
    setTimeout(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          // Direct content switch (no crossfade), clear glitch/from overlay layers
          setActiveIndex(targetIndex);
          setTransitionState(null);
          setIsGlitching(false);
          setIsTransitioning(false);

          // Run title spring transition in the next painter paint cycle
          setTimeout(() => {
            setTitleGlitchTrigger((t) => t + 1);
            animateTitleIn();
          }, 16);
        }
      });

      const steps = 12;
      const duration = 0.42; // ~0.4s strong digital glitch phase
      const stepDuration = duration / steps;

      for (let i = 0; i < steps; i++) {
        const seed = Math.random();
        const hue = Math.floor(seed * 360);
        const contrast = 1.8 + Math.random() * 2.5;
        const blur = Math.floor(Math.random() * 4);

        const xShiftMain = (Math.random() - 0.5) * 45;
        const yShiftMain = (Math.random() - 0.5) * 15;

        const xShift1 = (Math.random() - 0.5) * 75;
        const yShift1 = (Math.random() - 0.5) * 30;
        const xShift2 = (Math.random() - 0.5) * -75;
        const yShift2 = (Math.random() - 0.5) * -30;

        // Clip polygons for slice layers
        const yTop1 = Math.floor(Math.random() * 55);
        const yBottom1 = yTop1 + 6 + Math.floor(Math.random() * 25);
        const clip1 = `polygon(0% ${yTop1}%, 100% ${yTop1}%, 100% ${yBottom1}%, 0% ${yBottom1}%)`;

        const yTop2 = Math.floor(Math.random() * 55);
        const yBottom2 = yTop2 + 4 + Math.floor(Math.random() * 22);
        const clip2 = `polygon(0% ${yTop2}%, 100% ${yTop2}%, 100% ${yBottom2}%, 0% ${yBottom2}%)`;

        const time = i * stepDuration;

        // Randomize the main overlay source image
        if (mainImageRef.current) {
          tl.set(mainImageRef.current, {
            filter: `hue-rotate(${hue}deg) contrast(${contrast}) blur(${blur}px) invert(${Math.random() > 0.8 ? 0.25 : 0})`,
            x: xShiftMain,
            y: yShiftMain,
            scale: 1.05 + Math.random() * 0.08,
            opacity: 0.95 - (i / steps) * 0.35 // Slowly fade previous overlay out to reveal next underlay
          }, time);
        }

        // Randomize slice overlay layers (one from source, one from target)
        if (glitchImage1Ref.current && glitchImage2Ref.current) {
          tl.set(glitchImage1Ref.current, {
            clipPath: clip1,
            x: xShift1,
            y: yShift1,
            filter: `hue-rotate(${hue + 90}deg) contrast(${contrast * 1.4}) invert(0.2)`,
            scale: 1.05 + Math.random() * 0.05,
            display: 'block'
          }, time);

          tl.set(glitchImage2Ref.current, {
            clipPath: clip2,
            x: xShift2,
            y: yShift2,
            filter: `hue-rotate(${hue - 90}deg) contrast(${contrast * 1.25}) saturate(1.8)`,
            scale: 1.05 + Math.random() * 0.05,
            display: 'block'
          }, time);
        }
      }

      // Clear layout mutations exactly before target switch completing
      if (mainImageRef.current) {
        tl.set(mainImageRef.current, {
          filter: 'none',
          x: 0,
          y: 0,
          scale: 1.05,
          opacity: 0.8
        }, duration);
      }
    }, 0);
  };

  const handleNext = () => {
    const nextIdx = (activeIndex + 1) % projects.length;
    transitionToProject(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (activeIndex - 1 + projects.length) % projects.length;
    transitionToProject(prevIdx);
  };

  const handleInfoSelect = () => {
    playClick(900, 0.04);
    alert(`PROJECT DETAILS:\n-----------------\nName: ${currentProject.title}\nID: ${currentProject.ref}\nCreated: ${currentProject.date}\nStack: ${currentProject.techStack.join(', ')}\n\nDescription: ${currentProject.description}`);
  };

  return (
    <TiltWrapper className="w-full max-w-5xl mx-auto flex flex-col gap-6 relative select-none py-2 justify-center">
      {/* Upper Main Terminal Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center w-full">
        
        {/* Left Side: Meta Text Information */}
        <div className="lg:col-span-5 flex flex-col items-start gap-3 md:gap-4 z-10 p-5 md:p-6 bg-black/65 backdrop-blur-md rounded-lg border border-white/10 shadow-2xl tilt-layer-content">
          <div className="font-mono text-[9px] text-[#ffb3af] tracking-widest uppercase bg-[#ff5357]/10 px-2 py-1 rounded">
            PROJECT PROJECTOR: {activeIndex + 1} / {projects.length}
          </div>

          <div ref={titleContainerRef} className="space-y-1.5 w-full will-change-[transform,opacity]">
            <h2>
              <GlitchTitle
                english={currentProject.title}
                japanese={currentProject.japaneseTitle || '製品开发モデル'}
                autoGlitch={false}
                onHoverGlitch
                trigger={titleGlitchTrigger > 0 ? titleGlitchTrigger : false}
                className="text-3xl md:text-5xl font-extrabold text-[#ff5357] tracking-tighter m-0 leading-tight block"
                japaneseToneClass="text-[#aaf0ff]/95 scale-y-[1.02]"
                glitchToneClass="text-[#ffb3af] scale-y-110 skew-x-3"
              />
            </h2>
            <p className="font-mono text-[#00eefc] text-[10px] uppercase tracking-wider">
              {currentProject.subtitle}
            </p>
          </div>

          <p className="font-mono text-[12px] text-[#ffb3af]/80 leading-relaxed pt-1 max-w-md">
            {currentProject.description}
          </p>

          {/* Controls & Tech Badges */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {currentProject.techStack.map((tech) => (
              <span key={tech} className="font-mono text-[9px] text-[#ffb3af]/60 border border-white/10 px-2 py-0.5 rounded">
                #{tech}
              </span>
            ))}
          </div>

          {/* Buttons Group */}
          <div className="flex items-center gap-4 w-full pt-4 border-t border-white/10">
            <button
              onClick={handleInfoSelect}
              className="bg-[#ff5357] text-black hover:bg-[#ffb3af] transition-all px-5 py-2 rounded text-xs font-mono font-bold tracking-widest uppercase cursor-pointer"
            >
              INFOS
            </button>
            <a
              href={currentProject.visitUrl}
              target="_blank"
              rel="noreferrer referrer"
              onClick={() => playClick(1200, 0.05)}
              className="border border-[#ff5357] text-[#ff5357] hover:bg-[#ff5357]/10 transition-all px-5 py-2 rounded text-xs font-mono font-bold tracking-widest uppercase cursor-pointer text-center"
            >
              VISIT
            </a>
          </div>
        </div>

        {/* Right Side: Virtual Holo-3D Project Image Panel */}
        <div className="lg:col-span-7 w-full h-[280px] md:h-[360px] relative rounded-lg border border-[#ff5357]/20 overflow-hidden bg-[#0e0e0e] flex items-center justify-center shadow-lg tilt-layer-content">
          {/* Grid layers */}
          <div className="absolute inset-0 bg-grid opacity-20 z-10 pointer-events-none tilt-layer-bg"></div>
          <div className="absolute inset-0 scanlines opacity-55 z-20 pointer-events-none tilt-layer-bg"></div>

          {/* Outer wireframe frames */}
          <div className="absolute top-2 left-2 font-mono text-[8px] text-[#ffb3af]/60 z-30">
            FRAME: 0XAA_F339 // REF: {currentProject.ref}
          </div>
          <div className="absolute bottom-2 right-2 font-mono text-[8px] text-[#00eefc]/60 z-30">
            STABLE_RESOLUTION: 2048 x 1440px
          </div>

          {/* Corner crosshairs mock styling */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#ff5357]"></div>
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#ff5357]"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#ff5357]"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#ff5357]"></div>

          <div ref={imageContainerRef} className="absolute inset-0 w-full h-full overflow-hidden z-10">
            {transitionState ? (
              <>
                {/* Target underlay (the to-project image, starts static & opaque underneath) */}
                <img
                  src={projects[transitionState.to].imgUrl}
                  alt="Transition Target"
                  className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-80 scale-[1.05]"
                />
                
                {/* Source overlay (the from-project image, which takes the digital shattering filter/offset timeline) */}
                <img
                  ref={mainImageRef}
                  src={projects[transitionState.from].imgUrl}
                  alt="Transition Source"
                  className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-80 scale-[1.05] will-change-[filter,transform,opacity]"
                />

                {/* Glitch Slices: Slice 1 is source, Slice 2 is target */}
                <img
                  ref={glitchImage1Ref}
                  src={projects[transitionState.from].imgUrl}
                  alt="Glitch Phase Layer 1"
                  className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-75 hidden will-change-[clip-path,transform,filter]"
                  style={{ mixBlendMode: 'screen' }}
                />
                <img
                  ref={glitchImage2Ref}
                  src={projects[transitionState.to].imgUrl}
                  alt="Glitch Phase Layer 2"
                  className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-75 hidden will-change-[clip-path,transform,filter]"
                  style={{ mixBlendMode: 'screen' }}
                />
              </>
            ) : (
              /* Normal Static State (Clean static high contrast display) */
              <img
                ref={mainImageRef}
                src={currentProject.imgUrl}
                alt={currentProject.title}
                className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-80 scale-[1.05] will-change-[filter,transform,opacity]"
              />
            )}
          </div>


        </div>

      </div>

      {/* Footer Nav Bar Controls (Nxt / Prev & Indicator Capsule) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 pt-3 border-t border-white/5 w-full font-sans">
        
        {/* Prev / Next buttons - Fixed width container to prevent shifting */}
        <div className="flex items-center gap-3 min-w-[300px] md:min-w-[380px] shrink-0">
          <button
            onClick={handlePrev}
            disabled={isTransitioning}
            className="px-4 py-1.5 bg-neutral-900 border border-white/10 hover:border-[#ff5357]/50 rounded text-xs font-mono font-bold text-[#ffb3af] hover:text-white transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            ← PREV
          </button>
          <button
            onClick={handleNext}
            disabled={isTransitioning}
            className="px-4 py-1.5 bg-neutral-900 border border-white/10 hover:border-[#ff5357]/50 rounded text-xs font-mono font-bold text-[#ffb3af] hover:text-white transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            NEXT →
          </button>
          <span className="font-mono text-[11px] text-[#ffb3af]/60 uppercase tracking-widest pl-3 truncate">
            {currentProject.title} / {currentProject.ref}
          </span>
        </div>

        {/* Project Selector rounded red capsule row (弹过去的回弹动画) */}
        <div className="relative flex items-center gap-1 bg-black/45 backdrop-blur-md p-1 border border-white/5 rounded-full pointer-events-auto select-none overflow-hidden shrink-0">
          {projects.map((project, idx) => {
            const isActive = glowIndex === idx;
            return (
              <button
                key={project.id}
                onClick={() => transitionToProject(idx)}
                disabled={isTransitioning}
                className={`relative rounded-full py-1.5 px-4 font-mono text-[10px] md:text-[11px] font-bold tracking-widest transition-colors duration-300 select-none cursor-pointer outline-none border-none z-10 disabled:cursor-not-allowed ${
                  isActive
                    ? 'text-black font-black saturate-150 drop-shadow-[0_0_3px_rgba(0,0,0,0.4)]'
                    : 'text-[#ffb3af] hover:text-[#ffdad8] hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeWorksProjectIndicator"
                    className="absolute inset-0 bg-[#ff5357] rounded-full shadow-[0_0_20px_rgba(255,83,87,0.85)] pointer-events-none z-[-1] origin-center"
                    animate={{
                      scaleX: isProjectNavChanging ? [1, 1.18, 0.94, 1] : 1,
                      scaleY: isProjectNavChanging ? [1, 0.84, 1.05, 1] : 1,
                    }}
                    transition={{
                      layout: { type: 'spring', stiffness: 440, damping: 16, mass: 0.72 },
                      scaleX: { duration: 0.35, ease: 'easeOut' },
                      scaleY: { duration: 0.35, ease: 'easeOut' },
                    }}
                  />
                )}
                {project.title}
              </button>
            );
          })}
        </div>

        {/* Dynamic Graphic Level Bars */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-mono text-[9px] text-[#00eefc] mr-2 animate-pulse">DATALINK:</span>
          {Array.from({ length: 12 }).map((_, idx) => {
            const isActive = idx / 12 <= (glowIndex + 1) / projects.length;
            return (
              <div
                key={idx}
                className={`w-1 h-5 rounded-sm transition-all duration-300 will-change-transform ${
                  isActive ? 'bg-[#ff5357] shadow-[0_0_5px_#ff5357]' : 'bg-neutral-800'
                }`}
              />
            );
          })}
        </div>

      </div>
    </TiltWrapper>
  );
}

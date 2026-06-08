import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SystemLog } from '@/lib/types';
import { enterBlogReadingMode, exitBlogReadingMode, playClick } from '@/utils/audio';
import GlitchTitle from '@/components/ui/GlitchTitle';
import TiltWrapper from '@/components/ui/TiltWrapper';

interface LogsSectionProps {
  logs: SystemLog[];
}

const readerEase = [0.22, 1, 0.36, 1] as const;

const readerRevealItem = {
  hidden: { opacity: 0, y: 10, filter: 'blur(5px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.62, ease: readerEase },
  },
};

const readerRevealStagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.04 },
  },
};

export default function LogsSection({ logs }: LogsSectionProps) {
  const [hoverTriggers, setHoverTriggers] = useState<{ [id: string]: number }>({});
  const [hoveredLogId, setHoveredLogId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [openingLogId, setOpeningLogId] = useState<string | null>(null);
  const [phase, setPhase] = useState(0); // 0:提取 1:解构 2:穿越 3:上线 4:稳定
  const [closeGlitchTrigger, setCloseGlitchTrigger] = useState(0);
  const lastTriggerTimes = useRef<{ [id: string]: number }>({});
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  };

  const handleLogClick = (log: SystemLog) => {
    playClick(1000, 0.04);
    clearTimers();
    setOpeningLogId(log.id);
    setSelectedLog(log);
    setPhase(0);

    timerRefs.current.push(setTimeout(() => setPhase(1), 420));
    timerRefs.current.push(setTimeout(() => setPhase(2), 1120));
    timerRefs.current.push(setTimeout(() => setPhase(3), 1880));
    timerRefs.current.push(setTimeout(() => setPhase(4), 2860));
  };

  const closeDetail = () => {
    clearTimers();
    setOpeningLogId(null);
    setPhase(4);
    setSelectedLog(null);
  };

  const bodyLines = useMemo(() => {
    const text = selectedLog?.body || selectedLog?.description || '';
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [selectedLog]);

  useEffect(() => {
    if (!selectedLog) return;
    setCloseGlitchTrigger((t) => t + 1);
    enterBlogReadingMode();
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      exitBlogReadingMode();
    };
  }, [selectedLog]);

  useEffect(() => () => clearTimers(), []);

  // 穿越分镜结束后清掉 opening 标记，阅读/关闭时不再触发选中卡片的 motion 状态
  useEffect(() => {
    if (phase >= 2) {
      setOpeningLogId(null);
    }
  }, [phase]);

  return (
    <>
    <TiltWrapper className="w-full max-w-5xl mx-auto h-full min-h-[60vh] flex flex-col justify-start relative mt-4 md:mt-8 select-none">

      {/* Terminal list logs grid — 阅读态时整列隐藏，关闭时不逐卡复位 */}
      <div
        className={`flex flex-col gap-4 w-full tilt-layer-content ${
          selectedLog
            ? 'opacity-0 pointer-events-none transition-opacity duration-200'
            : 'opacity-100'
        }`}
      >
        {logs.map((log) => {
          const isTrace = log.isActiveTrace || log.tag === 'ACTIVE_TRACE';
          const triggerVal = hoverTriggers[log.id] || 0;
          const isSelected = openingLogId === log.id;
          // 开场仅淡出其它卡片，不改变 y/scale，关闭后列表位置始终不变
          const isGhosted = !!openingLogId && !isSelected && phase < 2;

          return (
            <article
              key={log.id}
              onClick={() => handleLogClick(log)}
              onMouseEnter={() => {
                const now = Date.now();
                const lastTime = lastTriggerTimes.current[log.id] || 0;
                if (now - lastTime > 1500 && hoveredLogId !== log.id) {
                  lastTriggerTimes.current[log.id] = now;
                  setHoveredLogId(log.id);
                  setHoverTriggers((prev) => ({
                    ...prev,
                    [log.id]: (prev[log.id] || 0) + 1,
                  }));
                }
              }}
              onMouseLeave={() => {
                if (hoveredLogId === log.id) {
                  setHoveredLogId(null);
                }
              }}
              className={`glass-panel p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-8 hover:border-[#ff5357] hover:shadow-[0_0_15px_rgba(255,83,87,0.15)] transition-[opacity,filter,box-shadow,border-color] duration-300 group cursor-pointer relative overflow-hidden rounded card-marquee-border ${
                isTrace ? 'border-[#ff5357] bg-[#ff5357]/5' : ''
              } ${isGhosted ? 'opacity-0 blur-sm pointer-events-none' : 'opacity-100 blur-0'} ${
                isSelected && phase < 2
                  ? 'ring-1 ring-[#ff5357]/95 shadow-[0_0_28px_rgba(255,83,87,0.35)]'
                  : ''
              }`}
            >
              {isSelected && phase < 2 && (
                <div className="pointer-events-none absolute inset-0 border border-[#ff5357] rounded animate-pulse" />
              )}
              <div className="flex items-center gap-5 z-10 w-full overflow-hidden pointer-events-none">

                {/* Thumbnail item */}
                <div className={`w-14 h-14 md:w-16 md:h-16 border rounded-sm flex-shrink-0 relative overflow-hidden bg-black ${
                  isTrace ? 'border-[#ff5357]' : 'border-white/10 group-hover:border-[#ff5357]/60'
                }`}>
                  <img
                    src={log.imgUrl}
                    alt={log.title}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-40 group-hover:opacity-90 group-hover:scale-105 transition-all"
                  />
                  {isSelected && phase < 2 && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse" />
                  )}
                  <div className="absolute inset-0 bg-scanlines opacity-40"></div>
                  <span className="absolute top-1 left-1 text-[7px] font-mono text-[#ffb3af] tracking-wider uppercase">
                    {log.ref.split('_')[0]}
                  </span>
                  {isTrace && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="material-symbols-outlined text-[#ff5357] text-lg animate-pulse">lock_open</span>
                    </div>
                  )}
                </div>

                {/* Information blocks */}
                <div className="flex flex-col gap-1.5 flex-grow min-w-0">
                  <h2>
                    <GlitchTitle
                      english={log.title}
                      japanese={log.japaneseTitle || 'オーバーライドセクタ検出'}
                      trigger={triggerVal}
                      onHoverGlitch={false}
                      className={`text-[16px] md:text-[20px] font-extrabold truncate m-0 leading-tight group-hover:text-[#ffb3af] transition-colors ${
                        isTrace ? 'text-[#ff5357]' : 'text-white'
                      }`}
                    />
                  </h2>

                  <p className="font-mono text-[11px] md:text-xs text-[#ffb3af]/70 truncate max-w-2xl m-0">
                    {log.description}
                  </p>
                </div>

              </div>

              {/* Angle Action Indicator */}
              <div className="z-10 hidden md:block pointer-events-none">
                <span className="material-symbols-outlined text-white/20 group-hover:text-[#ff5357] group-hover:translate-x-2 transition-all text-xl">
                  arrow_forward
                </span>
              </div>

            </article>
          );
        })}
      </div>

    </TiltWrapper>

      {/* 详情层放在 TiltWrapper 外，避免 transform 导致 fixed 遮罩不完整、明暗不均 */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            className="fixed inset-0 z-[120] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px] pointer-events-auto" aria-hidden />

            <button
              type="button"
              onClick={closeDetail}
              onMouseEnter={() => setCloseGlitchTrigger((t) => t + 1)}
              className="pointer-events-auto fixed top-5 right-5 z-[130] w-[72px] md:w-[94px] rounded-full py-1.5 md:py-2 font-space text-[10px] md:text-[11px] font-bold tracking-widest flex items-center justify-center text-center select-none outline-none focus:outline-none focus-visible:outline-none text-black shrink-0"
            >
              <span
                className="absolute inset-0 rounded-full bg-[#ff5357] shadow-[0_0_22px_rgba(255,83,87,0.6)] z-[-1]"
                aria-hidden
              />
              <GlitchTitle
                english="CLOSE"
                japanese="閉鎖"
                autoGlitch={false}
                onHoverGlitch={false}
                trigger={closeGlitchTrigger > 0 ? closeGlitchTrigger : true}
                className="text-black font-extrabold"
              />
            </button>

            <motion.div
              className="pointer-events-auto absolute inset-0 flex flex-col overflow-hidden bg-[#15100c]/78 backdrop-blur-md"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="min-h-0 flex-1 overflow-y-auto blog-reader-scroll">
                <motion.p
                  className="pointer-events-none sticky top-0 z-10 px-4 pt-6 md:px-10 md:pt-10 pb-3 font-mono text-[10px] tracking-[0.2em] text-[#c97a3c]/55 bg-gradient-to-b from-[#15100c]/90 to-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease: readerEase }}
                >
                  READING MODE // AMBIENT SUPPRESSED
                </motion.p>

                <div className="px-4 py-8 md:px-10 md:py-14">
                  <div className="flex items-start gap-5 md:gap-8">
                    <motion.div
                      className="relative w-24 h-24 md:w-40 md:h-40 shrink-0 rounded-md overflow-hidden border border-[#ff5357]/35 bg-black/60"
                      initial={{ opacity: 0, scale: 0.65, x: -36, rotate: -8, filter: 'blur(8px)' }}
                      animate={
                        phase >= 1
                          ? { opacity: 1, scale: 1, x: 0, rotate: 0, filter: 'blur(0px)' }
                          : { opacity: 0, scale: 0.65, x: -36, rotate: -8, filter: 'blur(8px)' }
                      }
                      transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <motion.img
                        src={selectedLog.imgUrl}
                        alt={selectedLog.title}
                        className="absolute inset-0 w-full h-full object-cover object-center opacity-55"
                        initial={{ scale: 1 }}
                        animate={phase >= 1 ? { scale: [1.2, 0.92, 1] } : { scale: 1 }}
                        transition={{ duration: 0.7, ease: [0.12, 0.9, 0.26, 1] }}
                      />
                    </motion.div>

                    <motion.div
                      className="min-w-0 flex-1 pt-1 md:pt-2"
                      variants={readerRevealStagger}
                      initial="hidden"
                      animate={phase >= 1 ? 'show' : 'hidden'}
                    >
                      <motion.div
                        variants={readerRevealItem}
                        className="text-[11px] md:text-xs text-[#ffb3af]/75 font-mono tracking-[0.16em] mb-2"
                      >
                        {selectedLog.date} · {selectedLog.tag}
                      </motion.div>
                      <motion.h2
                        variants={readerRevealItem}
                        className="m-0 leading-tight text-white text-[24px] md:text-[44px] font-black tracking-tight"
                      >
                        {selectedLog.title}
                      </motion.h2>
                    </motion.div>
                  </div>
                </div>

                <motion.div
                  className="w-full max-w-[min(1500px,94vw)] mx-auto px-3 py-10 md:px-8 md:py-20 md:pb-28 space-y-12"
                  style={{ fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif' }}
                  variants={readerRevealStagger}
                  initial="hidden"
                  animate={phase >= 1 ? 'show' : 'hidden'}
                >
                  <motion.section variants={readerRevealItem}>
                    <div className="text-[10px] md:text-xs text-[#ff5357] font-bold tracking-[0.18em] mb-2.5">INTRO</div>
                    <p className="m-0 text-[15px] md:text-base leading-[2] text-[#f0e6d8]">{selectedLog.description}</p>
                  </motion.section>

                  <motion.section variants={readerRevealStagger}>
                    <motion.div
                      variants={readerRevealItem}
                      className="text-[10px] md:text-xs text-[#d4a06a] font-bold tracking-[0.18em] mb-2.5"
                    >
                      BODY
                    </motion.div>
                    <div className="space-y-5 md:space-y-6">
                      {bodyLines.map((line, idx) => (
                        <motion.p
                          key={`${selectedLog.id}-line-${idx}`}
                          variants={readerRevealItem}
                          className="m-0 text-[15px] md:text-[16px] leading-[2] text-[#ebe2d4]"
                        >
                          {line}
                        </motion.p>
                      ))}
                    </div>
                  </motion.section>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
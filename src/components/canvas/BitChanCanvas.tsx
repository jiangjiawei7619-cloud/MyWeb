import { useCallback, useEffect, useRef } from 'react';
import { useBitChan, type PetMood, type WorldSnapshot } from '@/contexts/BitChanContext';

const CANVAS_SIZE = 280;
const DISPLAY_SIZE = 140;
const LONG_PRESS_MS = 500;

interface AnimState {
  blinkProgress: number;
  blinkTimer: number;
  nextBlink: number;
  bobPhase: number;
  tailPhase: number;
  antennaBlink: boolean;
  antennaTimer: number;
  patrolX: number;
  patrolY: number;
  patrolTargetX: number;
  patrolTargetY: number;
  bounceY: number;
  headTilt: number;
  surprisedJump: number;
  workingFrame: number;
  zzzPhase: number;
  injectPullX: number;
  injectPullY: number;
  timeFreezeBlink: number;
  dragOffsetX: number;
  dragOffsetY: number;
}

function initAnimState(): AnimState {
  return {
    blinkProgress: 0,
    blinkTimer: 0,
    nextBlink: 120 + Math.random() * 180,
    bobPhase: 0,
    tailPhase: 0,
    antennaBlink: false,
    antennaTimer: 60 + Math.random() * 120,
    patrolX: 0,
    patrolY: 0,
    patrolTargetX: 30,
    patrolTargetY: -10,
    bounceY: 0,
    headTilt: 0,
    surprisedJump: 0,
    workingFrame: 0,
    zzzPhase: 0,
    injectPullX: 0,
    injectPullY: 0,
    timeFreezeBlink: 0,
    dragOffsetX: 0,
    dragOffsetY: 0,
  };
}

/** 肚皮微型显示屏 — 简化 WebGL 世界状态 */
function drawBellyDisplay(
  ctx: CanvasRenderingContext2D,
  mood: PetMood,
  anim: AnimState,
  world: WorldSnapshot,
  time: number,
) {
  const bx = -18;
  const by = 6;
  const bw = 36;
  const bh = 22;

  ctx.fillStyle = '#0a0000';
  ctx.strokeStyle = '#ff2a2a';
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, bw, bh, 3);
  ctx.fill();
  ctx.stroke();

  // 平台缩略
  ctx.strokeStyle = 'rgba(255,42,42,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, by + bh - 4, 12, 3, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 波纹幅度指示
  const waveH = world.waveAmplitude * 20;
  ctx.strokeStyle = '#ff2a2a';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let x = bx + 2; x < bx + bw - 2; x += 2) {
    const y = by + bh / 2 + Math.sin((x + time * 40) * 0.15) * waveH;
    if (x === bx + 2) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 碎片点位
  world.fragments.forEach((f) => {
    const px = bx + f.nx * bw;
    const py = by + f.ny * bh;
    ctx.fillStyle = f.active ? '#ffffff' : '#ff2a2a';
    ctx.globalAlpha = f.active ? 0.9 : 0.45;
    ctx.beginPath();
    ctx.arc(px, py, f.active ? 2.5 : 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // 情绪覆盖层
  if (mood === 'happy') {
    ctx.fillStyle = '#ff2a2a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('♥', 0, by + bh / 2 + 1);
  } else if (mood === 'surprised') {
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < 6; i++) {
      const c = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96));
      ctx.fillText(c, bx + 4 + i * 5, by + 8 + (i % 2) * 8);
    }
  } else if (mood === 'sleepy') {
    anim.zzzPhase += 0.04;
    ctx.fillStyle = 'rgba(255,42,42,0.6)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    const z = 'z'.repeat(1 + Math.floor((Math.sin(anim.zzzPhase) + 1) * 1.5));
    ctx.fillText(z.toUpperCase(), bx + bw - 2, by - 2);
  } else if (mood === 'working') {
    const progress = (Math.sin(anim.workingFrame * 0.08) + 1) / 2;
    ctx.fillStyle = '#1a0505';
    ctx.fillRect(bx + 3, by + bh - 6, bw - 6, 3);
    ctx.fillStyle = '#ff2a2a';
    ctx.fillRect(bx + 3, by + bh - 6, (bw - 6) * progress, 3);
  }
}

function drawPet(
  ctx: CanvasRenderingContext2D,
  mood: PetMood,
  mouse: { x: number; y: number },
  anim: AnimState,
  time: number,
  stretchX: number,
  interactionMode: string,
  world: WorldSnapshot,
) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const cx = CANVAS_SIZE / 2 + anim.patrolX + anim.dragOffsetX;
  const cy = CANVAS_SIZE / 2 + 24 + anim.bobPhase + anim.bounceY + anim.surprisedJump + anim.patrolY + anim.dragOffsetY;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(stretchX, 1);

  // 阴影
  ctx.fillStyle = 'rgba(255,42,42,0.08)';
  ctx.beginPath();
  ctx.ellipse(0, 52, 32, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 尾巴
  const tailWag = mood === 'happy' ? 0.35 : mood === 'patrol' ? 0.2 : 0.12;
  ctx.strokeStyle = '#ff2a2a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-20, 22);
  for (let i = 0; i < 4; i++) {
    ctx.lineTo(-30 - i * 9, 22 + Math.sin(anim.tailPhase + i * 0.8) * (9 + i * 2) * tailWag);
  }
  ctx.stroke();

  // 身体
  ctx.fillStyle = '#1a0505';
  ctx.strokeStyle = '#ff2a2a';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#ff2a2a';
  ctx.shadowBlur = 8;
  roundRect(ctx, -24, -12, 48, 56, 7);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 肚皮显示屏
  drawBellyDisplay(ctx, mood, anim, world, time);

  // 头部
  ctx.save();
  ctx.translate(0, -32 + anim.headTilt);
  ctx.rotate(anim.headTilt * 0.02);

  ctx.fillStyle = '#1a0505';
  ctx.strokeStyle = '#ff2a2a';
  ctx.lineWidth = 1.5;
  roundRect(ctx, -28, -30, 56, 38, 9);
  ctx.fill();
  ctx.stroke();

  // 耳朵 — 左完整，右缺角
  ctx.fillStyle = '#1a0505';
  ctx.strokeStyle = '#ff2a2a';
  ctx.beginPath();
  ctx.moveTo(-28, -18);
  ctx.lineTo(-38, -38);
  ctx.lineTo(-18, -28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(28, -18);
  ctx.lineTo(38, -38);
  ctx.lineTo(22, -28);
  ctx.lineTo(30, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 天线 — 灰线 + 红球
  const antennaGlow = anim.antennaBlink ? 1 : 0.4;
  [-18, 18].forEach((ax, i) => {
    ctx.strokeStyle = '#71717a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, -30);
    const tipY = -46 - (mood === 'curious' && i === 0 ? 8 : 0);
    ctx.lineTo(ax + (i === 0 ? -3 : 3), tipY);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,42,42,${antennaGlow})`;
    ctx.beginPath();
    ctx.arc(ax + (i === 0 ? -3 : 3), tipY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 眼睛 — curious 时为望远镜（同心圆）
  const eyeOpen = mood === 'sleepy' ? 0.35 : mood === 'surprised' ? 1.25 : 1;
  const blinkScale = interactionMode === 'timeFrozen' && anim.timeFreezeBlink > 0 ? 0.1 : 1 - anim.blinkProgress;
  const pupilPullX = interactionMode === 'emotionInject' ? anim.injectPullX : mouse.x * 4;
  const pupilPullY = interactionMode === 'emotionInject' ? anim.injectPullY : mouse.y * 3;

  [-11, 11].forEach((ex) => {
    const eyeH = (mood === 'sleepy' ? 5 : 11) * eyeOpen * blinkScale;
    ctx.fillStyle = '#0a0000';
    ctx.strokeStyle = '#ff2a2a';
    ctx.lineWidth = 1;

    if (mood === 'curious') {
      ctx.beginPath();
      ctx.arc(ex, -15, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, -15, 5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      roundRect(ctx, ex - 8, -16, 16, Math.max(1, eyeH), 3);
      ctx.fill();
      ctx.stroke();
    }

    if (eyeH > 2) {
      ctx.fillStyle = mood === 'happy' ? '#ffd700' : '#ff2a2a';
      ctx.beginPath();
      ctx.arc(ex + pupilPullX, -11 + pupilPullY, mood === 'surprised' ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 嘴
  ctx.strokeStyle = '#ff2a2a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (mood === 'happy') ctx.arc(0, -2, 9, 0.1 * Math.PI, 0.9 * Math.PI);
  else if (mood === 'surprised') ctx.arc(0, 0, 5, 0, Math.PI * 2);
  else if (mood === 'sleepy') { ctx.moveTo(-7, 0); ctx.lineTo(7, 0); }
  else { ctx.moveTo(-6, 2); ctx.lineTo(6, 2); }
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** 右下角 Canvas 2D 宠物 — 活体世界控制台 */
export default function BitChanCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimState>(initAnimState());
  const frameRef = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const lastClickTime = useRef(0);

  const {
    mood,
    mouse,
    worldSnapshot,
    interactionMode,
    petStretchX,
    triggerCurious,
    onPetInteract,
    startEmotionInject,
    endEmotionInject,
    startPetDrag,
    updatePetDrag,
    endPetDrag,
    triggerTimeFreeze,
  } = useBitChan();

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      onPetInteract();
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        ox: animRef.current.dragOffsetX,
        oy: animRef.current.dragOffsetY,
      };

      longPressTimer.current = setTimeout(() => {
        startEmotionInject();
      }, LONG_PRESS_MS);

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onPetInteract, startEmotionInject],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const anim = animRef.current;

      if (interactionMode === 'emotionInject') {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          anim.injectPullX = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
          anim.injectPullY = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
        }
        return;
      }

      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        if (!isDragging.current) {
          isDragging.current = true;
          startPetDrag();
        }
        anim.dragOffsetX = dragStart.current.ox + dx;
        anim.dragOffsetY = dragStart.current.oy + dy;
        updatePetDrag(anim.dragOffsetX, anim.dragOffsetY);
      }
    },
    [interactionMode, startPetDrag, updatePetDrag],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (interactionMode === 'emotionInject') {
        endEmotionInject();
        animRef.current.injectPullX = 0;
        animRef.current.injectPullY = 0;
      } else if (isDragging.current) {
        isDragging.current = false;
        endPetDrag();
        updatePetDrag(animRef.current.dragOffsetX, animRef.current.dragOffsetY);
      } else {
        const now = Date.now();
        if (now - lastClickTime.current < 350) {
          triggerTimeFreeze();
          animRef.current.timeFreezeBlink = 1;
        } else {
          triggerCurious();
        }
        lastClickTime.current = now;
      }

      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [interactionMode, endEmotionInject, endPetDrag, updatePetDrag, triggerTimeFreeze, triggerCurious],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;

    const loop = () => {
      frameRef.current += 1;
      const anim = animRef.current;
      const t = frameRef.current;

      anim.blinkTimer += 1;
      if (anim.blinkTimer >= anim.nextBlink) {
        anim.blinkProgress = Math.min(1, anim.blinkProgress + 0.15);
        if (anim.blinkProgress >= 1) {
          anim.blinkProgress = Math.max(0, anim.blinkProgress - 0.2);
          if (anim.blinkProgress <= 0) {
            anim.blinkTimer = 0;
            anim.nextBlink = 120 + Math.random() * 200;
          }
        }
      }

      if (anim.timeFreezeBlink > 0) anim.timeFreezeBlink -= 0.05;

      anim.antennaTimer -= 1;
      if (anim.antennaTimer <= 0) {
        anim.antennaBlink = !anim.antennaBlink;
        anim.antennaTimer = anim.antennaBlink ? 8 : 60 + Math.random() * 120;
      }

      anim.bobPhase = Math.sin(t * 0.04) * (mood === 'happy' ? 5 : 2.5);
      anim.tailPhase += mood === 'happy' ? 0.15 : 0.06;

      if (mood === 'surprised') anim.surprisedJump = -Math.abs(Math.sin(t * 0.2)) * 14;
      else anim.surprisedJump *= 0.85;

      if (mood === 'curious') anim.headTilt = Math.sin(t * 0.05) * 7;
      else anim.headTilt *= 0.9;

      if (mood === 'working') anim.workingFrame += 1;

      if (mood === 'patrol') {
        const dx = anim.patrolTargetX - anim.patrolX;
        const dy = anim.patrolTargetY - anim.patrolY;
        anim.patrolX += dx * 0.02;
        anim.patrolY += dy * 0.02;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
          anim.patrolTargetX = (Math.random() - 0.5) * 60;
          anim.patrolTargetY = (Math.random() - 0.5) * 40;
        }
      } else {
        anim.patrolX *= 0.95;
        anim.patrolY *= 0.95;
      }

      drawPet(ctx, mood, mouse, anim, t * 0.016, petStretchX, interactionMode, worldSnapshot);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mood, mouse, petStretchX, interactionMode, worldSnapshot]);

  return (
    <div
      ref={containerRef}
      className="fixed z-10 pointer-events-auto select-none"
      style={{ right: 40, bottom: 40, width: DISPLAY_SIZE, height: DISPLAY_SIZE }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="img"
      aria-label="Bit-chan 赛博宠物控制台"
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE, imageRendering: 'auto' }}
        className={interactionMode === 'emotionInject' ? 'cursor-grabbing' : 'cursor-grab'}
      />
    </div>
  );
}

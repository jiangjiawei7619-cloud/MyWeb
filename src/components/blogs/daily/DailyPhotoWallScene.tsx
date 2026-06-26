import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import DailyPhotoPlane, {
  type DailyPhotoHoverPayload,
} from '@/components/blogs/daily/DailyPhotoPlane';
import {
  PERFORMANCE_CONFIG,
  WALL_CONFIG,
  type DailyPhoto,
  type DailyWallDebugMetrics,
} from '@/components/blogs/daily/dailyPhotoWallData';

type DailyPhotoWallSceneProps = {
  photos: DailyPhoto[];
  active: boolean;
  reducedMotion: boolean;
  isMobile: boolean;
  debug: boolean;
  onHover: (payload: DailyPhotoHoverPayload | null) => void;
  onSelect: (photo: DailyPhoto) => void;
  onDebugMetrics?: (metrics: DailyWallDebugMetrics) => void;
};

function makeFallbackTexture(photo: DailyPhoto, index: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const accent = photo.accent === 'violet' ? '#a66cff' : photo.accent === 'red' ? '#ff5357' : '#41f4ff';
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#050507');
    gradient.addColorStop(0.55, '#12050a');
    gradient.addColorStop(1, '#02090b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.42;
    for (let y = 16; y < canvas.height; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y + index) * 3);
      ctx.lineTo(canvas.width, y + Math.cos(y + index) * 3);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.85;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
    ctx.font = '700 28px monospace';
    ctx.fillStyle = accent;
    ctx.fillText('BROKEN_SIGNAL', 38, 132);
    ctx.font = '600 15px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.76)';
    ctx.fillText(photo.title.toUpperCase().slice(0, 28), 38, 164);
    ctx.fillStyle = 'rgba(156,248,255,0.72)';
    ctx.fillText(`IMAGE_OFFLINE // ${photo.date}`, 38, 196);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function buildFallbackMap(photos: DailyPhoto[]) {
  const fallbackMap = new Map<string, THREE.Texture>();
  photos.forEach((photo, index) => {
    if (!fallbackMap.has(photo.src)) {
      fallbackMap.set(photo.src, makeFallbackTexture(photo, index));
    }
  });
  return fallbackMap;
}

function loadTexture(loader: THREE.TextureLoader, src: string, anisotropy: number) {
  return new Promise<[string, THREE.Texture | null]>((resolve) => {
    loader.load(
      src,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.anisotropy = anisotropy;
        texture.needsUpdate = true;
        resolve([src, texture]);
      },
      undefined,
      () => resolve([src, null]),
    );
  });
}

export default function DailyPhotoWallScene({
  photos,
  active,
  reducedMotion,
  isMobile,
  debug,
  onHover,
  onSelect,
  onDebugMetrics,
}: DailyPhotoWallSceneProps) {
  const { gl, size, viewport } = useThree();
  const targetScrollRef = useRef(0);
  const currentScrollRef = useRef(0);
  const velocityRef = useRef(0);
  const smoothVelocityRef = useRef(0);
  const curveStrengthRef = useRef(0.12);
  const liftRef = useRef(0);
  const debugTimerRef = useRef(0);

  const tabletLayout = !isMobile && size.width < 980;
  const runtimeConfig = useMemo(() => {
    if (isMobile) {
      const columns = 3;
      const planeWidth = 1.08;
      const gapX = Math.max(1.36, (viewport.width * 1.08 - planeWidth) / Math.max(columns - 1, 1));

      return {
        ...WALL_CONFIG,
        columns,
        gapX,
        gapY: 1.06,
        planeWidth,
        planeHeight: 0.72,
        autoScrollSpeed: WALL_CONFIG.autoScrollSpeed * 0.58,
        maxCurve: WALL_CONFIG.maxCurve * 0.45,
        maxLift: WALL_CONFIG.maxLift * 0.45,
        shaderDistortionStrength: WALL_CONFIG.shaderDistortionStrength * 0.42,
      };
    }

    if (tabletLayout) {
      const columns = 5;
      const planeWidth = 1.48;
      const gapX = Math.max(1.78, (viewport.width * 1.12 - planeWidth) / Math.max(columns - 1, 1));

      return {
        ...WALL_CONFIG,
        columns,
        gapX,
        gapY: 1.24,
        planeWidth,
        planeHeight: 0.88,
        autoScrollSpeed: WALL_CONFIG.autoScrollSpeed * 0.76,
        maxCurve: WALL_CONFIG.maxCurve * 0.68,
        maxLift: WALL_CONFIG.maxLift * 0.7,
        shaderDistortionStrength: WALL_CONFIG.shaderDistortionStrength * 0.72,
      };
    }

    return {
      ...WALL_CONFIG,
      gapX: Math.max(
        WALL_CONFIG.gapX,
        (viewport.width * 1.14 - WALL_CONFIG.planeWidth) / Math.max(WALL_CONFIG.columns - 1, 1),
      ),
    };
  }, [isMobile, tabletLayout, viewport.width]);

  const maxPhotos = isMobile
    ? PERFORMANCE_CONFIG.mobileMaxPhotos
    : tabletLayout
      ? 24
      : PERFORMANCE_CONFIG.desktopMaxPhotos;

  const visiblePhotos = useMemo(() => photos.slice(0, maxPhotos), [maxPhotos, photos]);
  const baseRows = Math.max(1, Math.ceil(visiblePhotos.length / runtimeConfig.columns));
  const minimumRows = Math.max(
    baseRows,
    Math.ceil((viewport.height + runtimeConfig.gapY * 5.5) / runtimeConfig.gapY),
  );
  const totalRows = Math.max(baseRows, minimumRows);
  const totalSlots = totalRows * runtimeConfig.columns;
  const wallPhotos = useMemo(() => {
    if (!visiblePhotos.length) return [];

    return Array.from({ length: totalSlots }, (_, slotIndex) => ({
      photo: visiblePhotos[slotIndex % visiblePhotos.length],
      sourceIndex: slotIndex % visiblePhotos.length,
      slotIndex,
    }));
  }, [totalSlots, visiblePhotos]);
  const fallbackTextures = useMemo(() => buildFallbackMap(visiblePhotos), [visiblePhotos]);
  const [textureMap, setTextureMap] = useState<Map<string, THREE.Texture>>(() => new Map(fallbackTextures));

  useEffect(() => {
    setTextureMap(new Map(fallbackTextures));
    const loader = new THREE.TextureLoader();
    const uniqueSources = Array.from(new Set(visiblePhotos.map((photo) => photo.src)));
    const loadedTextures: THREE.Texture[] = [];
    let cancelled = false;

    Promise.all(uniqueSources.map((src) => loadTexture(loader, src, Math.min(4, gl.capabilities.getMaxAnisotropy())))).then(
      (entries) => {
        if (cancelled) {
          entries.forEach(([, texture]) => texture?.dispose());
          return;
        }

        const nextMap = new Map(fallbackTextures);
        entries.forEach(([src, texture]) => {
          if (!texture) return;
          loadedTextures.push(texture);
          nextMap.set(src, texture);
        });
        setTextureMap(nextMap);
      },
    );

    return () => {
      cancelled = true;
      loadedTextures.forEach((texture) => texture.dispose());
    };
  }, [fallbackTextures, gl.capabilities, visiblePhotos]);

  useEffect(() => {
    return () => {
      fallbackTextures.forEach((texture) => texture.dispose());
    };
  }, [fallbackTextures]);

  const planeGeometry = useMemo(
    () => new THREE.PlaneGeometry(runtimeConfig.planeWidth, runtimeConfig.planeHeight, 4, 24),
    [runtimeConfig.planeHeight, runtimeConfig.planeWidth],
  );

  useEffect(() => {
    return () => {
      planeGeometry.dispose();
    };
  }, [planeGeometry]);

  useEffect(() => {
    const domElement = gl.domElement;
    let pointerActive = false;
    let lastPointerY = 0;
    let pointerId = -1;

    const applyDelta = (deltaY: number, scale = 1) => {
      if (!active) return;
      const clampedDelta = THREE.MathUtils.clamp(
        deltaY,
        -runtimeConfig.maxScrollDelta,
        runtimeConfig.maxScrollDelta,
      );
      targetScrollRef.current += clampedDelta * scale;
      velocityRef.current = THREE.MathUtils.clamp(
        velocityRef.current + clampedDelta * 0.01,
        -runtimeConfig.maxScrollVelocity,
        runtimeConfig.maxScrollVelocity,
      );
    };

    const handleWheel = (event: WheelEvent) => {
      if (!active) return;
      event.preventDefault();
      applyDelta(event.deltaY, 0.003);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!active || event.pointerType === 'mouse') return;
      pointerActive = true;
      pointerId = event.pointerId;
      lastPointerY = event.clientY;
      domElement.setPointerCapture?.(pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerActive || event.pointerId !== pointerId) return;
      const deltaY = lastPointerY - event.clientY;
      lastPointerY = event.clientY;
      applyDelta(deltaY, 0.014);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerActive = false;
      domElement.releasePointerCapture?.(pointerId);
      pointerId = -1;
    };

    domElement.addEventListener('wheel', handleWheel, { passive: false });
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerup', handlePointerEnd);
    domElement.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      domElement.removeEventListener('wheel', handleWheel);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerup', handlePointerEnd);
      domElement.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [active, gl.domElement, runtimeConfig.maxScrollDelta, runtimeConfig.maxScrollVelocity]);

  const totalHeight = Math.max(totalRows * runtimeConfig.gapY, runtimeConfig.gapY * 6);
  const maxWallHalfHeight = Math.max(viewport.height * (isMobile ? 0.55 : 0.57), runtimeConfig.gapY * 2.3);

  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.05);

    if (active && !reducedMotion) {
      targetScrollRef.current += runtimeConfig.autoScrollSpeed * safeDelta;
    }

    currentScrollRef.current = THREE.MathUtils.damp(currentScrollRef.current, targetScrollRef.current, 6, safeDelta);
    smoothVelocityRef.current = THREE.MathUtils.damp(smoothVelocityRef.current, velocityRef.current, 4, safeDelta);
    velocityRef.current = THREE.MathUtils.damp(velocityRef.current, 0, 3, safeDelta);

    const speed = Math.min(Math.abs(smoothVelocityRef.current) / runtimeConfig.maxScrollVelocity, 1);
    const curveSpeed = Math.min(speed * 0.58, 0.58);
    const baseCurve = reducedMotion ? 0.035 : 0.12;
    const targetCurve = reducedMotion
      ? baseCurve + speed * 0.18
      : THREE.MathUtils.lerp(baseCurve, runtimeConfig.maxCurve, curveSpeed);
    const targetLift = reducedMotion
      ? speed * runtimeConfig.maxLift * 0.16
      : speed * runtimeConfig.maxLift * 0.68;

    curveStrengthRef.current = THREE.MathUtils.damp(curveStrengthRef.current, targetCurve, 5.5, safeDelta);
    liftRef.current = THREE.MathUtils.damp(liftRef.current, targetLift, 5, safeDelta);

    if (debug && onDebugMetrics && state.clock.elapsedTime - debugTimerRef.current > 0.24) {
      debugTimerRef.current = state.clock.elapsedTime;
      onDebugMetrics({
        scrollVelocity: smoothVelocityRef.current,
        curveStrength: curveStrengthRef.current,
        visiblePhotoCount: wallPhotos.length,
        currentScroll: currentScrollRef.current,
        fps: Math.round(1 / Math.max(safeDelta, 0.001)),
        wallBounds: `${runtimeConfig.columns}x${totalRows} / ${totalHeight.toFixed(2)}`,
      });
    }
  });

  return (
    <group position={[0, isMobile ? 0.08 : -0.05, 0]}>
      {wallPhotos.map(({ photo, sourceIndex, slotIndex }) => (
        <DailyPhotoPlane
          key={`${photo.id}-${slotIndex}`}
          photo={photo}
          index={slotIndex}
          sourceIndex={sourceIndex}
          totalRows={totalRows}
          texture={textureMap.get(photo.src) ?? fallbackTextures.get(photo.src)!}
          config={runtimeConfig}
          totalHeight={totalHeight}
          maxWallHalfHeight={maxWallHalfHeight}
          planeGeometry={planeGeometry}
          currentScrollRef={currentScrollRef}
          smoothVelocityRef={smoothVelocityRef}
          curveStrengthRef={curveStrengthRef}
          liftRef={liftRef}
          reducedMotion={reducedMotion}
          enableShaderDistortion={PERFORMANCE_CONFIG.enableShaderDistortion && !isMobile}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DailyPhotoOverlay from '@/components/blogs/daily/DailyPhotoOverlay';
import DailyPhotoWallHud from '@/components/blogs/daily/DailyPhotoWallHud';
import DailyPhotoWallScene from '@/components/blogs/daily/DailyPhotoWallScene';
import type { DailyPhotoHoverPayload } from '@/components/blogs/daily/DailyPhotoPlane';
import {
  DEBUG_DAILY_WALL,
  PERFORMANCE_CONFIG,
  dailyPhotos,
  type DailyPhoto,
  type DailyWallDebugMetrics,
} from '@/components/blogs/daily/dailyPhotoWallData';

type HoverState = {
  photo: DailyPhoto;
  x: number;
  y: number;
};

function canUseWebGL() {
  if (typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function DailyPhotoWallFallback({
  photos,
  onSelect,
}: {
  photos: DailyPhoto[];
  onSelect: (photo: DailyPhoto) => void;
}) {
  return (
    <div className="daily-photo-wall-fallback" role="list" aria-label="Daily photo fallback grid">
      {photos.map((photo) => (
        <button
          key={photo.id}
          type="button"
          className={`daily-photo-wall-fallback__tile daily-photo-wall-fallback__tile--${photo.accent ?? 'cyan'}`}
          onClick={() => onSelect(photo)}
          role="listitem"
        >
          <span
            className="daily-photo-wall-fallback__image"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(5, 5, 8, 0.08), rgba(5, 5, 8, 0.46)), url("${photo.src}")`,
            }}
            aria-hidden
          />
          <span className="daily-photo-wall-fallback__meta">
            <span>{photo.date}</span>
            <strong>{photo.title}</strong>
          </span>
        </button>
      ))}
    </div>
  );
}

export default function DailyPhotoWall() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<DailyPhoto | null>(null);
  const [hoveredPhoto, setHoveredPhoto] = useState<HoverState | null>(null);
  const [webglAvailable, setWebglAvailable] = useState(canUseWebGL);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [debugMetrics, setDebugMetrics] = useState<DailyWallDebugMetrics | null>(null);

  useEffect(() => {
    setWebglAvailable(canUseWebGL());

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 760px), (pointer: coarse)');

    const syncPreferences = () => {
      setReducedMotion(PERFORMANCE_CONFIG.reduceMotionFallback && motionQuery.matches);
      setIsMobile(mobileQuery.matches);
    };

    syncPreferences();
    motionQuery.addEventListener('change', syncPreferences);
    mobileQuery.addEventListener('change', syncPreferences);

    return () => {
      motionQuery.removeEventListener('change', syncPreferences);
      mobileQuery.removeEventListener('change', syncPreferences);
    };
  }, []);

  const fallbackPhotos = useMemo(
    () => dailyPhotos.slice(0, isMobile ? PERFORMANCE_CONFIG.mobileMaxPhotos : PERFORMANCE_CONFIG.desktopMaxPhotos),
    [isMobile],
  );

  const handleHover = useCallback((payload: DailyPhotoHoverPayload | null) => {
    if (!payload) {
      setHoveredPhoto(null);
      return;
    }

    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    setHoveredPhoto({
      photo: payload.photo,
      x: payload.clientX - bounds.left,
      y: payload.clientY - bounds.top,
    });
  }, []);

  const handleSelect = useCallback((photo: DailyPhoto) => {
    setHoveredPhoto(null);
    setSelectedPhoto(photo);
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setSelectedPhoto(null);
  }, []);

  return (
    <section className="daily-photo-wall" ref={containerRef} onPointerLeave={() => setHoveredPhoto(null)}>
      <div className="daily-photo-wall__backdrop" aria-hidden />
      <div className="daily-photo-wall__scanlines" aria-hidden />

      <DailyPhotoWallHud
        photoCount={fallbackPhotos.length}
        reducedMotion={reducedMotion}
        webglAvailable={webglAvailable}
        metrics={debugMetrics}
      />

      <div className="daily-photo-wall__stage">
        {webglAvailable ? (
          <Canvas
            className="daily-photo-wall__canvas"
            camera={{
              position: [0, 0, isMobile ? 8.2 : 9.2],
              fov: isMobile ? 48 : 47,
              near: 0.1,
              far: 50,
            }}
            dpr={[1, PERFORMANCE_CONFIG.maxDpr]}
            gl={{
              alpha: true,
              antialias: false,
              depth: true,
              powerPreference: 'high-performance',
              stencil: false,
            }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            <DailyPhotoWallScene
              photos={dailyPhotos}
              active={!selectedPhoto}
              reducedMotion={reducedMotion}
              isMobile={isMobile}
              debug={DEBUG_DAILY_WALL}
              onHover={handleHover}
              onSelect={handleSelect}
              onDebugMetrics={setDebugMetrics}
            />
          </Canvas>
        ) : (
          <DailyPhotoWallFallback photos={fallbackPhotos} onSelect={handleSelect} />
        )}
      </div>

      {hoveredPhoto && !selectedPhoto && (
        <div
          className={`daily-photo-tooltip daily-photo-tooltip--${hoveredPhoto.photo.accent ?? 'cyan'}`}
          style={{
            transform: `translate3d(${hoveredPhoto.x + 16}px, ${hoveredPhoto.y + 16}px, 0)`,
          }}
        >
          <span>{hoveredPhoto.photo.date}</span>
          <strong>{hoveredPhoto.photo.title}</strong>
        </div>
      )}

      <DailyPhotoOverlay photo={selectedPhoto} onClose={handleCloseOverlay} />
    </section>
  );
}

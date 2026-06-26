import {
  DEBUG_DAILY_WALL,
  type DailyWallDebugMetrics,
} from '@/components/blogs/daily/dailyPhotoWallData';

type DailyPhotoWallHudProps = {
  photoCount: number;
  reducedMotion: boolean;
  webglAvailable: boolean;
  metrics: DailyWallDebugMetrics | null;
};

export default function DailyPhotoWallHud({
  photoCount,
  reducedMotion,
  webglAvailable,
  metrics,
}: DailyPhotoWallHudProps) {
  const signal = reducedMotion ? 'STATIC' : webglAvailable ? 'IDLE' : 'FALLBACK';

  return (
    <div className="daily-photo-wall-hud" aria-hidden>
      <div className="daily-photo-wall-hud__status">
        <span>SIGNAL: {signal}</span>
        <span>ARCHIVE STREAM</span>
        <span>{photoCount.toString().padStart(2, '0')} FRAMES</span>
      </div>

      {DEBUG_DAILY_WALL && metrics && (
        <div className="daily-photo-wall-hud__debug">
          <span>SCROLL_VELOCITY {metrics.scrollVelocity.toFixed(3)}</span>
          <span>CURVATURE {metrics.curveStrength.toFixed(3)}</span>
          <span>VISIBLE {metrics.visiblePhotoCount}</span>
          <span>CURRENT_SCROLL {metrics.currentScroll.toFixed(2)}</span>
          <span>FPS {metrics.fps}</span>
          <span>BOUNDS {metrics.wallBounds}</span>
        </div>
      )}
    </div>
  );
}

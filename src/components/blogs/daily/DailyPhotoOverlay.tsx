import { useEffect, useState } from 'react';
import type { DailyPhoto } from '@/components/blogs/daily/dailyPhotoWallData';

type DailyPhotoOverlayProps = {
  photo: DailyPhoto | null;
  onClose: () => void;
};

export default function DailyPhotoOverlay({ photo, onClose }: DailyPhotoOverlayProps) {
  const [imageOffline, setImageOffline] = useState(false);

  useEffect(() => {
    setImageOffline(false);
    if (!photo) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, photo]);

  if (!photo) return null;

  return (
    <div className="daily-photo-overlay" role="dialog" aria-modal="true" aria-label={`${photo.title} detail`}>
      <button type="button" className="daily-photo-overlay__scrim" aria-label="Close photo detail" onClick={onClose} />
      <section className="daily-photo-overlay__panel">
        <button type="button" className="daily-photo-overlay__close" aria-label="Close photo detail" onClick={onClose}>
          <span className="material-symbols-outlined" aria-hidden>
            close
          </span>
        </button>

        <div className="daily-photo-overlay__media">
          {imageOffline ? (
            <div className="daily-photo-overlay__offline">
              <span>BROKEN_SIGNAL</span>
              <small>IMAGE_OFFLINE</small>
            </div>
          ) : (
            <img src={photo.src} alt={photo.title} loading="eager" onError={() => setImageOffline(true)} />
          )}
        </div>

        <div className="daily-photo-overlay__content">
          <span className="daily-photo-overlay__date">{photo.date}</span>
          <h3>{photo.title}</h3>
          {photo.description && <p>{photo.description}</p>}
          {photo.tags && photo.tags.length > 0 && (
            <div className="daily-photo-overlay__tags">
              {photo.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

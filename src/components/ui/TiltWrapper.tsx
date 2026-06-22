import { useEffect, useRef, ReactNode } from 'react';
import { useWorksWorldMode } from '@/lib/works-world-mode-context';
import { initTilt } from '@/utils/tilt';

interface TiltWrapperProps {
  children: ReactNode;
  className?: string;
  maxRotation?: number;
}

export default function TiltWrapper({ children, className = '', maxRotation = 5 }: TiltWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worksWorldMode = useWorksWorldMode();

  useEffect(() => {
    const el = containerRef.current;
    if (!el || worksWorldMode) return;

    const { destroy } = initTilt(el, { maxRotation, lerp: 0.06 });
    return () => {
      destroy();
    };
  }, [maxRotation, worksWorldMode]);

  return (
    <div
      ref={containerRef}
      className={`tilt-container ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        WebkitFontSmoothing: 'antialiased'
      }}
    >
      {children}
    </div>
  );
}

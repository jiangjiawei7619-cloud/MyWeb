import { useEffect, useRef, ReactNode } from 'react';
import { initTilt } from '@/utils/tilt';

interface TiltWrapperProps {
  children: ReactNode;
  className?: string;
  maxRotation?: number;
}

export default function TiltWrapper({ children, className = '', maxRotation = 5 }: TiltWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initialize 3D tilting controller on mount with 0.06 lerp damping
    const { destroy } = initTilt(el, { maxRotation, lerp: 0.06 });
    return () => {
      destroy();
    };
  }, [maxRotation]);

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

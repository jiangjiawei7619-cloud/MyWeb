/**
 * tilt.ts
 *
 * A lightweight, high-performance module implementing a subtle, fluid 3D tilt
 * effect using native JS + CSS (RequestAnimationFrame + linear interpolation).
 * Supports layered depth rendering through transform-style: preserve-3d.
 */

export interface TiltOptions {
  maxRotation?: number; // Maximum tilting angle in degrees (not exceeding 5 degrees)
  lerp?: number;        // Momentum lerp damping index (default 0.06)
}

export function initTilt(element: HTMLElement, options: TiltOptions = {}) {
  // Increase tilt amplitude by 20% as requested
  const maxRot = (options.maxRotation ?? 5) * 1.2;
  const lerpCoeff = options.lerp ?? 0.06;

  // Gracefully disable on touch/mobile devices or when prefers-reduced-motion is active
  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const wantsReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (isTouchDevice || wantsReducedMotion) {
    return { destroy: () => {} };
  }

  let active = true; // Always active for fullscreen trigger
  let mouseX = 0; // Relative horizontal mouse positioning scaled from -1 to 1
  let mouseY = 0; // Relative vertical mouse positioning scaled from -1 to 1

  let rotX = 0;   // Current interpolated X rotation degree
  let rotY = 0;   // Current interpolated Y rotation degree
  let rafId: number | null = null;

  // Fullscreen mouse position tracking
  const onMouseMove = (e: MouseEvent) => {
    // Convert mouse coordinates into centered proportions (-1.0 to 1.0) using window dimensions
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  };

  const update = () => {
    // Generate targets. Both axes tilt upward (closer to the viewer's face) at the mouse's relative coordinate.
    const targetRotX = active ? mouseY * maxRot : 0;
    const targetRotY = active ? mouseX * maxRot : 0;

    // Linear interpolation
    rotX += (targetRotX - rotX) * lerpCoeff;
    rotY += (targetRotY - rotY) * lerpCoeff;

    // Apply the computed perspective matrix
    element.style.transform = `perspective(1500px) rotateX(${rotX.toFixed(3)}deg) rotateY(${rotY.toFixed(3)}deg)`;

    rafId = requestAnimationFrame(update);
  };

  // Configure target optimization flags
  element.style.willChange = 'transform';
  element.style.transformStyle = 'preserve-3d';

  // Bind event listeners to window for fullscreen coverage
  window.addEventListener('mousemove', onMouseMove);

  // Kickoff frame loop
  rafId = requestAnimationFrame(update);

  const destroy = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    window.removeEventListener('mousemove', onMouseMove);
    element.style.transform = '';
  };

  return { destroy };
}

import { useLoadingFaceMotion } from '@/components/loading/useLoadingFaceMotion';
import { getLoadingFaceMouthPathD } from '@/lib/loading-face-visual';

const LOADING_MOUTH_PATH = getLoadingFaceMouthPathD();

type LoadingFaceProps = {
  active?: boolean;
};

export default function LoadingFace({ active = true }: LoadingFaceProps) {
  const { neckY, tiltZ, tiltX, eyesClosed, refreshing, surfaceRef } = useLoadingFaceMotion(active);

  const eyeClass = (side: 'left' | 'right') =>
    [
      'loading-face__eye',
      `loading-face__eye--${side}`,
      eyesClosed ? 'loading-face__eye--closed' : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div className="loading-face-turn">
      <div
        className="loading-face-turn__neck"
        style={{ transform: `rotateY(${neckY}deg)` }}
      >
        <div className="loading-face-turn__head">
          <div
            className="loading-face-turn__tilt"
            style={{ transform: `rotateZ(${tiltZ}deg) rotateX(${tiltX}deg)` }}
          >
            <div
              ref={surfaceRef}
              className={[
                'loading-face-turn__surface',
                refreshing ? 'loading-face-turn__surface--refresh' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <svg
                className="loading-face"
                viewBox="0 0 200 200"
                overflow="visible"
                aria-hidden
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <radialGradient id="loading-eye-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="68%" stopColor="#fff8f9" stopOpacity="0.94" />
                    <stop offset="88%" stopColor="#ff5a78" stopOpacity="0.26" />
                    <stop offset="100%" stopColor="#ff1e4a" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="loading-eye-diffuse" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff8aa0" stopOpacity="0.32" />
                    <stop offset="42%" stopColor="#ff4d6d" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#ff1e4a" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="loading-eye-diffuse-inner" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff8aa0" stopOpacity="0.16" />
                    <stop offset="48%" stopColor="#ff4d6d" stopOpacity="0.07" />
                    <stop offset="100%" stopColor="#ff1e4a" stopOpacity="0" />
                  </radialGradient>
                  <filter
                    id="loading-eye-atmosphere"
                    x="-180%"
                    y="-180%"
                    width="460%"
                    height="460%"
                    colorInterpolationFilters="sRGB"
                  >
                    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="bloomFar" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="bloomMid" />
                    <feMerge>
                      <feMergeNode in="bloomFar" />
                      <feMergeNode in="bloomMid" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter
                    id="loading-mouth-atmosphere"
                    x="-160%"
                    y="-160%"
                    width="420%"
                    height="420%"
                    colorInterpolationFilters="sRGB"
                  >
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="bloomFar" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="bloomMid" />
                    <feMerge>
                      <feMergeNode in="bloomFar" />
                      <feMergeNode in="bloomMid" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient
                    id="loading-mouth-glow"
                    gradientUnits="userSpaceOnUse"
                    x1="68"
                    y1="128"
                    x2="132"
                    y2="128"
                  >
                    <stop offset="0%" stopColor="#ff6b88" stopOpacity="0.62" />
                    <stop offset="32%" stopColor="#fff0f3" stopOpacity="0.88" />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity="0.96" />
                    <stop offset="68%" stopColor="#fff0f3" stopOpacity="0.88" />
                    <stop offset="100%" stopColor="#ff6b88" stopOpacity="0.62" />
                  </linearGradient>
                </defs>
                <g className="loading-face__eyes">
                  <g className={eyeClass('left')}>
                    <g filter="url(#loading-eye-atmosphere)">
                      <circle
                        className="loading-face__eye-diffuse loading-face__eye-diffuse--outer"
                        cx="59"
                        cy="78"
                        r="56"
                        fill="url(#loading-eye-diffuse)"
                      />
                      <circle
                        className="loading-face__eye-diffuse loading-face__eye-diffuse--mid"
                        cx="59"
                        cy="78"
                        r="42"
                        fill="url(#loading-eye-diffuse-inner)"
                      />
                      <circle
                        className="loading-face__eye-halo"
                        cx="59"
                        cy="78"
                        r="28"
                        fill="url(#loading-eye-glow)"
                      />
                      <circle className="loading-face__eye-core" cx="59" cy="78" r="18" fill="#ffffff" />
                    </g>
                  </g>
                  <g className={eyeClass('right')}>
                    <g filter="url(#loading-eye-atmosphere)">
                      <circle
                        className="loading-face__eye-diffuse loading-face__eye-diffuse--outer"
                        cx="141"
                        cy="78"
                        r="56"
                        fill="url(#loading-eye-diffuse)"
                      />
                      <circle
                        className="loading-face__eye-diffuse loading-face__eye-diffuse--mid"
                        cx="141"
                        cy="78"
                        r="42"
                        fill="url(#loading-eye-diffuse-inner)"
                      />
                      <circle
                        className="loading-face__eye-halo"
                        cx="141"
                        cy="78"
                        r="28"
                        fill="url(#loading-eye-glow)"
                      />
                      <circle className="loading-face__eye-core" cx="141" cy="78" r="18" fill="#ffffff" />
                    </g>
                  </g>
                </g>
                <g className="loading-face__mouth-group">
                  <g filter="url(#loading-mouth-atmosphere)">
                    <path
                      className="loading-face__mouth-diffuse loading-face__mouth-diffuse--outer"
                      d={LOADING_MOUTH_PATH}
                      fill="none"
                      stroke="#ff5a78"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      className="loading-face__mouth-diffuse loading-face__mouth-diffuse--mid"
                      d={LOADING_MOUTH_PATH}
                      fill="none"
                      stroke="#ff6b88"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      className="loading-face__mouth-body"
                      d={LOADING_MOUTH_PATH}
                      fill="none"
                      stroke="url(#loading-mouth-glow)"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      className="loading-face__mouth-highlight"
                      d={LOADING_MOUTH_PATH}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="0.9"
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                    />
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

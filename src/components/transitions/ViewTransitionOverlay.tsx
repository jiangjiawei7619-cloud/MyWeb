export type ViewTransitionPhase = 'idle' | 'enter' | 'exit';

type ViewTransitionOverlayProps = {
  phase: ViewTransitionPhase;
  label?: string;
};

export default function ViewTransitionOverlay({
  phase,
  label = 'ACCESSING: WORKS_ARCHIVE',
}: ViewTransitionOverlayProps) {
  if (phase === 'idle') return null;

  return (
    <div className={`view-transition-overlay ${phase}`} aria-hidden="true">
      <div className="view-transition-slice slice-a" />
      <div className="view-transition-slice slice-b" />
      <div className="view-transition-copy">
        <span>{label}</span>
        <span>SYNCING VIEWPORT</span>
        <span>NODE: building08:C</span>
      </div>
    </div>
  );
}

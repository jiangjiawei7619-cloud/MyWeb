import ExploreHologramPoster from '@/components/canvas/ExploreHologramPoster';
import { BUILDING01_SIGNAL_HOLOGRAM } from '@/lib/building01-signal-hologram-config';

export default function ExploreBuilding01SignalHologram() {
  return (
    <ExploreHologramPoster
      texturePath={BUILDING01_SIGNAL_HOLOGRAM.texturePath}
      placement={BUILDING01_SIGNAL_HOLOGRAM.placement}
      burst={BUILDING01_SIGNAL_HOLOGRAM.burst}
      signalDropout={BUILDING01_SIGNAL_HOLOGRAM.signalDropout}
    />
  );
}

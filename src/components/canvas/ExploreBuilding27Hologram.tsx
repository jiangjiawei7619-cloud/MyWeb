import ExploreHologramPoster from '@/components/canvas/ExploreHologramPoster';
import { BUILDING27_EVA_HOLOGRAM } from '@/lib/building27-hologram-config';

export default function ExploreBuilding27Hologram() {
  return (
    <ExploreHologramPoster
      texturePath={BUILDING27_EVA_HOLOGRAM.texturePath}
      placement={BUILDING27_EVA_HOLOGRAM.placement}
      burst={BUILDING27_EVA_HOLOGRAM.burst}
      reflect={BUILDING27_EVA_HOLOGRAM.reflect}
      breathing={BUILDING27_EVA_HOLOGRAM.breathing}
    />
  );
}

import ExploreHologramPoster from '@/components/canvas/ExploreHologramPoster';
import { BUILD04_EVA_HOLOGRAM } from '@/lib/build04-hologram-config';

export default function ExploreBuild04Hologram() {
  return (
    <ExploreHologramPoster
      texturePath={BUILD04_EVA_HOLOGRAM.texturePath}
      placement={BUILD04_EVA_HOLOGRAM.placement}
      burst={BUILD04_EVA_HOLOGRAM.burst}
      reflect={BUILD04_EVA_HOLOGRAM.reflect}
    />
  );
}

import ExploreHologramPoster from '@/components/canvas/ExploreHologramPoster';
import {
  getRebeccaHologramPlacement,
  REBECCA_GLITCH_BURST,
  REBECCA_LANDMARK,
} from '@/lib/rebecca-hologram-config';

export default function ExploreRebeccaHologram() {
  return (
    <ExploreHologramPoster
      texturePath={REBECCA_LANDMARK.texturePath}
      placement={getRebeccaHologramPlacement()}
      burst={REBECCA_GLITCH_BURST}
    />
  );
}

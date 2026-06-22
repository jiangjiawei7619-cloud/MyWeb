import ExploreHologramPoster from '@/components/canvas/ExploreHologramPoster';
import {
  BUILDING08_A_POSTER_BURST,
  BUILDING08_A_POSTER_TEXTURE,
  getBuilding08APosterPlacement,
} from '@/lib/building08-a-poster-config';

export default function Building08AFacePoster() {
  return (
    <ExploreHologramPoster
      texturePath={BUILDING08_A_POSTER_TEXTURE}
      placement={getBuilding08APosterPlacement()}
      burst={BUILDING08_A_POSTER_BURST}
      disableRgbLayers
    />
  );
}

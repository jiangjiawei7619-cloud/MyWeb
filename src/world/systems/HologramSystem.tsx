import { Suspense } from 'react';
import ExploreRebeccaHologram from '@/components/canvas/ExploreRebeccaHologram';
import ExploreBuilding01SignalHologram from '@/components/canvas/ExploreBuilding01SignalHologram';
import ExploreBuild04Hologram from '@/components/canvas/ExploreBuild04Hologram';
import ExploreBuilding27Hologram from '@/components/canvas/ExploreBuilding27Hologram';
import Building08AFacePoster from '@/components/canvas/Building08AFacePoster';

export default function HologramSystem() {
  return (
    <Suspense fallback={null}>
      <ExploreRebeccaHologram />
      <Building08AFacePoster />
      <ExploreBuilding01SignalHologram />
      <ExploreBuild04Hologram />
      <ExploreBuilding27Hologram />
    </Suspense>
  );
}

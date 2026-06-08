import CyberReflectiveTiles from '@/components/world/CyberReflectiveTiles';
import ExploreBrickGround from '@/components/canvas/ExploreBrickGround';
import CyberWetGround from '@/components/canvas/CyberWetGround';
import { EXPLORE_GROUND_REFLECTION } from '@/lib/explore-ground-reflection';
import type { PhysicsWorldBundle } from '@/physics/createPhysicsWorld';

function hasDebugParam(name: string): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get(name) === '1';
}

export default function ExploreGroundReflection({
  bundleRef,
}: {
  bundleRef: React.RefObject<PhysicsWorldBundle | null>;
}) {
  if (EXPLORE_GROUND_REFLECTION.groundMode === 'cyberReflective') {
    return (
      <CyberReflectiveTiles
        debug={hasDebugParam('debugTiles')}
        debugDepthFade={hasDebugParam('debugDepthFade')}
        debugFresnel={hasDebugParam('debugFresnel')}
        debugReflectionOnly={hasDebugParam('debugReflectionOnly')}
        debugMicroVariation={hasDebugParam('debugMicroVariation')}
      />
    );
  }

  return (
    <>
      <ExploreBrickGround />
      <CyberWetGround bundleRef={bundleRef} flat brickOverlay />
    </>
  );
}

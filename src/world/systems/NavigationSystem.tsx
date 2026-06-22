import WorldCameraRig from '@/world/WorldCameraRig';
import type { FirstPersonController } from '@/physics/firstPersonController';
import type { ActivePage } from '@/lib/types';

export default function NavigationSystem({
  activeSection,
  introActive,
  controllerRef,
  exploreEntryActiveRef,
}: {
  activeSection: ActivePage;
  introActive: boolean;
  controllerRef: React.RefObject<FirstPersonController | null>;
  exploreEntryActiveRef: React.RefObject<boolean>;
}) {
  return (
    <WorldCameraRig
      activeSection={activeSection}
      introActive={introActive}
      controllerRef={controllerRef}
      exploreEntryActiveRef={exploreEntryActiveRef}
    />
  );
}

import WorldCameraRig from '@/world/WorldCameraRig';
import type { FirstPersonController } from '@/physics/firstPersonController';
import type { ActivePage } from '@/lib/types';

export default function NavigationSystem({
  activeSection,
  controllerRef,
  exploreEntryActiveRef,
}: {
  activeSection: ActivePage;
  controllerRef: React.RefObject<FirstPersonController | null>;
  exploreEntryActiveRef: React.RefObject<boolean>;
}) {
  return (
    <WorldCameraRig
      activeSection={activeSection}
      controllerRef={controllerRef}
      exploreEntryActiveRef={exploreEntryActiveRef}
    />
  );
}

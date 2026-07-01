import SectionCameraRig from '@/components/canvas/SectionCameraRig';
import type { FirstPersonController } from '@/physics/firstPersonController';
import type { ActivePage } from '@/lib/types';

export default function WorldCameraRig({
  activeSection,
  controllerRef,
  exploreEntryActiveRef,
}: {
  activeSection: ActivePage;
  controllerRef: React.RefObject<FirstPersonController | null>;
  exploreEntryActiveRef: React.RefObject<boolean>;
}) {
  return (
    <SectionCameraRig
      activeSection={activeSection}
      controllerRef={controllerRef}
      exploreEntryActiveRef={exploreEntryActiveRef}
    />
  );
}

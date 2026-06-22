import SectionCameraRig from '@/components/canvas/SectionCameraRig';
import type { FirstPersonController } from '@/physics/firstPersonController';
import type { ActivePage } from '@/lib/types';

export default function WorldCameraRig({
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
    <SectionCameraRig
      activeSection={activeSection}
      introActive={introActive}
      controllerRef={controllerRef}
      exploreEntryActiveRef={exploreEntryActiveRef}
    />
  );
}

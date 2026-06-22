import WorksSurface from '@/components/canvas/WorksSurface';
import type { ActivePage } from '@/lib/types';

export default function PagePanelSystem({ activeSection }: { activeSection: ActivePage }) {
  return <WorksSurface activeSection={activeSection} />;
}

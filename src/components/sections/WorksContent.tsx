import { INITIAL_PROJECTS } from '@/lib/data';
import WorksSection from '@/components/sections/WorksSection';

export default function WorksContent({ active = true }: { active?: boolean }) {
  return <WorksSection projects={INITIAL_PROJECTS} active={active} />;
}

import { RenderBudgetProvider } from '@/world/RenderBudgetSystem';
import type { ActivePage } from '@/lib/types';

export default function WorldScene({
  activeSection,
  interactive,
  children,
}: React.PropsWithChildren<{
  activeSection: ActivePage;
  interactive: boolean;
}>) {
  return (
    <RenderBudgetProvider activeSection={activeSection} interactive={interactive}>
      {children}
    </RenderBudgetProvider>
  );
}

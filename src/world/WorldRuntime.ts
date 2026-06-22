import type { ActivePage } from '@/lib/types';
import type { RenderBudget } from '@/world/types';

export type WorldRuntimeState = {
  activeSection: ActivePage;
  interactive: boolean;
  budget: RenderBudget;
};

export type WorldSystemUpdater = {
  id: string;
  update: (delta: number, runtime: WorldRuntimeState) => void;
};

export class WorldRuntime {
  private readonly updaters = new Map<string, WorldSystemUpdater>();

  register(updater: WorldSystemUpdater): () => void {
    this.updaters.set(updater.id, updater);
    return () => {
      this.updaters.delete(updater.id);
    };
  }

  update(delta: number, runtime: WorldRuntimeState): void {
    for (const updater of this.updaters.values()) {
      updater.update(delta, runtime);
    }
  }
}

export const worldRuntime = new WorldRuntime();

import { geometryManager } from '@/world/resources/GeometryManager';
import { materialManager } from '@/world/resources/MaterialManager';
import { textureManager } from '@/world/resources/TextureManager';

export function disposeWorldResources(): void {
  textureManager.disposeAll();
  materialManager.disposeAll();
  geometryManager.disposeAll();
}

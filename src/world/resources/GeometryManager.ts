import * as THREE from 'three';
import { AssetManager } from '@/world/resources/AssetManager';

export const geometryManager = new AssetManager<THREE.BufferGeometry>();

export function registerGeometry<T extends THREE.BufferGeometry>(id: string, geometry: T): T {
  geometryManager.set({
    id,
    value: geometry,
    dispose: (value) => value.dispose(),
  });
  return geometry;
}

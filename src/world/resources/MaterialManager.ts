import * as THREE from 'three';
import { AssetManager } from '@/world/resources/AssetManager';

export const materialManager = new AssetManager<THREE.Material>();

export function registerMaterial<T extends THREE.Material>(id: string, material: T): T {
  materialManager.set({
    id,
    value: material,
    dispose: (value) => value.dispose(),
  });
  return material;
}

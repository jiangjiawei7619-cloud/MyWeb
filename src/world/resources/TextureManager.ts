import * as THREE from 'three';
import { AssetManager } from '@/world/resources/AssetManager';

export const textureManager = new AssetManager<THREE.Texture>();

export function registerTexture(id: string, texture: THREE.Texture): THREE.Texture {
  return textureManager.set({
    id,
    value: texture,
    dispose: (value) => value.dispose(),
  });
}

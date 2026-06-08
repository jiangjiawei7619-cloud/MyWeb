import * as THREE from 'three';
import { getBuildingTextureUrls } from '@/lib/explore-building-textures';
import { createHybridNeonPosterAtlas } from '@/lib/explore-neon-atlas';

let preloadPromise: Promise<void> | null = null;

/** 在加载动画播放期间并行预热 3D 资源 */
export function preloadExploreWorldAssets(): Promise<void> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    const loader = new THREE.TextureLoader();
    await Promise.all(
      getBuildingTextureUrls().map(
        (url) =>
          new Promise<void>((resolve) => {
            loader.load(url, () => resolve(), undefined, () => resolve());
          }),
      ),
    );
    await createHybridNeonPosterAtlas();
  })();

  return preloadPromise;
}

import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { getBuildingTextureUrls } from '@/lib/explore-building-textures';
import { createHybridNeonPosterAtlas } from '@/lib/explore-neon-atlas';
import { getObakeAvatarConfig } from '@/lib/obake-avatar-config';

let preloadPromise: Promise<void> | null = null;

/** 在加载动画播放期间并行预热 3D 资源（与 ExploreCyberCity useLoader 共用缓存） */
export function preloadExploreWorldAssets(): Promise<void> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    const urls = getBuildingTextureUrls();
    useLoader.preload(THREE.TextureLoader, urls);
    await Promise.all(
      urls.map(
        (url) =>
          new Promise<void>((resolve) => {
            new THREE.TextureLoader().load(url, () => resolve(), undefined, () => resolve());
          }),
      ),
    );
    await createHybridNeonPosterAtlas();
    const { modelPath } = getObakeAvatarConfig();
    await fetch(modelPath, { method: 'HEAD' }).catch(() => undefined);
  })();

  return preloadPromise;
}

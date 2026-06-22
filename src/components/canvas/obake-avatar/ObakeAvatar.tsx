import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { SkeletonHelper } from 'three';
import type { RefObject } from 'react';
import { getObakeAvatarConfig, OBAKE_AVATAR_LAYER } from '@/lib/obake-avatar-config';
import { applyObakeRenderLayer } from '@/components/canvas/obake-avatar/applyObakeAppearance';
import { loadVRMModel } from '@/components/canvas/obake-avatar/loadVRM';
import { ObakeAvatarController } from '@/components/canvas/obake-avatar/ObakeAvatarController';

type ObakeAvatarProps = {
  avatarControllerRef: RefObject<ObakeAvatarController | null>;
};

export default function ObakeAvatar({ avatarControllerRef }: ObakeAvatarProps) {
  const { gl, scene, camera } = useThree();
  const controller = useMemo(() => new ObakeAvatarController(), []);

  useLayoutEffect(() => {
    camera.layers.enable(OBAKE_AVATAR_LAYER);
  }, [camera]);

  useEffect(() => {
    avatarControllerRef.current = controller;
    return () => {
      avatarControllerRef.current = null;
    };
  }, [avatarControllerRef, controller]);

  useEffect(() => {
    const config = getObakeAvatarConfig();
    let cancelled = false;

    void (async () => {
      try {
        const vrm = await loadVRMModel(config.modelPath, gl);
        if (cancelled) return;

        if (config.enableDebugSkeleton) {
          const helper = new SkeletonHelper(vrm.scene);
          applyObakeRenderLayer(helper);
          vrm.scene.add(helper);
        }

        controller.attachVrm(vrm, config);
        scene.add(controller.root);
      } catch (error) {
        console.error('[ObakeAvatar] Failed to load VRM:', error);
      }
    })();

    return () => {
      cancelled = true;
      scene.remove(controller.root);
      controller.dispose();
    };
  }, [controller, gl, scene]);

  return null;
}

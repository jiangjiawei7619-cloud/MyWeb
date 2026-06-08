import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EXPLORE_DIFFUSE } from '@/lib/explore-lighting';

/** ACES 压高光；Bloom 只吃 poster 局部亮部，避免全屏洗白 */
export default function ExploreToneMapping() {
  const gl = useThree((s) => s.gl);

  useLayoutEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = EXPLORE_DIFFUSE.exposure;
  }, [gl]);

  return null;
}

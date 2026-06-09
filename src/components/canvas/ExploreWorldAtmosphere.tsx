import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EXPLORE_DISTANCE_LOD } from '@/lib/explore-distance-lod';

/** 与 CyberGrid 一致：指数雾 + 背景色 */
export default function ExploreWorldAtmosphere() {
  const { scene } = useThree();

  useEffect(() => {
    const fogColor = new THREE.Color(EXPLORE_DISTANCE_LOD.fogColor);
    scene.environment = null;
    scene.fog = new THREE.FogExp2(fogColor, EXPLORE_DISTANCE_LOD.fogDensity);
    scene.background = fogColor;
    return () => {
      scene.environment = null;
      scene.fog = null;
      scene.background = null;
    };
  }, [scene]);

  return null;
}

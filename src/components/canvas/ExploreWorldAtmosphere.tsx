import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { makeCyberMood } from '@/lib/cyber-mood';
import { EXPLORE_DIFFUSE } from '@/lib/explore-lighting';

/** 与 CyberGrid 一致：指数雾 + 背景色 */
export default function ExploreWorldAtmosphere() {
  const { scene } = useThree();
  const mood = useMemo(() => makeCyberMood('EXPLORE'), []);

  useEffect(() => {
    scene.environment = null;
    scene.fog = new THREE.FogExp2(mood.fog.getHex(), EXPLORE_DIFFUSE.fogDensity);
    scene.background = mood.fog.clone();
    return () => {
      scene.environment = null;
      scene.fog = null;
      scene.background = null;
    };
  }, [scene, mood]);

  return null;
}

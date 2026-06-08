import * as THREE from 'three';
import type { ActivePage } from '@/lib/types';

/** EXPLORE 赛博城市氛围配色 */
export interface CyberMood {
  ground: THREE.Color;
  ember: THREE.Color;
  amber: THREE.Color;
  accent: THREE.Color;
  fog: THREE.Color;
  intensity: number;
}

export function makeCyberMood(page: ActivePage = 'EXPLORE'): CyberMood {
  switch (page) {
    case 'WORKS':
      return {
        ground: new THREE.Color('#140a07'),
        ember: new THREE.Color('#7a2e1e'),
        amber: new THREE.Color('#c97a3c'),
        accent: new THREE.Color('#3a5566'),
        fog: new THREE.Color('#0a0604'),
        intensity: 0.9,
      };
    case 'ABOUT':
      return {
        ground: new THREE.Color('#120710'),
        ember: new THREE.Color('#7a2440'),
        amber: new THREE.Color('#c45a72'),
        accent: new THREE.Color('#46506e'),
        fog: new THREE.Color('#0a050a'),
        intensity: 0.9,
      };
    case 'LOGS':
      return {
        ground: new THREE.Color('#100505'),
        ember: new THREE.Color('#6e2424'),
        amber: new THREE.Color('#a85050'),
        accent: new THREE.Color('#3a4658'),
        fog: new THREE.Color('#080303'),
        intensity: 0.62,
      };
    default:
      return {
        ground: new THREE.Color('#130707'),
        ember: new THREE.Color('#7a2a22'),
        amber: new THREE.Color('#c2683c'),
        accent: new THREE.Color('#3d5063'),
        fog: new THREE.Color('#090403'),
        intensity: 0.85,
      };
  }
}

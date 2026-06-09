import * as THREE from 'three';
import { generateExploreCity } from '@/lib/explore-city-layout';
import {
  type BuildingFaceLetter,
  getBuildingFaceByLetter,
} from '@/lib/explore-world-labels';

export type BuildingFaceSize = {
  width: number;
  height: number;
  normal: THREE.Vector3;
  center: THREE.Vector3;
  rotation: THREE.Euler;
};

/** `building08` / `building_08` → 0-based city index (building_08 = index 7). */
export function parseBuildingIndex(buildingId: string): number {
  const digits = buildingId.replace(/^building_?/i, '');
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Invalid building id: ${buildingId}`);
  }
  return n - 1;
}

export function getBuildingFaceSize(
  buildingId: string,
  face: BuildingFaceLetter,
): BuildingFaceSize {
  const { buildings } = generateExploreCity();
  const index = parseBuildingIndex(buildingId);
  const building = buildings[index];
  if (!building) {
    throw new Error(`Building not found: ${buildingId} (index ${index})`);
  }

  const spec = getBuildingFaceByLetter(building, face);
  const normal = new THREE.Vector3(0, 0, 1).applyEuler(spec.rotation);

  return {
    width: spec.width,
    height: spec.height,
    normal,
    center: spec.center.clone(),
    rotation: spec.rotation.clone(),
  };
}

export function getCameraDistanceToFitPanel(
  panelWidth: number,
  panelHeight: number,
  fov: number,
  margin = 1.15,
): number {
  const maxSize = Math.max(panelWidth, panelHeight);
  const fovRad = THREE.MathUtils.degToRad(fov);
  return (maxSize / 2 / Math.tan(fovRad / 2)) * margin;
}

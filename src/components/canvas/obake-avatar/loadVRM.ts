import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { applyObakeAppearance } from '@/components/canvas/obake-avatar/applyObakeAppearance';
import {
  applyObakeHumanoidPose,
  stabilizeObakeVrm,
} from '@/components/canvas/obake-avatar/obake-vrm-rig';

export async function createVRMLoader(renderer?: THREE.WebGLRenderer | null): Promise<GLTFLoader> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  return loader;
}

export async function loadVRMModel(
  url: string,
  renderer?: THREE.WebGLRenderer | null,
): Promise<VRM> {
  const loader = await createVRMLoader(renderer);
  const gltf = await loader.loadAsync(url);
  const vrm = gltf.userData.vrm as VRM | undefined;
  if (!vrm) {
    throw new Error(`VRM data missing in ${url}`);
  }

  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  VRMUtils.combineSkeletons(vrm.scene);
  VRMUtils.combineMorphs(vrm);

  vrm.scene.traverse((obj) => {
    obj.frustumCulled = false;
  });

  stabilizeObakeVrm(vrm);
  applyObakeAppearance(vrm);
  applyObakeHumanoidPose(vrm);
  vrm.springBoneManager?.setInitState();

  return vrm;
}

/** MToon 异常时的保底 toon 材质 */
export function applyToonFallbackMaterials(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = mats.map((mat) => {
      if (!mat) return mat;
      const map = 'map' in mat ? (mat as THREE.MeshStandardMaterial).map : null;
      return new THREE.MeshToonMaterial({
        color: (mat as THREE.MeshStandardMaterial).color?.clone() ?? new THREE.Color(0xffffff),
        map: map ?? undefined,
      });
    });
    obj.material = next.length === 1 ? next[0]! : next;
  });
}

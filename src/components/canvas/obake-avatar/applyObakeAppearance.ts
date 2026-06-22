import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { getObakeAvatarConfig, OBAKE_AVATAR_LAYER } from '@/lib/obake-avatar-config';

/** 角色整棵子树使用独立 layer，主相机需 enable，地面 Reflector 不会捕获 */
export function applyObakeRenderLayer(root: THREE.Object3D) {
  root.traverse((obj) => {
    obj.layers.set(OBAKE_AVATAR_LAYER);
  });
}

function extractColorMap(material: THREE.Material): THREE.Texture | null {
  const mat = material as THREE.MeshStandardMaterial & {
    uniforms?: Record<string, { value?: unknown }>;
  };
  if (mat.map) return mat.map;
  const lit = mat.uniforms?.litTexture?.value;
  if (lit instanceof THREE.Texture) return lit;
  const shade = mat.uniforms?.shadeTexture?.value;
  if (shade instanceof THREE.Texture) return shade;
  return null;
}

/** 自发光贴图材质 + 脚底接触阴影（EXPLORE 无平行光 shadowMap） */
export function applyObakeAppearance(vrm: VRM) {
  const cfg = getObakeAvatarConfig();

  applyObakeRenderLayer(vrm.scene);

  vrm.scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.frustumCulled = false;

    const sources = Array.isArray(obj.material) ? obj.material : [obj.material];
    const materials = sources.map((src) => {
      const map = src ? extractColorMap(src) : null;
      if (map) {
        map.colorSpace = THREE.SRGBColorSpace;
      }

      const mat = new THREE.MeshBasicMaterial({
        map: map ?? undefined,
        color: map ? 0xffffff : new THREE.Color(cfg.bodyColor),
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: src?.transparent ?? false,
        alphaTest: (src as THREE.Material | undefined)?.alphaTest ?? 0,
        depthWrite: true,
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      });

      return mat;
    });

    obj.material = materials.length === 1 ? materials[0]! : materials;
    obj.renderOrder = 50;
  });

  const expr = vrm.expressionManager;
  if (expr) {
    for (const e of expr.expressions) {
      expr.setValue(e.expressionName, 0);
    }
    expr.update();
  }
}

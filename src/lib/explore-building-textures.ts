import * as THREE from 'three';
import { EXPLORE_BUILDING_BANDS, EXPLORE_BUILDING_FACADE } from '@/lib/explore-city-palette';

/** 0=concrete 1=glass 2=metal 3=dirty wall — matches explore-city-layout material ids */
export const BUILDING_MATERIAL_COUNT = 4;

export type BuildingMaterialId = 0 | 1 | 2 | 3;

const MATERIAL_KEYS = ['concrete', 'glass', 'metal', 'dirty'] as const;

const LOCAL_BASE = '/textures/buildings';

/** Poly Haven / ambientCG CDN fallbacks when local files are missing */
const CDN_FALLBACK: Record<(typeof MATERIAL_KEYS)[number], { diff: string; norm: string; rough: string }> = {
  concrete: {
    diff: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_wall_008/concrete_wall_008_diff_1k.jpg',
    norm: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_wall_008/concrete_wall_008_nor_gl_1k.jpg',
    rough: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_wall_008/concrete_wall_008_rough_1k.jpg',
  },
  glass: {
    diff: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rusted_iron/rusted_iron_diff_1k.jpg',
    norm: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rusted_iron/rusted_iron_nor_gl_1k.jpg',
    rough: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rusted_iron/rusted_iron_rough_1k.jpg',
  },
  metal: {
    diff: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/metal_plate_02/metal_plate_02_diff_1k.jpg',
    norm: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/metal_plate_02/metal_plate_02_nor_gl_1k.jpg',
    rough: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/metal_plate_02/metal_plate_02_rough_1k.jpg',
  },
  dirty: {
    diff: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brick_wall_02/brick_wall_02_diff_1k.jpg',
    norm: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brick_wall_02/brick_wall_02_nor_gl_1k.jpg',
    rough: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brick_wall_02/brick_wall_02_rough_1k.jpg',
  },
};

export interface BuildingTextureSet {
  colors: THREE.Texture[];
  normals: THREE.Texture[];
  roughness: THREE.Texture[];
}

function configurePbrTexture(tex: THREE.Texture, isColor: boolean) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function loadOne(loader: THREE.TextureLoader, local: string, remote: string): Promise<THREE.Texture> {
  return new Promise((resolve) => {
    loader.load(
      local,
      (tex) => resolve(tex),
      undefined,
      () => {
        loader.load(remote, (tex) => resolve(tex), undefined, () => {
          const fallback = new THREE.DataTexture(new Uint8Array([1, 1, 2, 255]), 1, 1);
          fallback.needsUpdate = true;
          resolve(fallback);
        });
      },
    );
  });
}

/** Load 4× PBR sets (color / normal / roughness) — local first, CDN fallback */
export async function loadExploreBuildingTextures(): Promise<BuildingTextureSet> {
  const loader = new THREE.TextureLoader();
  const colors: THREE.Texture[] = [];
  const normals: THREE.Texture[] = [];
  const roughness: THREE.Texture[] = [];

  await Promise.all(
    MATERIAL_KEYS.map(async (key) => {
      const cdn = CDN_FALLBACK[key];
      const [color, normal, rough] = await Promise.all([
        loadOne(loader, `${LOCAL_BASE}/${key}/diff.jpg`, cdn.diff),
        loadOne(loader, `${LOCAL_BASE}/${key}/norm.jpg`, cdn.norm),
        loadOne(loader, `${LOCAL_BASE}/${key}/rough.jpg`, cdn.rough),
      ]);
      colors.push(configurePbrTexture(color, true));
      normals.push(configurePbrTexture(normal, false));
      roughness.push(configurePbrTexture(rough, false));
    }),
  );

  return { colors, normals, roughness };
}

/** Flat URL list for R3F useLoader */
export function getBuildingTextureUrls(): string[] {
  const urls: string[] = [];
  for (const key of MATERIAL_KEYS) {
    urls.push(`${LOCAL_BASE}/${key}/diff.jpg`);
    urls.push(`${LOCAL_BASE}/${key}/norm.jpg`);
    urls.push(`${LOCAL_BASE}/${key}/rough.jpg`);
  }
  return urls;
}

/** Map 12 loaded textures back into indexed sets */
export function mapLoadedBuildingTextures(loaded: THREE.Texture[]): BuildingTextureSet {
  const colors: THREE.Texture[] = [];
  const normals: THREE.Texture[] = [];
  const roughness: THREE.Texture[] = [];
  for (let i = 0; i < BUILDING_MATERIAL_COUNT; i++) {
    const base = i * 3;
    colors.push(configurePbrTexture(loaded[base]!, true));
    normals.push(configurePbrTexture(loaded[base + 1]!, false));
    roughness.push(configurePbrTexture(loaded[base + 2]!, false));
  }
  return { colors, normals, roughness };
}

export function createBuildingTextureUniforms(textures: BuildingTextureSet) {
  return {
    uTexConcrete: { value: textures.colors[0] },
    uTexGlass: { value: textures.colors[1] },
    uTexMetal: { value: textures.colors[2] },
    uTexDirty: { value: textures.colors[3] },
    uNormConcrete: { value: textures.normals[0] },
    uNormGlass: { value: textures.normals[1] },
    uNormMetal: { value: textures.normals[2] },
    uNormDirty: { value: textures.normals[3] },
    uRoughConcrete: { value: textures.roughness[0] },
    uRoughGlass: { value: textures.roughness[1] },
    uRoughMetal: { value: textures.roughness[2] },
    uRoughDirty: { value: textures.roughness[3] },
    uTriplanarScale: { value: EXPLORE_BUILDING_FACADE.triplanarScale },
    uWindowGlow: { value: EXPLORE_BUILDING_FACADE.windowGlow },
    uFacadeIntensity: { value: EXPLORE_BUILDING_FACADE.intensity },
    uBandCoverage: { value: EXPLORE_BUILDING_BANDS.coverage },
    uBandIntensity: { value: EXPLORE_BUILDING_BANDS.intensity },
    uBandReflectIntensity: { value: EXPLORE_BUILDING_BANDS.reflectIntensity },
    uBandBreatheSpeed: { value: EXPLORE_BUILDING_BANDS.breatheSpeed },
    uBandBreatheDepth: { value: EXPLORE_BUILDING_BANDS.breatheDepth },
    uBandWidth: { value: EXPLORE_BUILDING_BANDS.bandWidth },
    uBandHeightMin: { value: EXPLORE_BUILDING_BANDS.heightMin },
    uBandHeightMax: { value: EXPLORE_BUILDING_BANDS.heightMax },
    uBandTwoChance: { value: EXPLORE_BUILDING_BANDS.twoBandChance },
    uBandPurple: { value: EXPLORE_BUILDING_BANDS.purple },
    uBandCyan: { value: EXPLORE_BUILDING_BANDS.cyan },
    uBandMagenta: { value: EXPLORE_BUILDING_BANDS.magenta },
  };
}

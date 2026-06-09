import type { ExploreBuilding, ExploreNeonSign } from '@/lib/explore-city-layout';
import { getRebeccaHologramPlacement } from '@/lib/rebecca-hologram-config';
import * as THREE from 'three';

export type WorldLabelKind = 'building' | 'poster';

export type BuildingFaceId = '+X' | '-X' | '+Z' | '-Z' | '+Y' | '-Y';

export type WorldFaceLabel = {
  id: string;
  parentId: string;
  face: BuildingFaceId | 'photo';
  position: THREE.Vector3;
  rotation: THREE.Euler;
  text: string;
  fontSize: number;
};

export type WorldLabelTarget = {
  id: string;
  kind: WorldLabelKind;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  /** 用于坐标轴长度 / 文字大小的参考尺度 */
  size: number;
  /** 标签悬浮在物体顶部的额外抬升 */
  labelLift: number;
};

export function isWorldLabelsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const param = new URLSearchParams(window.location.search).get('worldLabels');
  if (param === '0') return false;
  return true;
}

export function formatWorldLabelId(kind: WorldLabelKind, index: number): string {
  const prefix = kind === 'building' ? 'building' : 'poster';
  return `${prefix}_${String(index + 1).padStart(2, '0')}`;
}

export function buildingLabelSize(b: ExploreBuilding): number {
  return Math.max(b.w, b.d, b.h);
}

export function posterLabelSize(width: number, height: number): number {
  return Math.max(width, height);
}

export function fontSizeForSize(size: number): number {
  return THREE.MathUtils.clamp(size * 0.095, 0.3, 0.92);
}

export function faceLabelFontSize(size: number): number {
  return THREE.MathUtils.clamp(fontSizeForSize(size) * 0.52, 0.16, 0.48);
}

const BUILDING_FACE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

const STANDARD_ASPECTS: { ratio: number; label: string }[] = [
  { ratio: 16 / 9, label: '16:9' },
  { ratio: 9 / 16, label: '9:16' },
  { ratio: 4 / 3, label: '4:3' },
  { ratio: 3 / 4, label: '3:4' },
  { ratio: 1, label: '1:1' },
];

const ASPECT_TOLERANCE = 0.025;

function gcdInt(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function formatDim(value: number): string {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, '');
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

function simplifyRatio(width: number, height: number): string | null {
  const maxVal = Math.max(width, height);
  if (maxVal <= 0) return null;
  const scale = maxVal > 120 ? 120 / maxVal : 1;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  if (w <= 0 || h <= 0) return null;
  const g = gcdInt(w, h);
  const sw = w / g;
  const sh = h / g;
  if (sw <= 48 && sh <= 48) return `${sw}:${sh}`;
  return null;
}

/** Readable ratio for a face — standard aspects when close, else simplified ratio or W×H. */
export function formatFaceProportion(width: number, height: number): string {
  if (width <= 0 || height <= 0) return '?';

  const ratio = width / height;
  for (const aspect of STANDARD_ASPECTS) {
    if (Math.abs(ratio - aspect.ratio) / aspect.ratio <= ASPECT_TOLERANCE) {
      return aspect.label;
    }
  }

  const simplified = simplifyRatio(width, height);
  if (simplified) return simplified;

  return `${formatDim(width)}×${formatDim(height)}`;
}

const FACE_LABEL_OFFSET_FACTOR = 0.04;
const _faceNormal = new THREE.Vector3();

function offsetFaceCenter(
  center: THREE.Vector3,
  rotation: THREE.Euler,
  offset: number,
): THREE.Vector3 {
  _faceNormal.set(0, 0, 1).applyEuler(rotation);
  return center.clone().addScaledVector(_faceNormal, offset);
}

export type BuildingFaceLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type BuildingFaceSpec = {
  face: BuildingFaceId;
  center: THREE.Vector3;
  rotation: THREE.Euler;
  width: number;
  height: number;
};

export function getBuildingFaceSpecs(b: ExploreBuilding): BuildingFaceSpec[] {
  return buildingFaceSpecs(b);
}

export function getBuildingFaceByLetter(
  b: ExploreBuilding,
  face: BuildingFaceLetter,
): BuildingFaceSpec {
  const index = BUILDING_FACE_LETTERS.indexOf(face);
  if (index < 0) throw new Error(`Unknown face letter: ${face}`);
  const spec = buildingFaceSpecs(b)[index];
  if (!spec) throw new Error(`Face ${face} not found on building`);
  return spec;
}

function buildingFaceSpecs(b: ExploreBuilding): BuildingFaceSpec[] {
  const cx = b.x;
  const cy = b.yBase + b.h / 2;
  const cz = b.z;
  const hw = b.w / 2;
  const hd = b.d / 2;

  return [
    {
      face: '+X',
      center: new THREE.Vector3(cx + hw, cy, cz),
      rotation: new THREE.Euler(0, -Math.PI / 2, 0),
      width: b.d,
      height: b.h,
    },
    {
      face: '-X',
      center: new THREE.Vector3(cx - hw, cy, cz),
      rotation: new THREE.Euler(0, Math.PI / 2, 0),
      width: b.d,
      height: b.h,
    },
    {
      face: '+Z',
      center: new THREE.Vector3(cx, cy, cz + hd),
      rotation: new THREE.Euler(0, 0, 0),
      width: b.w,
      height: b.h,
    },
    {
      face: '-Z',
      center: new THREE.Vector3(cx, cy, cz - hd),
      rotation: new THREE.Euler(0, Math.PI, 0),
      width: b.w,
      height: b.h,
    },
    {
      face: '+Y',
      center: new THREE.Vector3(cx, b.yBase + b.h, cz),
      rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
      width: b.w,
      height: b.d,
    },
    {
      face: '-Y',
      center: new THREE.Vector3(cx, b.yBase, cz),
      rotation: new THREE.Euler(Math.PI / 2, 0, 0),
      width: b.w,
      height: b.d,
    },
  ];
}

export function buildBuildingFaceLabels(buildings: ExploreBuilding[]): WorldFaceLabel[] {
  const labels: WorldFaceLabel[] = [];

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i]!;
    const parentId = formatWorldLabelId('building', i);
    const size = buildingLabelSize(b);
    const fontSize = faceLabelFontSize(size);

    for (const [faceIndex, spec] of buildingFaceSpecs(b).entries()) {
      const offset = Math.max(spec.width, spec.height) * FACE_LABEL_OFFSET_FACTOR;
      const faceLetter = BUILDING_FACE_LETTERS[faceIndex] ?? String.fromCharCode(65 + faceIndex);
      labels.push({
        id: `${parentId}_${faceLetter}`,
        parentId,
        face: spec.face,
        position: offsetFaceCenter(spec.center, spec.rotation, offset),
        rotation: spec.rotation.clone(),
        text: faceLetter,
        fontSize,
      });
    }
  }

  return labels;
}

export function buildPosterFaceLabels(signs: ExploreNeonSign[]): WorldFaceLabel[] {
  return signs.map((s, i) => {
    const parentId = formatWorldLabelId('poster', i);
    const size = posterLabelSize(s.w, s.h);
    const fontSize = faceLabelFontSize(size);
    const rotation = new THREE.Euler(0, s.rotationY, 0);
    const center = new THREE.Vector3(s.x, s.y, s.z);
    const offset = Math.max(s.w, s.h) * FACE_LABEL_OFFSET_FACTOR;

    return {
      id: `${parentId}_photo`,
      parentId,
      face: 'photo' as const,
      position: offsetFaceCenter(center, rotation, offset),
      rotation,
      text: formatFaceProportion(s.w, s.h),
      fontSize,
    };
  });
}

export function buildBuildingLabelTargets(buildings: ExploreBuilding[]): WorldLabelTarget[] {
  return buildings.map((b, i) => {
    const size = buildingLabelSize(b);
    const fontSize = fontSizeForSize(size);
    return {
      id: formatWorldLabelId('building', i),
      kind: 'building' as const,
      position: new THREE.Vector3(b.x, b.yBase + b.h / 2, b.z),
      rotation: new THREE.Euler(0, 0, 0),
      size,
      labelLift: b.h / 2 + fontSize * 0.65,
    };
  });
}

export function buildPosterLabelTargets(signs: ExploreNeonSign[]): WorldLabelTarget[] {
  return signs.map((s, i) => {
    const size = posterLabelSize(s.w, s.h);
    const fontSize = fontSizeForSize(size);
    return {
      id: formatWorldLabelId('poster', i),
      kind: 'poster' as const,
      position: new THREE.Vector3(s.x, s.y, s.z),
      rotation: new THREE.Euler(0, s.rotationY, 0),
      size,
      labelLift: s.h / 2 + fontSize * 0.55,
    };
  });
}

/** Rebecca 全息海报 — building_01 专用立面，不在 instanced signs 列表里 */
export function buildRebeccaHologramLabelTargets(): WorldLabelTarget[] {
  const p = getRebeccaHologramPlacement();
  const size = posterLabelSize(p.width, p.height);
  const fontSize = fontSizeForSize(size);
  return [
    {
      id: 'building_01_poster',
      kind: 'poster' as const,
      position: new THREE.Vector3(p.x, p.y, p.z),
      rotation: new THREE.Euler(0, p.rotationY, 0),
      size,
      labelLift: p.height / 2 + fontSize * 0.55,
    },
  ];
}

export function buildRebeccaHologramFaceLabels(): WorldFaceLabel[] {
  const p = getRebeccaHologramPlacement();
  const size = posterLabelSize(p.width, p.height);
  const fontSize = faceLabelFontSize(size);
  const rotation = new THREE.Euler(0, p.rotationY, 0);
  const center = new THREE.Vector3(p.x, p.y, p.z);
  const offset = Math.max(p.width, p.height) * FACE_LABEL_OFFSET_FACTOR;

  return [
    {
      id: 'building_01_poster_photo',
      parentId: 'building_01_poster',
      face: 'photo',
      position: offsetFaceCenter(center, rotation, offset),
      rotation,
      text: formatFaceProportion(p.width, p.height),
      fontSize,
    },
  ];
}

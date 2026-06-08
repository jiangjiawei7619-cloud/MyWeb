import type * as THREE from 'three';
import type { StructureId } from '@/lib/world-config';

export interface StructureProps {
  id: StructureId;
  position: THREE.Vector3Tuple;
  emphasis: number;
  highlighted: boolean;
  focused: boolean;
  showLabel: boolean;
  onHover: (id: StructureId | null) => void;
  onSelect: (id: StructureId) => void;
  label: string;
}

import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { StructureProps } from './structure-types';

export default function ArchiveStructure({
  id,
  position,
  emphasis,
  highlighted,
  focused,
  showLabel,
  onHover,
  onSelect,
  label,
}: StructureProps) {
  const glow = useMemo(() => {
    if (focused) return 2.3 + emphasis;
    if (highlighted) return 1.5 + emphasis * 0.8;
    return 0.4 + emphasis * 0.28;
  }, [emphasis, focused, highlighted]);

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(id);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      <mesh>
        <cylinderGeometry args={[1.2, 1.2, 4.8, 6]} />
        <meshStandardMaterial
          color="#18090d"
          emissive={new THREE.Color('#ff4770')}
          emissiveIntensity={glow}
          metalness={0.74}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 2.9, 0]} rotation={[0, Math.PI / 6, 0]}>
        <boxGeometry args={[2.5, 1.1, 2.5]} />
        <meshStandardMaterial color="#250f14" emissive="#ff8ca6" emissiveIntensity={glow * 0.75} />
      </mesh>
      {showLabel && (
        <Text position={[0, 5.1, 0]} fontSize={0.78} color="#ffd9e2" anchorX="center" anchorY="middle">
          {label}
        </Text>
      )}
    </group>
  );
}

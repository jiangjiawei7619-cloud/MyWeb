import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { StructureProps } from './structure-types';

export default function CoreStructure({
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
  const emissiveIntensity = useMemo(() => {
    if (focused) return 2.8 + emphasis;
    if (highlighted) return 1.6 + emphasis * 0.8;
    return 0.5 + emphasis * 0.35;
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
        <cylinderGeometry args={[1.8, 2.3, 3.8, 8]} />
        <meshStandardMaterial
          color="#1f0a0d"
          emissive={new THREE.Color('#ff3a32')}
          emissiveIntensity={emissiveIntensity}
          metalness={0.85}
          roughness={0.28}
        />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <octahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color="#22080b" emissive="#ff8a70" emissiveIntensity={emissiveIntensity * 0.7} />
      </mesh>
      {showLabel && (
        <Text position={[0, 4.7, 0]} fontSize={0.95} color="#ffd6cf" anchorX="center" anchorY="middle">
          {label}
        </Text>
      )}
    </group>
  );
}

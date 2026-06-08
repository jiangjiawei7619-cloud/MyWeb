import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { StructureProps } from './structure-types';

export default function BridgeStructure({
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
    if (focused) return 2.35 + emphasis;
    if (highlighted) return 1.65 + emphasis * 0.85;
    return 0.42 + emphasis * 0.28;
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
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[5.4, 0.8, 1.5]} />
        <meshStandardMaterial
          color="#170b09"
          emissive={new THREE.Color('#ff7b46')}
          emissiveIntensity={glow}
          metalness={0.72}
          roughness={0.26}
        />
      </mesh>
      <mesh position={[-2, 2.3, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 2.3, 8]} />
        <meshStandardMaterial color="#1e0c08" emissive="#ff9a70" emissiveIntensity={glow * 0.7} />
      </mesh>
      <mesh position={[2, 2.3, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 2.3, 8]} />
        <meshStandardMaterial color="#1e0c08" emissive="#ff9a70" emissiveIntensity={glow * 0.7} />
      </mesh>
      {showLabel && (
        <Text position={[0, 4.2, 0]} fontSize={0.78} color="#ffe0d0" anchorX="center" anchorY="middle">
          {label}
        </Text>
      )}
    </group>
  );
}

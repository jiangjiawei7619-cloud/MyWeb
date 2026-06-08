import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { StructureProps } from './structure-types';

export default function ForgeStructure({
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
    if (focused) return 2.5 + emphasis * 1.1;
    if (highlighted) return 1.6 + emphasis * 0.85;
    return 0.45 + emphasis * 0.3;
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
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[3.6, 3.2, 3.6]} />
        <meshStandardMaterial
          color="#1e0907"
          emissive={new THREE.Color('#ff4f2d')}
          emissiveIntensity={glow}
          metalness={0.92}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[0, 2.4, 0]} rotation={[0, Math.PI / 4, 0]}>
        <torusGeometry args={[1.1, 0.22, 12, 24]} />
        <meshStandardMaterial color="#2a0f0a" emissive="#ff8f57" emissiveIntensity={glow * 0.8} />
      </mesh>
      {showLabel && (
        <Text position={[0, 4.2, 0]} fontSize={0.8} color="#ffd8cc" anchorX="center" anchorY="middle">
          {label}
        </Text>
      )}
    </group>
  );
}

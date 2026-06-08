import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { StructureProps } from './structure-types';

export default function MirrorStructure({
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
    if (focused) return 2.2 + emphasis * 1.15;
    if (highlighted) return 1.55 + emphasis * 0.8;
    return 0.45 + emphasis * 0.32;
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
        <octahedronGeometry args={[2.1, 0]} />
        <meshStandardMaterial
          color="#12080f"
          emissive={new THREE.Color('#ad62ff')}
          emissiveIntensity={glow}
          metalness={0.96}
          roughness={0.08}
        />
      </mesh>
      <mesh position={[0, -1.6, 0]}>
        <cylinderGeometry args={[1.2, 1.8, 1.4, 8]} />
        <meshStandardMaterial color="#140713" emissive="#cba2ff" emissiveIntensity={glow * 0.6} />
      </mesh>
      {showLabel && (
        <Text position={[0, 3.8, 0]} fontSize={0.82} color="#ead9ff" anchorX="center" anchorY="middle">
          {label}
        </Text>
      )}
    </group>
  );
}

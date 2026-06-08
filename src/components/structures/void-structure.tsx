import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { StructureProps } from './structure-types';

export default function VoidStructure({
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
    if (focused) return 2.5 + emphasis;
    if (highlighted) return 1.8 + emphasis * 0.9;
    return 0.5 + emphasis * 0.34;
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
        <torusKnotGeometry args={[1.25, 0.35, 120, 18, 2, 3]} />
        <meshStandardMaterial
          color="#09030d"
          emissive={new THREE.Color('#7d40ff')}
          emissiveIntensity={glow}
          metalness={0.8}
          roughness={0.18}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.75, 2.05, 48]} />
        <meshBasicMaterial color="#a875ff" transparent opacity={0.68 + emphasis * 0.2} />
      </mesh>
      {showLabel && (
        <Text position={[0, 3.5, 0]} fontSize={0.78} color="#e7dcff" anchorX="center" anchorY="middle">
          {label}
        </Text>
      )}
    </group>
  );
}

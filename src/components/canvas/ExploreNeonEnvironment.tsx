import { Environment, Lightformer } from '@react-three/drei';
import { EXPLORE_GLOBAL_LIGHT } from '@/lib/explore-lighting';
import { GROUND_HALF_EXTENT } from '@/physics/rapier-config';

/** 仅霓虹/城市色块 IBL — 无日月、无环形光源，避免地面白圈 */
export default function ExploreNeonEnvironment() {
  const { environment, strips } = EXPLORE_GLOBAL_LIGHT;

  return (
    <Environment resolution={environment.resolution} background={false} environmentIntensity={environment.intensity}>
      {strips.map((s) => (
        <Lightformer
          key={s.id}
          form="rect"
          color={s.color}
          intensity={s.intensity}
          position={s.position}
          rotation-y={s.rotationY}
          scale={s.scale}
        />
      ))}
      <Lightformer
        form="rect"
        color="#050508"
        intensity={0.12}
        position={[0, -6, 0]}
        rotation-x={-Math.PI / 2}
        scale={[GROUND_HALF_EXTENT * 1.8, GROUND_HALF_EXTENT * 1.8, 1]}
      />
      <Lightformer
        form="rect"
        color="#2a3548"
        intensity={0.22}
        position={[0, 90, 0]}
        rotation-x={Math.PI / 2}
        scale={[GROUND_HALF_EXTENT * 2.2, GROUND_HALF_EXTENT * 2.2, 1]}
      />
    </Environment>
  );
}

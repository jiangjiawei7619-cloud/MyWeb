import { memo, useMemo } from 'react';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { ExploreBuilding, ExploreNeonSign } from '@/lib/explore-city-layout';
import {
  appendLocalAxes,
  axisLengthForSize,
  buildBuildingFaceLabels,
  buildBuildingLabelTargets,
  buildPosterFaceLabels,
  buildPosterLabelTargets,
  buildRebeccaHologramFaceLabels,
  buildRebeccaHologramLabelTargets,
  fontSizeForSize,
  type WorldFaceLabel,
  type WorldLabelTarget,
} from '@/lib/explore-world-labels';

type ExploreWorldLabelsProps = {
  buildings: ExploreBuilding[];
  signs: ExploreNeonSign[];
};

function MergedLocalAxes({ targets }: { targets: WorldLabelTarget[] }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const dummy = new THREE.Object3D();

    for (const target of targets) {
      dummy.position.copy(target.position);
      dummy.rotation.copy(target.rotation);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      appendLocalAxes(positions, colors, dummy.matrix, axisLengthForSize(target.size, target.kind));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [targets]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        depthTest: true,
        toneMapped: false,
      }),
    [],
  );

  return <lineSegments geometry={geometry} material={material} renderOrder={48} frustumCulled={false} />;
}

const LabelBillboard = memo(function LabelBillboard({ target }: { target: WorldLabelTarget }) {
  const fontSize = fontSizeForSize(target.size);

  return (
    <group position={target.position} rotation={target.rotation}>
      <Billboard follow position={[0, target.labelLift, 0]}>
        <Text
          fontSize={fontSize}
          color="#ffffff"
          fillOpacity={0.82}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={fontSize * 0.045}
          outlineColor="#000000"
          outlineOpacity={0.55}
          material-toneMapped={false}
          material-depthTest={false}
          renderOrder={50}
        >
          {target.id}
        </Text>
      </Billboard>
    </group>
  );
});

const FaceProportionLabel = memo(function FaceProportionLabel({ label }: { label: WorldFaceLabel }) {
  return (
    <group position={label.position} rotation={label.rotation}>
      <Text
        fontSize={label.fontSize}
        color="#ffffff"
        fillOpacity={0.58}
        anchorX="center"
        anchorY="middle"
        outlineWidth={label.fontSize * 0.04}
        outlineColor="#000000"
        outlineOpacity={0.35}
        material-toneMapped={false}
        material-depthTest={true}
        renderOrder={49}
      >
        {label.text}
      </Text>
    </group>
  );
});

function ExploreWorldLabelsInner({ buildings, signs }: ExploreWorldLabelsProps) {
  const buildingTargets = useMemo(() => buildBuildingLabelTargets(buildings), [buildings]);
  const posterTargets = useMemo(() => buildPosterLabelTargets(signs), [signs]);
  const rebeccaTargets = useMemo(() => buildRebeccaHologramLabelTargets(), []);
  const buildingFaceLabels = useMemo(() => buildBuildingFaceLabels(buildings), [buildings]);
  const posterFaceLabels = useMemo(() => buildPosterFaceLabels(signs), [signs]);
  const rebeccaFaceLabels = useMemo(() => buildRebeccaHologramFaceLabels(), []);
  const allTargets = useMemo(
    () => [...buildingTargets, ...posterTargets, ...rebeccaTargets],
    [buildingTargets, posterTargets, rebeccaTargets],
  );
  const allFaceLabels = useMemo(
    () => [...buildingFaceLabels, ...posterFaceLabels, ...rebeccaFaceLabels],
    [buildingFaceLabels, posterFaceLabels, rebeccaFaceLabels],
  );

  if (allTargets.length === 0 && allFaceLabels.length === 0) return null;

  return (
    <group name="explore-world-labels">
      <MergedLocalAxes targets={allTargets} />
      {allTargets.map((target) => (
        <LabelBillboard key={target.id} target={target} />
      ))}
      {allFaceLabels.map((label) => (
        <FaceProportionLabel key={label.id} label={label} />
      ))}
    </group>
  );
}

const ExploreWorldLabels = memo(ExploreWorldLabelsInner);
export default ExploreWorldLabels;

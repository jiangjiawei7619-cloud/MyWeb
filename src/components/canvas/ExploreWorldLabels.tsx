import { memo, useMemo } from 'react';
import { Billboard, Text } from '@react-three/drei';
import type { ExploreBuilding, ExploreNeonSign } from '@/lib/explore-city-layout';
import {
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

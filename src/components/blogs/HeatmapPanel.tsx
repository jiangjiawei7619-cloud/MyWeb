import { memo } from 'react';
import CyberHeatmap, { type CyberHeatmapProps } from '@/components/blogs/CyberHeatmap';

function HeatmapPanel(props: CyberHeatmapProps) {
  return <CyberHeatmap {...props} />;
}

export default memo(HeatmapPanel);

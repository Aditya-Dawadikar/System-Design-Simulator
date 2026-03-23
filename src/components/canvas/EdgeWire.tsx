'use client';

import { memo } from 'react';
import {
  getBezierPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import { COMPONENT_BY_TYPE } from '@/constants/components';
import type { ComponentType } from '@/types';

const INACTIVE_COLOR = '#a1b3bf';

function getAnimDuration(rps: number): string {
  if (rps >= 10000) return '0.4s';
  if (rps >= 5000) return '0.7s';
  if (rps >= 2000) return '1s';
  if (rps >= 500) return '1.5s';
  return '2s';
}

export default memo(function EdgeWire({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edgeConfig = useArchitectureStore((s) => s.edgeConfigs[id]);
  const running = useSimulationStore((s) => s.running);
  const edgeMetrics = useSimulationStore((s) => s.edgeMetrics[id]);

  const sourceNode = nodes.find((n) => n.id === source);
  const sourceType = sourceNode?.type as ComponentType | undefined;
  const sourceColor = sourceType ? COMPONENT_BY_TYPE[sourceType]?.color : undefined;

  const isBottleneck = edgeMetrics?.isBottleneck === true;
  const rps = edgeMetrics?.rps ?? 0;
  const isActive = running && rps > 0;

  let edgeColor: string;
  if (isBottleneck) {
    edgeColor = '#ff3355';
  } else if (running && sourceColor) {
    edgeColor = sourceColor;
  } else {
    edgeColor = INACTIVE_COLOR;
  }

  const protocol = edgeConfig?.protocol ?? 'REST';
  const animDuration = getAnimDuration(rps);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strokeWidth = selected ? 2.5 : isBottleneck ? 2 : 1.5;

  return (
    <>
      {/* Inject keyframe animation once — React dedupes identical <style> nodes */}
      <style>{`
        @keyframes edgeflow {
          from { stroke-dashoffset: 24; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* Soft glow halo when traffic is flowing */}
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke={edgeColor}
          strokeWidth={strokeWidth + 6}
          strokeOpacity={0.07}
          strokeLinecap="round"
        />
      )}

      {/* Selection highlight */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke={edgeColor}
          strokeWidth={strokeWidth + 4}
          strokeOpacity={0.18}
          strokeLinecap="round"
        />
      )}

      {/* Main wire — animated dashes when traffic is flowing */}
      <path
        d={edgePath}
        fill="none"
        stroke={edgeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={isActive ? '6 6' : undefined}
        style={
          isActive
            ? { animation: `edgeflow ${animDuration} linear infinite`, transition: 'stroke 0.3s' }
            : { transition: 'stroke 0.3s' }
        }
      />

      {/* Invisible fat hit area so the edge is easy to click */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        strokeLinecap="round"
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'none',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <div
            style={{
              background: '#0b1016',
              border: `1px solid ${edgeColor}55`,
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 9,
              fontWeight: 600,
              color: edgeColor,
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
              transition: 'color 0.3s, border-color 0.3s',
            }}
          >
            {isBottleneck ? '⚠ ' : ''}
            {protocol}
            {isActive
              ? ` · ${rps >= 1000 ? `${(rps / 1000).toFixed(1)}k` : rps.toFixed(0)} rps`
              : ''}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

'use client';

import { memo } from 'react';
import { type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';

const ACCENT = '#c084fc';

export default memo(function RegionNode({ id, selected }: NodeProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[id]);

  const name = config?.regionName ?? config?.label ?? 'Region';
  const w = config?.containerWidth ?? 900;
  const h = config?.containerHeight ?? 560;

  return (
    <div
      style={{
        width: w,
        height: h,
        background: `${ACCENT}06`,
        border: `2px dashed ${selected ? ACCENT : `${ACCENT}50`}`,
        borderRadius: 16,
        fontFamily: "'JetBrains Mono', monospace",
        position: 'relative',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
        pointerEvents: 'all',
      }}
    >
      {/* Header label */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13, color: ACCENT, lineHeight: 1 }}>⬡</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: ACCENT,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: ACCENT,
            background: `${ACCENT}18`,
            border: `1px solid ${ACCENT}30`,
            borderRadius: 3,
            padding: '1px 5px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          region
        </span>
      </div>
    </div>
  );
});

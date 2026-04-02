'use client';

import { memo } from 'react';
import { type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';

const ACCENT = '#4ade80';

export default memo(function PublicSubnetNode({ id, selected }: NodeProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[id]);

  const name = config?.label ?? 'Public Subnet';
  const cidr = config?.subnetCidr ?? '';
  const w = config?.containerWidth ?? 500;
  const h = config?.containerHeight ?? 350;

  const borderColor = selected ? ACCENT : `${ACCENT}40`;
  const bgColor = `${ACCENT}04`;

  return (
    <div
      style={{
        width: w,
        height: h,
        background: bgColor,
        border: `1px dashed ${borderColor}`,
        borderRadius: 10,
        fontFamily: "'JetBrains Mono', monospace",
        position: 'relative',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s, background 0.2s',
        pointerEvents: 'all',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <span style={{ fontSize: 9, color: ACCENT, lineHeight: 1 }}>⬤</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: '0.05em' }}>
          {name}
        </span>
        <span
          style={{
            fontSize: 8,
            fontWeight: 600,
            color: ACCENT,
            background: `${ACCENT}15`,
            border: `1px solid ${ACCENT}25`,
            borderRadius: 3,
            padding: '1px 5px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          PUBLIC
        </span>
        {cidr && (
          <span
            style={{
              fontSize: 8,
              color: `${ACCENT}80`,
              letterSpacing: '0.04em',
            }}
          >
            {cidr}
          </span>
        )}
      </div>
    </div>
  );
});

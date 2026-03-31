'use client';

import { memo } from 'react';
import { type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';

const ACCENT = '#67e8f9';
const FAILED_COLOR = '#f87171';

export default memo(function AvailabilityZoneNode({ id, selected }: NodeProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[id]);

  const name = config?.zoneName ?? config?.label ?? 'AZ';
  const failed = config?.zoneFailed ?? false;
  const w = config?.containerWidth ?? 380;
  const h = config?.containerHeight ?? 440;

  const borderColor = failed
    ? FAILED_COLOR
    : selected
    ? ACCENT
    : `${ACCENT}45`;

  const bgColor = failed ? `${FAILED_COLOR}08` : `${ACCENT}05`;

  return (
    <div
      style={{
        width: w,
        height: h,
        background: bgColor,
        border: `1px solid ${borderColor}`,
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
        <span
          style={{
            fontSize: 10,
            color: failed ? FAILED_COLOR : ACCENT,
            lineHeight: 1,
          }}
        >
          ◎
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: failed ? FAILED_COLOR : ACCENT,
            letterSpacing: '0.05em',
          }}
        >
          {name}
        </span>
        {failed && (
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: FAILED_COLOR,
              background: `${FAILED_COLOR}20`,
              border: `1px solid ${FAILED_COLOR}50`,
              borderRadius: 3,
              padding: '1px 5px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            FAILED
          </span>
        )}
        {!failed && (
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
            AZ
          </span>
        )}
      </div>

      {/* Failure overlay stripe */}
      {failed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 10,
            background: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 12px,
              ${FAILED_COLOR}06 12px,
              ${FAILED_COLOR}06 14px
            )`,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
});

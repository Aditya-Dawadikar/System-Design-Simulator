'use client';

import { memo } from 'react';
import { type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';

const ACCENT = '#c084fc';
const FAILED_COLOR = '#f87171';

export default memo(function RegionNode({ id, selected }: NodeProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[id]);
  const nodes = useArchitectureStore((s) => s.nodes);
  const nodeConfigs = useArchitectureStore((s) => s.nodeConfigs);

  const name = config?.regionName ?? config?.label ?? 'Region';

  // Explicit toggle OR all AZs in this region are failed → region is effectively down
  const explicitlyFailed = config?.regionFailed ?? false;
  const zonesInRegion = nodes.filter(
    (n) => n.type === 'availability_zone' && nodeConfigs[n.id]?.regionId === id
  );
  const allZonesFailed =
    zonesInRegion.length > 0 && zonesInRegion.every((z) => nodeConfigs[z.id]?.zoneFailed === true);
  const failed = explicitlyFailed || allZonesFailed;
  const w = config?.containerWidth ?? 900;
  const h = config?.containerHeight ?? 560;

  const borderColor = failed
    ? FAILED_COLOR
    : selected
    ? ACCENT
    : `${ACCENT}50`;

  const bgColor = failed ? `${FAILED_COLOR}07` : `${ACCENT}06`;
  const textColor = failed ? FAILED_COLOR : ACCENT;

  return (
    <div
      style={{
        width: w,
        height: h,
        background: bgColor,
        border: `2px dashed ${borderColor}`,
        borderRadius: 16,
        fontFamily: "'JetBrains Mono', monospace",
        position: 'relative',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s, background 0.2s',
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
        <span style={{ fontSize: 13, color: textColor, lineHeight: 1 }}>⬡</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: textColor,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {name}
        </span>
        {failed ? (
          <span
            style={{
              fontSize: 9,
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
        ) : (
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
        )}
      </div>

      {/* Failure overlay stripe */}
      {failed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            background: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 18px,
              ${FAILED_COLOR}05 18px,
              ${FAILED_COLOR}05 20px
            )`,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
});

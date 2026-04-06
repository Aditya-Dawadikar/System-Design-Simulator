'use client';

import { useArchitectureStore } from '@/store/architectureStore';

const ZONE_COLOR   = '#67e8f9'; // cyan — matches AvailabilityZoneNode
const REGION_COLOR = '#c084fc'; // purple — matches RegionNode

interface Props {
  nodeId: string;
}

/**
 * Renders a thin footer strip on a canvas node card showing which
 * availability zone or region the component belongs to.
 *
 * - zoneId set   → shows "◎ us-east-1a" in cyan
 * - regionId set (no zone) → shows "⬡ us-east-1" in purple
 * - neither      → renders nothing
 */
export default function NodeLocationBadge({ nodeId }: Props) {
  const nodeConfigs = useArchitectureStore((s) => s.nodeConfigs);
  const config = nodeConfigs[nodeId];

  if (config?.zoneId) {
    const zoneCfg  = nodeConfigs[config.zoneId];
    const zoneName = zoneCfg?.zoneName ?? zoneCfg?.label ?? 'AZ';
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px 4px',
          borderTop: `1px solid ${ZONE_COLOR}22`,
          background: `${ZONE_COLOR}09`,
          borderBottomLeftRadius: 7,
          borderBottomRightRadius: 7,
        }}
      >
        <span style={{ fontSize: 8, color: ZONE_COLOR, lineHeight: 1 }}>◎</span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: ZONE_COLOR,
            letterSpacing: '0.04em',
            opacity: 0.9,
          }}
        >
          {zoneName}
        </span>
      </div>
    );
  }

  if (config?.regionId) {
    const regionCfg  = nodeConfigs[config.regionId];
    const regionName = regionCfg?.regionName ?? regionCfg?.label ?? 'Region';
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px 4px',
          borderTop: `1px solid ${REGION_COLOR}22`,
          background: `${REGION_COLOR}09`,
          borderBottomLeftRadius: 7,
          borderBottomRightRadius: 7,
        }}
      >
        <span style={{ fontSize: 8, color: REGION_COLOR, lineHeight: 1 }}>⬡</span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: REGION_COLOR,
            letterSpacing: '0.04em',
            opacity: 0.9,
          }}
        >
          {regionName}
        </span>
      </div>
    );
  }

  return null;
}

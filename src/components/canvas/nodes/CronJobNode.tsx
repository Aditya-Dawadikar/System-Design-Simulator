'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import NodeLocationBadge from '@/components/shared/NodeLocationBadge';

const COLOR = '#34d399';
const ICON = '◷';

function fmtRate(rps: number): string {
  if (rps >= 1000) return `${(rps / 1000).toFixed(1)}k/s`;
  if (rps < 0.01) return `${(rps * 60).toFixed(2)}/min`;
  return `${rps.toFixed(3)}/s`;
}

export default memo(function CronJobNode({ id, selected }: NodeProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[id]);
  const running = useSimulationStore((s) => s.running);
  const metrics = useSimulationStore((s) => s.nodeMetrics[id]);

  const label = config?.label ?? 'Cron Job';
  const intervalMinutes = config?.intervalMinutes ?? 5;
  const tasksPerRun = config?.tasksPerRun ?? 100;
  const emissionRate = tasksPerRun / (intervalMinutes * 60);

  const borderColor = running ? COLOR : `${COLOR}66`;
  const boxShadow = selected
    ? `0 0 0 2px ${COLOR}44, 0 0 20px ${COLOR}33`
    : running
    ? `0 0 10px ${COLOR}22`
    : 'none';

  return (
    <div
      style={{
        width: 208,
        background: 'var(--bg-panel)',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 8,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'var(--text)',
        boxShadow,
        transition: 'border-color 0.3s, box-shadow 0.3s',
        position: 'relative',
      }}
    >
      {/* No target handle — cron is always a source */}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px 8px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 15, color: COLOR, lineHeight: 1 }}>{ICON}</span>
          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', letterSpacing: '0.02em' }}>
            {label}
          </span>
        </div>
        <div
          style={{
            background: running ? `${COLOR}20` : 'var(--border)',
            border: `1px solid ${running ? COLOR + '55' : 'var(--border)'}`,
            borderRadius: 4,
            padding: '2px 6px',
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, color: running ? COLOR : 'var(--text-dim)', letterSpacing: '0.06em' }}>
            {running ? 'RUNNING' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Schedule info */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>INTERVAL</span>
          <span style={{ color: COLOR, fontSize: 10, fontWeight: 600 }}>
            every {intervalMinutes >= 60 ? `${(intervalMinutes / 60).toFixed(1)}h` : `${intervalMinutes}m`}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>TASKS/RUN</span>
          <span style={{ color: 'var(--text)', fontSize: 10, fontWeight: 600 }}>
            {tasksPerRun.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Emission rate */}
      <div style={{ padding: '8px 12px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 2 }}>EMISSION RATE</div>
        <div style={{ fontWeight: 700, fontSize: 13, color: COLOR }}>
          {fmtRate(emissionRate)}
        </div>
        {running && metrics && (
          <div style={{ marginTop: 4, fontSize: 10, color: metrics.errorRate > 0 ? 'var(--accent-red)' : 'var(--text-dim)' }}>
            {metrics.errorRate > 0
              ? `${(metrics.errorRate * 100).toFixed(1)}% downstream errors`
              : 'downstream OK'}
          </div>
        )}
      </div>

      <NodeLocationBadge nodeId={id} />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: COLOR, border: '2px solid var(--bg-panel)', width: 10, height: 10, bottom: -6 }}
      />
    </div>
  );
});

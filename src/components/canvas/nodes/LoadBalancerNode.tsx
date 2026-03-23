'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import type { NodeStatus } from '@/types';

const COLOR = '#ff55bb';
const ICON = '⇌';

function getStatusFromLoad(load: number, failed: boolean): NodeStatus {
  if (failed) return 'failed';
  if (load > 1.0) return 'failed';
  if (load > 0.8) return 'critical';
  if (load > 0.5) return 'stressed';
  if (load > 0) return 'ok';
  return 'idle';
}

const STATUS_COLORS: Record<NodeStatus, string> = {
  ok: '#00ff88',
  stressed: '#ffcc00',
  critical: '#ff8833',
  failed: '#ff3355',
  idle: '#a1b3bf',
};

const STATUS_LABELS: Record<NodeStatus, string> = {
  ok: 'OK',
  stressed: 'STRESS',
  critical: 'CRIT',
  failed: 'FAIL',
  idle: 'IDLE',
};

const ALGO_SHORT: Record<string, string> = {
  round_robin: 'RR',
  least_conn: 'LC',
  ip_hash: 'IP',
  random: 'RND',
  weighted: 'WGT',
};

function getBorderColor(status: NodeStatus): string {
  if (status === 'idle' || status === 'ok') return COLOR;
  return STATUS_COLORS[status];
}

export default memo(function LoadBalancerNode({ id, selected }: NodeProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[id]);
  const running = useSimulationStore((s) => s.running);
  const metrics = useSimulationStore((s) => s.nodeMetrics[id]);

  const label = config?.label ?? 'Load Balancer';
  const algorithm = config?.algorithm ?? 'round_robin';
  const maxConnections = config?.maxConnections ?? 100000;

  const status = running && metrics
    ? getStatusFromLoad(metrics.load, metrics.failed)
    : 'idle';

  const borderColor = getBorderColor(status);
  const statusColor = STATUS_COLORS[status];
  const boxShadow = selected
    ? `0 0 0 2px ${COLOR}44, 0 0 20px ${COLOR}33`
    : status !== 'idle'
    ? `0 0 12px ${borderColor}22`
    : 'none';

  const maxConnStr =
    maxConnections >= 1000
      ? `${(maxConnections / 1000).toFixed(0)}k`
      : String(maxConnections);

  return (
    <div
      style={{
        width: 208,
        background: '#0b1016',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 8,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: '#b0c8e0',
        boxShadow,
        transition: 'border-color 0.3s, box-shadow 0.3s',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: COLOR,
          border: '2px solid #0b1016',
          width: 10,
          height: 10,
          top: -6,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px 8px',
          borderBottom: '1px solid #172030',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 15, color: COLOR, lineHeight: 1 }}>{ICON}</span>
          <span style={{ fontWeight: 600, fontSize: 12, color: '#e0f0ff', letterSpacing: '0.02em' }}>
            {label}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: `${statusColor}18`,
            border: `1px solid ${statusColor}55`,
            borderRadius: 4,
            padding: '2px 6px',
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, letterSpacing: '0.06em' }}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      {/* Config summary */}
      <div style={{ padding: '8px 12px', borderBottom: running && metrics ? '1px solid #172030' : 'none' }}>
        <span style={{ color: '#a1b3bf' }}>
          {ALGO_SHORT[algorithm] ?? algorithm} · {maxConnStr} max conn
        </span>
      </div>

      {/* Metrics */}
      {running && metrics && (
        <div
          style={{
            padding: '8px 12px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 8px',
          }}
        >
          <div>
            <span style={{ color: '#a1b3bf', fontSize: 10 }}>RPS IN</span>
            <div style={{ color: COLOR, fontWeight: 600, fontSize: 12 }}>
              {metrics.rpsIn >= 1000
                ? `${(metrics.rpsIn / 1000).toFixed(1)}k`
                : metrics.rpsIn.toFixed(0)}
            </div>
          </div>
          <div>
            <span style={{ color: '#a1b3bf', fontSize: 10 }}>LOAD</span>
            <div style={{ fontWeight: 600, fontSize: 12, color: statusColor }}>
              {Math.round(metrics.load * 100)}%
            </div>
          </div>
          <div>
            <span style={{ color: '#a1b3bf', fontSize: 10 }}>ERR%</span>
            <div
              style={{
                fontWeight: 600,
                fontSize: 12,
                color: metrics.errorRate > 0 ? '#ff3355' : '#a1b3bf',
              }}
            >
              {(metrics.errorRate * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <span style={{ color: '#a1b3bf', fontSize: 10 }}>RPS OUT</span>
            <div style={{ color: '#b0c8e0', fontWeight: 600, fontSize: 12 }}>
              {metrics.rpsOut >= 1000
                ? `${(metrics.rpsOut / 1000).toFixed(1)}k`
                : metrics.rpsOut.toFixed(0)}
            </div>
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: COLOR,
          border: '2px solid #0b1016',
          width: 10,
          height: 10,
          bottom: -6,
        }}
      />
    </div>
  );
});

'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import type { NodeStatus } from '@/types';

const COLOR = '#00ff88';
const ICON = '◈';

function getStatusFromLoad(load: number, failed: boolean): NodeStatus {
  if (failed) return 'failed';
  if (load > 1.0) return 'failed';
  if (load > 0.8) return 'critical';
  if (load > 0.5) return 'stressed';
  if (load > 0) return 'ok';
  return 'idle';
}

const STATUS_COLORS: Record<NodeStatus, string> = {
  ok: 'var(--accent-green)',
  stressed: 'var(--accent-yellow)',
  critical: 'var(--accent-orange)',
  failed: 'var(--accent-red)',
  idle: 'var(--text-dim)',
};

const STATUS_LABELS: Record<NodeStatus, string> = {
  ok: 'OK',
  stressed: 'STRESS',
  critical: 'CRIT',
  failed: 'FAIL',
  idle: 'IDLE',
};

function getBorderColor(status: NodeStatus): string {
  if (status === 'idle' || status === 'ok') return COLOR;
  return STATUS_COLORS[status];
}

function fmtRps(rps: number): string {
  return rps >= 1000 ? `${(rps / 1000).toFixed(1)}k` : rps.toFixed(0);
}

export default memo(function AppServerNode({ id, selected }: NodeProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[id]);
  const running = useSimulationStore((s) => s.running);
  const metrics = useSimulationStore((s) => s.nodeMetrics[id]);

  const label = config?.label ?? 'App Server';
  const instances = config?.instances ?? 1;
  const rpsPerInstance = config?.rpsPerInstance ?? 500;
  const appDetail = running && metrics?.detail?.kind === 'app_server' ? metrics.detail : null;
  const activeInstances = appDetail?.activeInstances ?? instances;
  const pendingInstances = appDetail?.pendingInstances ?? 0;
  const totalCapacity = activeInstances * rpsPerInstance;

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

  const loadPerInstance = running && metrics
    ? metrics.load
    : null;

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
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: COLOR,
          border: '2px solid var(--bg-panel)',
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
      <div style={{ padding: '8px 12px', borderBottom: running && metrics ? '1px solid var(--border)' : 'none' }}>
        <span style={{ color: 'var(--text-dim)' }}>
          {pendingInstances > 0 ? `${activeInstances}+${pendingInstances}` : activeInstances}× inst · {fmtRps(totalCapacity)} cap
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
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>LOAD/INST</span>
            <div style={{ fontWeight: 600, fontSize: 12, color: statusColor }}>
              {loadPerInstance !== null ? `${Math.round(loadPerInstance * 100)}%` : '—'}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>LATENCY</span>
            <div style={{ fontWeight: 600, fontSize: 12, color: COLOR }}>
              {metrics.latencyMs.toFixed(0)}ms
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>RPS</span>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>
              {fmtRps(metrics.rpsIn)}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>P99</span>
            <div
              style={{
                fontWeight: 600,
                fontSize: 12,
                color: metrics.p99LatencyMs > 500 ? 'var(--accent-red)' : 'var(--text)',
              }}
            >
              {metrics.p99LatencyMs.toFixed(0)}ms
            </div>
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: COLOR,
          border: '2px solid var(--bg-panel)',
          width: 10,
          height: 10,
          bottom: -6,
        }}
      />
    </div>
  );
});

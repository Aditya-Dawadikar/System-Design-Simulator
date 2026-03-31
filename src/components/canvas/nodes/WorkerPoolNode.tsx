'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import type { NodeStatus } from '@/types';
import NodeLocationBadge from '@/components/shared/NodeLocationBadge';

const COLOR = '#facc15';
const ICON = '⚙';

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

function fmtRps(rps: number): string {
  return rps >= 1000 ? `${(rps / 1000).toFixed(1)}k` : rps.toFixed(1);
}

export default memo(function WorkerPoolNode({ id, selected }: NodeProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[id]);
  const running = useSimulationStore((s) => s.running);
  const metrics = useSimulationStore((s) => s.nodeMetrics[id]);

  const label = config?.label ?? 'Worker Pool';
  const workers = config?.workerCount ?? 4;
  const threads = config?.threadCount ?? 4;
  const durationMs = config?.taskDurationMs ?? 500;
  const capacity = Math.round(workers * threads * (1000 / durationMs));

  const status = running && metrics
    ? getStatusFromLoad(metrics.load, metrics.failed)
    : 'idle';

  const borderColor = (status === 'idle' || status === 'ok') ? COLOR : STATUS_COLORS[status];
  const statusColor = STATUS_COLORS[status];
  const boxShadow = selected
    ? `0 0 0 2px ${COLOR}44, 0 0 20px ${COLOR}33`
    : status !== 'idle'
    ? `0 0 12px ${borderColor}22`
    : 'none';

  const activeWorkers = running && metrics
    ? Math.min(workers * threads, Math.round(metrics.load * workers * threads))
    : 0;

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
        style={{ background: COLOR, border: '2px solid var(--bg-panel)', width: 10, height: 10, top: -6 }}
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

      {/* Spec summary */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>WORKERS × THREADS</span>
          <span style={{ color: COLOR, fontSize: 10, fontWeight: 600 }}>{workers}×{threads}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>TASK DURATION</span>
          <span style={{ color: 'var(--text)', fontSize: 10, fontWeight: 600 }}>
            {durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`}
          </span>
        </div>
      </div>

      {/* Capacity bar + metrics */}
      <div style={{ padding: '8px 12px' }}>
        {/* Thread utilization bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>THREADS ACTIVE</span>
            <span style={{ color: statusColor, fontSize: 10, fontWeight: 600 }}>
              {running && metrics ? `${activeWorkers}/${workers * threads}` : `—/${workers * threads}`}
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (running && metrics ? metrics.load : 0) * 100)}%`,
                background: statusColor,
                borderRadius: 2,
                transition: 'width 0.4s, background 0.3s',
              }}
            />
          </div>
        </div>

        {running && metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>TASKS/S IN</span>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>
                {fmtRps(metrics.rpsIn)}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>CAPACITY</span>
              <div style={{ fontWeight: 600, fontSize: 12, color: COLOR }}>
                {fmtRps(capacity)}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>LATENCY</span>
              <div style={{ fontWeight: 600, fontSize: 12, color: COLOR }}>
                {metrics.latencyMs.toFixed(0)}ms
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>ERR</span>
              <div style={{ fontWeight: 600, fontSize: 12, color: metrics.errorRate > 0 ? 'var(--accent-red)' : 'var(--text)' }}>
                {(metrics.errorRate * 100).toFixed(1)}%
              </div>
            </div>
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

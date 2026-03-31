'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import type { NodeStatus } from '@/types';
import NodeLocationBadge from '@/components/shared/NodeLocationBadge';

const COLOR = '#d97706';
const ICON = '▤';

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
  ok: 'OK', stressed: 'STRESS', critical: 'CRIT', failed: 'FAIL', idle: 'IDLE',
};

function fmtNum(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
}

export default memo(function BlockStorageNode({ id, selected }: NodeProps) {
  const config  = useArchitectureStore((s) => s.nodeConfigs[id]);
  const running = useSimulationStore((s) => s.running);
  const metrics = useSimulationStore((s) => s.nodeMetrics[id]);

  const label      = config?.label ?? 'Block Storage';
  const diskType   = config?.diskType ?? 'ssd';
  const iopsLimit  = config?.iops ?? 3000;
  const storageGb  = config?.storageGb ?? 100;

  const status = running && metrics
    ? getStatusFromLoad(metrics.load, metrics.failed)
    : 'idle';

  const borderColor = status === 'idle' || status === 'ok' ? COLOR : STATUS_COLORS[status];
  const statusColor = STATUS_COLORS[status];
  const boxShadow = selected
    ? `0 0 0 2px ${COLOR}44, 0 0 20px ${COLOR}33`
    : status !== 'idle' ? `0 0 12px ${borderColor}22` : 'none';

  const detail = metrics?.detail?.kind === 'block_storage' ? metrics.detail : null;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 15, color: COLOR, lineHeight: 1 }}>{ICON}</span>
          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', letterSpacing: '0.02em' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${statusColor}18`, border: `1px solid ${statusColor}55`, borderRadius: 4, padding: '2px 6px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, letterSpacing: '0.06em' }}>{STATUS_LABELS[status]}</span>
        </div>
      </div>

      {/* Config summary */}
      <div style={{ padding: '8px 12px', borderBottom: running && metrics ? '1px solid var(--border)' : 'none' }}>
        <span style={{ color: 'var(--text-dim)' }}>
          {diskType.toUpperCase()} · {fmtNum(iopsLimit)} IOPS · {storageGb} GB
        </span>
      </div>

      {/* Metrics */}
      {running && metrics && (
        <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>IOPS</span>
            <div style={{ fontWeight: 600, fontSize: 12, color: statusColor }}>
              {detail ? fmtNum(detail.iopsUsed) : fmtNum(metrics.rpsIn)}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>LATENCY</span>
            <div style={{ fontWeight: 600, fontSize: 12, color: COLOR }}>
              {metrics.latencyMs.toFixed(1)}ms
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>QUEUE</span>
            <div style={{ fontWeight: 600, fontSize: 12, color: detail && detail.queueDepth > 0 ? 'var(--accent-red)' : 'var(--text)' }}>
              {detail ? detail.queueDepth.toFixed(0) : '0'}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>LOAD</span>
            <div style={{ fontWeight: 600, fontSize: 12, color: statusColor }}>
              {Math.round(metrics.load * 100)}%
            </div>
          </div>
        </div>
      )}

      <NodeLocationBadge nodeId={id} />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: COLOR, border: '2px solid var(--bg-panel)', width: 10, height: 10, bottom: -6 }}
      />
    </div>
  );
});

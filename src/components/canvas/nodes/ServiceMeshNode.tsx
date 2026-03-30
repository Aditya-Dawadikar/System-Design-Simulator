'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import type { NodeStatus } from '@/types';

const COLOR = '#22d3ee';
const ICON = '⊛';

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

function fmtRps(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
}

export default memo(function ServiceMeshNode({ id, selected }: NodeProps) {
  const config      = useArchitectureStore((s) => s.nodeConfigs[id]);
  const nodeConfigs = useArchitectureStore((s) => s.nodeConfigs);
  const running     = useSimulationStore((s) => s.running);
  const metrics     = useSimulationStore((s) => s.nodeMetrics[id]);

  const label     = config?.label ?? 'Service Mesh';
  const mtls      = config?.mtlsEnabled !== false;
  const proxyMs   = config?.proxyOverheadMs ?? 2;
  const cbEnabled = config?.meshCircuitBreakerEnabled ?? false;
  const routes    = config?.meshRoutes ?? [];

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

  const detail = metrics?.detail?.kind === 'service_mesh' ? metrics.detail : null;

  // Deduplicate routes: keep highest-weight rule per (source, dest) pair
  const pairMaxWeight = new Map<string, { id: string; weight: number }>();
  for (const r of routes) {
    const key = `${r.sourceNodeId}→${r.destNodeId}`;
    const cur = pairMaxWeight.get(key);
    if (!cur || r.weightPct > cur.weight) {
      pairMaxWeight.set(key, { id: r.id, weight: r.weightPct });
    }
  }
  const effectiveIds = new Set(Array.from(pairMaxWeight.values()).map((v) => v.id));
  const effectiveRoutes = routes.filter((r) => effectiveIds.has(r.id));

  const totalWeight = effectiveRoutes.reduce((s, r) => s + r.weightPct, 0);
  const displayRoutes = effectiveRoutes.slice(0, 4).map((r) => {
    const srcLabel = nodeConfigs[r.sourceNodeId]?.label ?? r.sourceNodeId ?? '?';
    const dstLabel = nodeConfigs[r.destNodeId]?.label ?? r.destNodeId ?? '?';
    return {
      label: `${srcLabel} → ${dstLabel}`,
      pct: totalWeight > 0 ? Math.round((r.weightPct / totalWeight) * 100) : r.weightPct,
    };
  });

  const hasRoutes = effectiveRoutes.length > 0;
  const hasMetrics = running && metrics;

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
            display: 'flex', alignItems: 'center', gap: 4,
            background: `${statusColor}18`, border: `1px solid ${statusColor}55`,
            borderRadius: 4, padding: '2px 6px',
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, letterSpacing: '0.06em' }}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      {/* Config summary */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--text-dim)' }}>
          {mtls ? 'mTLS' : 'no-TLS'} · {proxyMs}ms overhead
          {cbEnabled && ' · CB'}
        </span>
      </div>

      {/* Routing table */}
      {hasRoutes && (
        <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 4, fontWeight: 600 }}>
            ROUTES
          </div>
          {displayRoutes.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span
                style={{
                  fontSize: 10, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: 130,
                }}
              >
                {r.label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: COLOR, flexShrink: 0 }}>
                {r.pct}%
              </span>
            </div>
          ))}
          {effectiveRoutes.length > 4 && (
            <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
              +{effectiveRoutes.length - 4} more
            </div>
          )}
        </div>
      )}

      {/* Metrics */}
      {hasMetrics && (
        <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>RPS IN</span>
            <div style={{ color: COLOR, fontWeight: 600, fontSize: 12 }}>{fmtRps(metrics.rpsIn)}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>LATENCY</span>
            <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: 12 }}>
              {metrics.latencyMs.toFixed(1)}ms
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>RPS OUT</span>
            <div
              style={{
                fontWeight: 600, fontSize: 12,
                color: metrics.rpsOut > metrics.rpsIn
                  ? 'var(--accent-yellow)'   // amplified by retries
                  : 'var(--accent-green)',
              }}
            >
              {fmtRps(metrics.rpsOut)}
              {metrics.rpsOut > metrics.rpsIn * 1.01 && (
                <span style={{ fontSize: 9, color: 'var(--accent-yellow)', marginLeft: 3 }}>↑retry</span>
              )}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>
              {cbEnabled ? 'CIRCUIT' : 'RETRY%'}
            </span>
            <div
              style={{
                fontWeight: 600, fontSize: 12,
                color: cbEnabled
                  ? (detail?.circuitBroken ? 'var(--accent-red)' : 'var(--accent-green)')
                  : (detail && detail.retryRate > 0 ? 'var(--accent-orange)' : 'var(--text-dim)'),
              }}
            >
              {cbEnabled
                ? (detail?.circuitBroken ? 'OPEN' : 'CLOSED')
                : (detail ? `${(detail.retryRate * 100).toFixed(1)}%` : '0.0%')}
            </div>
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: COLOR, border: '2px solid var(--bg-panel)', width: 10, height: 10, bottom: -6 }}
      />
    </div>
  );
});

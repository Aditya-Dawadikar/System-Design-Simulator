'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import type { NodeStatus } from '@/types';
import NodeLocationBadge from '@/components/shared/NodeLocationBadge';

const COLOR = '#ef4444';
const ICON = '⊟';

function getStatus(load: number, failed: boolean): NodeStatus {
  if (failed || load > 1.0) return 'failed';
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

export default memo(function FirewallNode({ id, selected }: NodeProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[id]);
  const running = useSimulationStore((s) => s.running);
  const metrics = useSimulationStore((s) => s.nodeMetrics[id]);

  const label = config?.label ?? 'Firewall';
  const rules = config?.firewallRules ?? 10;
  const mode = config?.firewallInspectionMode ?? 'basic';
  const blockRatePct = config?.firewallBlockRatePct ?? 0;

  const status = running && metrics ? getStatus(metrics.load, metrics.failed) : 'idle';
  const statusColor = STATUS_COLORS[status];
  const borderColor = (status === 'idle' || status === 'ok') ? COLOR : statusColor;

  const detail = metrics?.detail?.kind === 'firewall' ? metrics.detail : null;

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
        boxShadow: selected ? `0 0 0 2px ${COLOR}44, 0 0 20px ${COLOR}33` : 'none',
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
          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{label}</span>
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

      {/* Config */}
      <div style={{ padding: '8px 12px', borderBottom: running && metrics ? '1px solid var(--border)' : 'none' }}>
        <span style={{ color: 'var(--text-dim)' }}>
          {mode === 'deep' ? 'Deep' : 'Basic'} · {rules} rules
          {blockRatePct > 0 && <span style={{ color: 'var(--accent-red)' }}> · {blockRatePct}% blk</span>}
        </span>
      </div>

      {/* Metrics */}
      {running && metrics && (
        <div style={{ padding: '8px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>ALLOWED</span>
              <div style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: 12 }}>
                {detail
                  ? (detail.allowedRps >= 1000 ? `${(detail.allowedRps / 1000).toFixed(1)}k` : detail.allowedRps.toFixed(0))
                  : (metrics.rpsOut >= 1000 ? `${(metrics.rpsOut / 1000).toFixed(1)}k` : metrics.rpsOut.toFixed(0))
                }/s
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>BLOCKED</span>
              <div
                style={{
                  fontWeight: 600, fontSize: 12,
                  color: detail && detail.blockedRps > 0 ? 'var(--accent-red)' : 'var(--text-dim)',
                }}
              >
                {detail
                  ? (detail.blockedRps >= 1000 ? `${(detail.blockedRps / 1000).toFixed(1)}k` : detail.blockedRps.toFixed(0))
                  : '0'
                }/s
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>LOAD</span>
              <div style={{ fontWeight: 600, fontSize: 12, color: statusColor }}>
                {Math.round(metrics.load * 100)}%
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>LAT</span>
              <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: 12 }}>
                {metrics.latencyMs.toFixed(0)}ms
              </div>
            </div>
          </div>
          {detail && detail.blockedRps > 0 && (
            <div
              style={{
                marginTop: 6, padding: '3px 7px',
                background: 'color-mix(in srgb, var(--accent-red) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-red) 35%, transparent)',
                borderRadius: 4, display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span style={{ fontSize: 9, color: 'var(--accent-red)' }}>⊟</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--accent-red)', letterSpacing: '0.04em' }}>
                {detail.blockedRps.toFixed(0)} rps blocked ({blockRatePct}%)
              </span>
            </div>
          )}
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

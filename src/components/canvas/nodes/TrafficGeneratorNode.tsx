'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import NodeLocationBadge from '@/components/shared/NodeLocationBadge';

const COLOR = '#f43f5e';
const ICON = '↯';

function fmtRps(rps: number): string {
  return rps >= 1000 ? `${(rps / 1000).toFixed(1)}k` : rps.toFixed(0);
}

const PATTERN_LABELS: Record<string, string> = {
  steady: 'STEADY',
  ramp: 'RAMP',
  spike: 'SPIKE',
  wave: 'WAVE',
  chaos: 'CHAOS',
};


export default memo(function TrafficGeneratorNode({ id, selected }: NodeProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[id]);
  const running = useSimulationStore((s) => s.running);
  const metrics = useSimulationStore((s) => s.nodeMetrics[id]);

  const label = config?.label ?? 'Traffic Gen';
  const baseRps = config?.generatorRps ?? 1000;
  const pattern = config?.generatorPattern ?? 'steady';
  const readPct = config?.readRatioPct ?? 50;
  const badPct = config?.badTrafficPct ?? 0;

  const liveRps = running && metrics ? metrics.rpsIn : baseRps;
  const readRps = liveRps * readPct / 100;
  const writeRps = liveRps * (100 - readPct) / 100;
  const badRps = liveRps * badPct / 100;

  const boxShadow = selected
    ? `0 0 0 2px ${COLOR}44, 0 0 20px ${COLOR}33`
    : running
    ? `0 0 12px ${COLOR}22`
    : 'none';

  return (
    <div
      style={{
        width: 208,
        background: 'var(--bg-panel)',
        border: `1.5px solid ${COLOR}`,
        borderRadius: 8,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'var(--text)',
        boxShadow,
        transition: 'border-color 0.3s, box-shadow 0.3s',
        position: 'relative',
      }}
    >
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
        <div style={{ display: 'flex', gap: 4 }}>
          <div
            style={{
              background: `${COLOR}18`,
              border: `1px solid ${COLOR}55`,
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, color: COLOR, letterSpacing: '0.06em' }}>
              {PATTERN_LABELS[pattern] ?? pattern.toUpperCase()}
            </span>
          </div>
          <div
            style={{
              background: '#38bdf808',
              border: '1px solid #38bdf855',
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.06em' }}>
              R{readPct}
            </span>
          </div>
        </div>
      </div>

      {/* RPS display */}
      <div style={{ padding: '8px 12px 6px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 4 }}>
          {running ? 'LIVE RPS' : 'BASE RPS'}
        </div>
        <div style={{ fontWeight: 700, fontSize: 20, color: COLOR, letterSpacing: '-0.02em' }}>
          {fmtRps(liveRps)}
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 4 }}>
            req/s
          </span>
        </div>
      </div>

      {/* Read / Write / Bad split */}
      <div style={{ padding: '0 12px 8px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ color: 'var(--text-dim)', fontSize: 9 }}>R </span>
          <span style={{ fontWeight: 600, fontSize: 11, color: '#38bdf8' }}>{fmtRps(readRps)}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)', fontSize: 9 }}>W </span>
          <span style={{ fontWeight: 600, fontSize: 11, color: '#fb923c' }}>{fmtRps(writeRps)}</span>
        </div>
        {badPct > 0 && (
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: 9 }}>BAD </span>
            <span style={{ fontWeight: 600, fontSize: 11, color: '#ef4444' }}>{fmtRps(badRps)}</span>
          </div>
        )}
      </div>
      {badPct > 0 && (
        <div
          style={{
            margin: '0 12px 8px',
            padding: '2px 7px',
            background: '#ef444410',
            border: '1px solid #ef444430',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span style={{ fontSize: 9, color: '#ef4444' }}>⊟</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#ef4444', letterSpacing: '0.04em' }}>
            {badPct}% malicious traffic
          </span>
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

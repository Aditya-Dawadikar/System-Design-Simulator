'use client';

import { useArchitectureStore } from '@/store/architectureStore';

const COLOR = '#f97316';

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: '4px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px',
  padding: '5px 8px',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '9px',
  color: 'var(--text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  display: 'block',
  marginBottom: '5px',
};

const fieldStyle: React.CSSProperties = { marginBottom: '14px' };

export default function NatGatewayFields({ nodeId }: { nodeId: string }) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const update = useArchitectureStore((s) => s.updateNodeConfig);

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Bandwidth (Gbps)</label>
        <input
          type="number"
          min={1}
          max={100}
          step={1}
          value={config.natBandwidthGbps ?? 10}
          onChange={(e) => update(nodeId, { natBandwidthGbps: Number(e.target.value) })}
          style={inputStyle}
        />
        <span style={{ ...labelStyle, marginTop: 4, textTransform: 'none', letterSpacing: 0 }}>
          Capacity ≈ {((config.natBandwidthGbps ?? 10) * 5000).toLocaleString()} RPS
        </span>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Max Connections</label>
        <input
          type="number"
          min={1000}
          max={1000000}
          step={1000}
          value={config.maxConnections ?? 55000}
          onChange={(e) => update(nodeId, { maxConnections: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div
        style={{
          marginTop: 4,
          padding: '8px 10px',
          background: `${COLOR}0a`,
          border: `1px solid ${COLOR}20`,
          borderRadius: '4px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: 'var(--text-dim)',
          lineHeight: 1.7,
        }}
      >
        NAT Gateway translates private IPs to a public IP for outbound internet traffic.
        Bandwidth limit determines maximum throughput; connection limit caps simultaneous sessions.
      </div>
    </div>
  );
}

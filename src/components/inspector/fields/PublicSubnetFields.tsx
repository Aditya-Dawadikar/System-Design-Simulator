'use client';

import { useArchitectureStore } from '@/store/architectureStore';

const ACCENT = '#4ade80';

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

export default function PublicSubnetFields({ nodeId }: { nodeId: string }) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const update = useArchitectureStore((s) => s.updateNodeConfig);

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>CIDR Block</label>
        <input
          type="text"
          value={config.subnetCidr ?? '10.0.0.0/24'}
          onChange={(e) => update(nodeId, { subnetCidr: e.target.value })}
          placeholder="e.g. 10.0.0.0/24"
          style={inputStyle}
          spellCheck={false}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Container Width (px)</label>
        <input
          type="number"
          min={200}
          max={2000}
          step={20}
          value={config.containerWidth ?? 500}
          onChange={(e) => update(nodeId, { containerWidth: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Container Height (px)</label>
        <input
          type="number"
          min={200}
          max={2000}
          step={20}
          value={config.containerHeight ?? 350}
          onChange={(e) => update(nodeId, { containerHeight: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div
        style={{
          marginTop: 4,
          padding: '8px 10px',
          background: `${ACCENT}0a`,
          border: `1px solid ${ACCENT}20`,
          borderRadius: '4px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: 'var(--text-dim)',
          lineHeight: 1.7,
        }}
      >
        Public subnets have a direct route to an Internet Gateway. Place load balancers,
        NAT gateways, and bastion hosts here. This is a visual container only — no simulation effect.
      </div>
    </div>
  );
}

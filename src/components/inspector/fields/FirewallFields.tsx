'use client';

import { useArchitectureStore } from '@/store/architectureStore';

const COLOR = '#ef4444';

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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2338505f'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  paddingRight: '24px',
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

export default function FirewallFields({ nodeId }: { nodeId: string }) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const update = useArchitectureStore((s) => s.updateNodeConfig);

  const blockRatePct = config.firewallBlockRatePct ?? 0;

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Inspection Mode</label>
        <select
          value={config.firewallInspectionMode ?? 'basic'}
          onChange={(e) => update(nodeId, { firewallInspectionMode: e.target.value as 'basic' | 'deep' })}
          style={selectStyle}
        >
          <option value="basic">Basic — stateful L4 (50k RPS, ~2 ms)</option>
          <option value="deep">Deep — DPI / L7 (10k RPS, ~10 ms)</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Rule Count</label>
        <input
          type="number"
          min={1}
          max={10000}
          step={1}
          value={config.firewallRules ?? 10}
          onChange={(e) => update(nodeId, { firewallRules: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Block Rate — {blockRatePct}%</label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={blockRatePct}
          onChange={(e) => update(nodeId, { firewallBlockRatePct: Number(e.target.value) })}
          style={{ width: '100%', accentColor: COLOR }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: 'var(--text-dim)',
            marginTop: 3,
          }}
        >
          <span>0% (pass all)</span>
          <span>100% (block all)</span>
        </div>
        {blockRatePct > 0 && (
          <div
            style={{
              marginTop: 6,
              padding: '4px 8px',
              background: `${COLOR}10`,
              border: `1px solid ${COLOR}30`,
              borderRadius: 4,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px',
              color: COLOR,
            }}
          >
            {blockRatePct}% of incoming traffic will be blocked (simulates ACL / WAF rules matching)
          </div>
        )}
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
        Deep inspection adds latency per packet but enables L7 filtering (HTTP, DNS, TLS).
        Block rate simulates ACL / WAF rules dropping malicious or unauthorised traffic.
      </div>
    </div>
  );
}

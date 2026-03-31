'use client';

import { useArchitectureStore } from '@/store/architectureStore';

const COLOR = '#818cf8';
const FAILED_COLOR = '#f87171';

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
  cursor: 'pointer',
};

const fieldStyle: React.CSSProperties = { marginBottom: '14px' };

interface Props { nodeId: string }

export default function GlobalAcceleratorFields({ nodeId }: Props) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const update = useArchitectureStore((s) => s.updateNodeConfig);

  const failoverEnabled = config.failoverEnabled !== false;

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Routing Policy</label>
        <select
          value={config.routingPolicy ?? 'latency'}
          onChange={(e) => update(nodeId, { routingPolicy: e.target.value as 'latency' | 'geo' | 'weighted' })}
          style={inputStyle}
        >
          <option value="latency">Latency-Based (default)</option>
          <option value="geo">Geographic</option>
          <option value="weighted">Weighted</option>
        </select>
      </div>

      {/* Failover toggle */}
      <div
        style={{
          marginBottom: '14px',
          padding: '10px 12px',
          background: !failoverEnabled ? `${FAILED_COLOR}10` : `${COLOR}08`,
          border: `1px solid ${!failoverEnabled ? FAILED_COLOR : COLOR}30`,
          borderRadius: '6px',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={failoverEnabled}
            onChange={(e) => update(nodeId, { failoverEnabled: e.target.checked })}
            style={{ width: 14, height: 14, accentColor: COLOR, cursor: 'pointer' }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              color: failoverEnabled ? COLOR : 'var(--text-dim)',
              letterSpacing: '0.02em',
            }}
          >
            {failoverEnabled ? 'Health-Aware Failover ON' : 'Failover Disabled'}
          </span>
        </label>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: 'var(--text-dim)',
            margin: '6px 0 0 24px',
            lineHeight: 1.6,
          }}
        >
          {failoverEnabled
            ? 'Traffic is automatically rerouted to healthy endpoints when a downstream region fails.'
            : 'Traffic is distributed evenly regardless of downstream health.'}
        </p>
      </div>

      <div
        style={{
          marginTop: '4px',
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
        Connect this to regional entry points (Load Balancers or App Servers in different regions).
        Fail a region via its Region node inspector to observe traffic rerouting.
      </div>
    </div>
  );
}

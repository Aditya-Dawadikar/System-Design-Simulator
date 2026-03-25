'use client';

import { useArchitectureStore } from '@/store/architectureStore';
import type { LoadBalancerAlgorithm } from '@/types';

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

const fieldStyle: React.CSSProperties = {
  marginBottom: '14px',
};

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}

function Toggle({ value, onChange, color = 'var(--accent-cyan)' }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '11px',
        color: value ? color : 'var(--text-dim)',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '28px',
          height: '15px',
          borderRadius: '8px',
          background: value ? color : 'var(--border)',
          position: 'relative',
          transition: 'background 0.15s ease',
          border: `1px solid ${value ? color : 'var(--text-dim)'}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: value ? '14px' : '2px',
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: value ? 'var(--bg-base)' : 'var(--text-dim)',
            transition: 'left 0.15s ease',
          }}
        />
      </span>
      {value ? 'Enabled' : 'Disabled'}
    </button>
  );
}

const ALGORITHMS: { value: LoadBalancerAlgorithm; label: string }[] = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'least_conn', label: 'Least Connections' },
  { value: 'ip_hash', label: 'IP Hash' },
  { value: 'random', label: 'Random' },
  { value: 'weighted', label: 'Weighted' },
];

interface LoadBalancerFieldsProps {
  nodeId: string;
}

export default function LoadBalancerFields({ nodeId }: LoadBalancerFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Label</label>
        <input
          type="text"
          value={config.label ?? ''}
          onChange={(e) => updateNodeConfig(nodeId, { label: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Algorithm</label>
        <select
          value={config.algorithm ?? 'round_robin'}
          onChange={(e) => updateNodeConfig(nodeId, { algorithm: e.target.value as LoadBalancerAlgorithm })}
          style={selectStyle}
        >
          {ALGORITHMS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Health Checks</label>
        <Toggle
          value={config.healthChecks ?? true}
          onChange={(v) => updateNodeConfig(nodeId, { healthChecks: v })}
          color="var(--accent-pink)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Max Connections</label>
        <input
          type="number"
          min={100}
          max={10000000}
          value={config.maxConnections ?? 100000}
          onChange={(e) => updateNodeConfig(nodeId, { maxConnections: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

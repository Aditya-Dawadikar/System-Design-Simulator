'use client';

import { useArchitectureStore } from '@/store/architectureStore';
import type { NodeConfig } from '@/types';

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

type EvictionPolicy = NonNullable<NodeConfig['evictionPolicy']>;

const EVICTION_POLICIES: { value: EvictionPolicy; label: string }[] = [
  { value: 'lru', label: 'LRU — Least Recently Used' },
  { value: 'lfu', label: 'LFU — Least Frequently Used' },
  { value: 'noeviction', label: 'No Eviction' },
];

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}

function Toggle({ value, onChange, color = 'var(--accent-orange)' }: ToggleProps) {
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

interface CacheFieldsProps {
  nodeId: string;
}

export default function CacheFields({ nodeId }: CacheFieldsProps) {
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
        <label style={labelStyle}>Memory (GB)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={64}
            value={config.memoryGb ?? 8}
            onChange={(e) => updateNodeConfig(nodeId, { memoryGb: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent-orange)', cursor: 'pointer' }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: 'var(--accent-orange)',
              fontWeight: 600,
              minWidth: '36px',
            }}
          >
            {config.memoryGb ?? 8} GB
          </span>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>TTL (seconds)</label>
        <input
          type="number"
          min={0}
          value={config.ttlSeconds ?? 60}
          onChange={(e) => updateNodeConfig(nodeId, { ttlSeconds: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Eviction Policy</label>
        <select
          value={config.evictionPolicy ?? 'lru'}
          onChange={(e) => updateNodeConfig(nodeId, { evictionPolicy: e.target.value as EvictionPolicy })}
          style={selectStyle}
        >
          {EVICTION_POLICIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Cluster Mode</label>
        <Toggle
          value={config.clusterMode ?? false}
          onChange={(v) => updateNodeConfig(nodeId, { clusterMode: v })}
        />
      </div>
    </div>
  );
}

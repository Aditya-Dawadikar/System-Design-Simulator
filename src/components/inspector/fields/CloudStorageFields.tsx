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

const fieldStyle: React.CSSProperties = { marginBottom: '14px' };
const COLOR = '#38bdf8';

type StorageClass = NonNullable<NodeConfig['storageClass']>;
const STORAGE_CLASSES: { value: StorageClass; label: string; latencyMs: number }[] = [
  { value: 'standard',  label: 'Standard (20ms)',   latencyMs: 20  },
  { value: 'nearline',  label: 'Nearline (50ms)',   latencyMs: 50  },
  { value: 'coldline',  label: 'Coldline (100ms)',  latencyMs: 100 },
  { value: 'archive',   label: 'Archive (500ms)',   latencyMs: 500 },
];

interface CloudStorageFieldsProps { nodeId: string; }

export default function CloudStorageFields({ nodeId }: CloudStorageFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const throughputMbps = config.storageThroughputMbps ?? 1000;
  const objectSizeKb = config.objectSizeKb ?? 512;
  const capacity = Math.round((throughputMbps * 1000) / 8 / objectSizeKb);

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Storage Class</label>
        <select
          value={config.storageClass ?? 'standard'}
          onChange={(e) => updateNodeConfig(nodeId, { storageClass: e.target.value as StorageClass })}
          style={selectStyle}
        >
          {STORAGE_CLASSES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Throughput (Mbps)
          <span style={{ marginLeft: '8px', color: COLOR, fontWeight: 500, fontSize: '9px' }}>
            {capacity.toLocaleString()} ops/s cap
          </span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={100}
            max={10000}
            step={100}
            value={throughputMbps}
            onChange={(e) => updateNodeConfig(nodeId, { storageThroughputMbps: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <input
            type="number"
            min={100}
            max={10000}
            step={100}
            value={throughputMbps}
            onChange={(e) => updateNodeConfig(nodeId, { storageThroughputMbps: Math.min(10000, Math.max(100, Number(e.target.value))) })}
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: COLOR, borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, padding: '3px 5px', width: '62px', textAlign: 'right', outline: 'none', flexShrink: 0 }}
          />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Avg Object Size (KB)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={102400}
            step={1}
            value={objectSizeKb}
            onChange={(e) => updateNodeConfig(nodeId, { objectSizeKb: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <input
            type="number"
            min={1}
            max={102400}
            value={objectSizeKb}
            onChange={(e) => updateNodeConfig(nodeId, { objectSizeKb: Math.min(102400, Math.max(1, Number(e.target.value))) })}
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: COLOR, borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, padding: '3px 5px', width: '62px', textAlign: 'right', outline: 'none', flexShrink: 0 }}
          />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Storage Size (GB)</label>
        <input
          type="number"
          min={1}
          max={1000000}
          value={config.storageGb ?? 1000}
          onChange={(e) => updateNodeConfig(nodeId, { storageGb: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

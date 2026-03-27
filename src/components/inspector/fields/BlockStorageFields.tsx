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
const COLOR = '#d97706';

type DiskType = NonNullable<NodeConfig['diskType']>;
const DISK_TYPES: { value: DiskType; label: string; latencyMs: number; defaultIops: number }[] = [
  { value: 'nvme', label: 'NVMe SSD (0.2ms)',  latencyMs: 0.2, defaultIops: 64000 },
  { value: 'ssd',  label: 'SSD (1ms)',          latencyMs: 1,   defaultIops: 3000  },
  { value: 'hdd',  label: 'HDD (5ms)',          latencyMs: 5,   defaultIops: 150   },
];

function numStyle(color: string): React.CSSProperties {
  return {
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    color,
    borderRadius: '4px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 5px',
    width: '62px',
    textAlign: 'right' as const,
    outline: 'none',
    flexShrink: 0,
  };
}

interface BlockStorageFieldsProps { nodeId: string; }

export default function BlockStorageFields({ nodeId }: BlockStorageFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const diskType = config.diskType ?? 'ssd';
  const diskDef  = DISK_TYPES.find((d) => d.value === diskType)!;
  const iops     = config.iops ?? diskDef.defaultIops;

  function handleDiskTypeChange(newType: DiskType) {
    const def = DISK_TYPES.find((d) => d.value === newType)!;
    updateNodeConfig(nodeId, { diskType: newType, iops: def.defaultIops });
  }

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Disk Type</label>
        <select
          value={diskType}
          onChange={(e) => handleDiskTypeChange(e.target.value as DiskType)}
          style={selectStyle}
        >
          {DISK_TYPES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>
          IOPS Limit
          <span style={{ marginLeft: '8px', color: COLOR, fontWeight: 500, fontSize: '9px' }}>
            {iops.toLocaleString()} IOPS
          </span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={100}
            max={diskType === 'nvme' ? 256000 : diskType === 'ssd' ? 16000 : 500}
            step={diskType === 'nvme' ? 1000 : diskType === 'ssd' ? 100 : 10}
            value={iops}
            onChange={(e) => updateNodeConfig(nodeId, { iops: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <input
            type="number"
            min={100}
            value={iops}
            onChange={(e) => updateNodeConfig(nodeId, { iops: Math.max(100, Number(e.target.value)) })}
            style={numStyle(COLOR)}
          />
        </div>
        <div style={{ marginTop: '5px', color: 'var(--text-dim)', fontSize: '10px' }}>
          Base latency: {diskDef.latencyMs}ms · Throughput: ~{((iops * (config.objectSizeKb ?? 64)) / (1024)).toFixed(0)} MB/s
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Avg IO Size (KB)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={4096}
            step={1}
            value={config.objectSizeKb ?? 64}
            onChange={(e) => updateNodeConfig(nodeId, { objectSizeKb: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <input
            type="number"
            min={1}
            max={4096}
            value={config.objectSizeKb ?? 64}
            onChange={(e) => updateNodeConfig(nodeId, { objectSizeKb: Math.min(4096, Math.max(1, Number(e.target.value))) })}
            style={numStyle(COLOR)}
          />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Volume Size (GB)</label>
        <input
          type="number"
          min={1}
          value={config.storageGb ?? 100}
          onChange={(e) => updateNodeConfig(nodeId, { storageGb: Math.max(1, Number(e.target.value)) })}
          style={inputStyle}
        />
      </div>

      <div style={{
        padding: '8px 10px',
        background: 'var(--bg-base)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        fontSize: '10px',
        color: 'var(--text-dim)',
        lineHeight: 1.6,
      }}>
        Single-attachment volume. Connect app servers via edges to mount this volume. Overloaded IOPS → queue builds → latency increases in attached app servers.
      </div>
    </div>
  );
}

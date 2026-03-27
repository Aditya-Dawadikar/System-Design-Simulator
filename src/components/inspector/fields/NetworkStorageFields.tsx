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
const COLOR = '#6366f1';

type NfsProtocol = NonNullable<NodeConfig['nfsProtocol']>;
const PROTOCOLS: { value: NfsProtocol; label: string; latencyMs: number }[] = [
  { value: 'nfs',    label: 'NFS v4 (5ms)',    latencyMs: 5  },
  { value: 'smb',    label: 'SMB / CIFS (8ms)', latencyMs: 8  },
  { value: 'cephfs', label: 'CephFS (3ms)',     latencyMs: 3  },
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

interface NetworkStorageFieldsProps { nodeId: string; }

export default function NetworkStorageFields({ nodeId }: NetworkStorageFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const protocol      = config.nfsProtocol ?? 'nfs';
  const protocolDef   = PROTOCOLS.find((p) => p.value === protocol)!;
  const throughput    = config.storageThroughputMbps ?? 500;
  const connLimit     = config.connectionLimit ?? 100;
  const ioSizeKb      = config.objectSizeKb ?? 64;
  const capacity      = Math.round((throughput * 1000) / 8 / ioSizeKb);

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Protocol</label>
        <select
          value={protocol}
          onChange={(e) => updateNodeConfig(nodeId, { nfsProtocol: e.target.value as NfsProtocol })}
          style={selectStyle}
        >
          {PROTOCOLS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
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
            min={50}
            max={10000}
            step={50}
            value={throughput}
            onChange={(e) => updateNodeConfig(nodeId, { storageThroughputMbps: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <input
            type="number"
            min={50}
            max={10000}
            step={50}
            value={throughput}
            onChange={(e) => updateNodeConfig(nodeId, { storageThroughputMbps: Math.min(10000, Math.max(50, Number(e.target.value))) })}
            style={numStyle(COLOR)}
          />
        </div>
        <div style={{ marginTop: '5px', color: 'var(--text-dim)', fontSize: '10px' }}>
          Base latency: {protocolDef.latencyMs}ms (network overhead included)
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Max Concurrent Mounts</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={500}
            value={connLimit}
            onChange={(e) => updateNodeConfig(nodeId, { connectionLimit: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <input
            type="number"
            min={1}
            max={500}
            value={connLimit}
            onChange={(e) => updateNodeConfig(nodeId, { connectionLimit: Math.min(500, Math.max(1, Number(e.target.value))) })}
            style={numStyle(COLOR)}
          />
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
            value={ioSizeKb}
            onChange={(e) => updateNodeConfig(nodeId, { objectSizeKb: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <input
            type="number"
            min={1}
            max={4096}
            value={ioSizeKb}
            onChange={(e) => updateNodeConfig(nodeId, { objectSizeKb: Math.min(4096, Math.max(1, Number(e.target.value))) })}
            style={numStyle(COLOR)}
          />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Storage Size (GB)</label>
        <input
          type="number"
          min={1}
          value={config.storageGb ?? 1000}
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
        Shared volume — multiple app servers can mount simultaneously via left, right, or top handles. High connection count or saturated bandwidth adds latency to attached app servers.
      </div>
    </div>
  );
}

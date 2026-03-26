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

type DbEngine = NonNullable<NodeConfig['engine']>;

const DB_ENGINES: DbEngine[] = ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra'];

const RPS_PER_SHARD = 800;

interface DatabaseFieldsProps {
  nodeId: string;
}

export default function DatabaseFields({ nodeId }: DatabaseFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const shards = config.shards ?? 1;
  const readReplicas = config.readReplicas ?? 0;
  const writeCapacity = shards * RPS_PER_SHARD;
  const readCapacity  = (shards + readReplicas) * RPS_PER_SHARD;

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Engine</label>
        <select
          value={config.engine ?? 'PostgreSQL'}
          onChange={(e) => updateNodeConfig(nodeId, { engine: e.target.value as DbEngine })}
          style={selectStyle}
        >
          {DB_ENGINES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Shards
          <span style={{ marginLeft: '8px', color: '#fb923c', fontWeight: 500, fontSize: '9px' }}>
            W: {writeCapacity.toLocaleString()} rps
          </span>
          <span style={{ marginLeft: '6px', color: '#38bdf8', fontWeight: 500, fontSize: '9px' }}>
            R: {readCapacity.toLocaleString()} rps
          </span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={8}
            value={shards}
            onChange={(e) => updateNodeConfig(nodeId, { shards: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
          />
          <input
            type="number"
            min={1}
            max={8}
            value={shards}
            onChange={(e) => updateNodeConfig(nodeId, { shards: Math.min(8, Math.max(1, Number(e.target.value))) })}
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--accent-purple)', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, padding: '3px 5px', width: '54px', textAlign: 'right', outline: 'none', flexShrink: 0 }}
          />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Read Replicas
          <span style={{ marginLeft: '8px', color: '#38bdf8', fontWeight: 500, fontSize: '9px' }}>
            +{(readReplicas * RPS_PER_SHARD).toLocaleString()} read rps
          </span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={0}
            max={4}
            value={readReplicas}
            onChange={(e) => updateNodeConfig(nodeId, { readReplicas: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
          />
          <input
            type="number"
            min={0}
            max={4}
            value={readReplicas}
            onChange={(e) => updateNodeConfig(nodeId, { readReplicas: Math.min(4, Math.max(0, Number(e.target.value))) })}
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--accent-purple)', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, padding: '3px 5px', width: '54px', textAlign: 'right', outline: 'none', flexShrink: 0 }}
          />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Max Connections</label>
        <input
          type="number"
          min={10}
          max={10000}
          value={config.maxConnections ?? 200}
          onChange={(e) => updateNodeConfig(nodeId, { maxConnections: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Storage (GB)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={10}
            max={10000}
            value={config.storageGb ?? 100}
            onChange={(e) => updateNodeConfig(nodeId, { storageGb: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
          />
          <input
            type="number"
            min={10}
            max={10000}
            value={config.storageGb ?? 100}
            onChange={(e) => updateNodeConfig(nodeId, { storageGb: Math.min(10000, Math.max(10, Number(e.target.value))) })}
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--accent-purple)', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, padding: '3px 5px', width: '62px', textAlign: 'right', outline: 'none', flexShrink: 0 }}
          />
        </div>
      </div>
    </div>
  );
}

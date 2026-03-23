'use client';

import { useArchitectureStore } from '@/store/architectureStore';
import type { NodeConfig } from '@/types';

const inputStyle: React.CSSProperties = {
  background: '#05070b',
  border: '1px solid #172030',
  color: '#b0c8e0',
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
  color: '#a1b3bf',
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
  const capacity = shards * RPS_PER_SHARD;

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
          <span
            style={{
              marginLeft: '8px',
              color: '#bb66ff',
              fontWeight: 500,
              fontSize: '9px',
            }}
          >
            capacity: {capacity.toLocaleString()} rps
          </span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={8}
            value={shards}
            onChange={(e) => updateNodeConfig(nodeId, { shards: Number(e.target.value) })}
            style={{ flex: 1, accentColor: '#bb66ff', cursor: 'pointer' }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: '#bb66ff',
              fontWeight: 600,
              minWidth: '12px',
            }}
          >
            {shards}
          </span>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Read Replicas</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={0}
            max={4}
            value={config.readReplicas ?? 0}
            onChange={(e) => updateNodeConfig(nodeId, { readReplicas: Number(e.target.value) })}
            style={{ flex: 1, accentColor: '#bb66ff', cursor: 'pointer' }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: '#bb66ff',
              fontWeight: 600,
              minWidth: '12px',
            }}
          >
            {config.readReplicas ?? 0}
          </span>
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
            style={{ flex: 1, accentColor: '#bb66ff', cursor: 'pointer' }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: '#bb66ff',
              fontWeight: 600,
              minWidth: '48px',
              textAlign: 'right',
            }}
          >
            {(config.storageGb ?? 100).toLocaleString()} GB
          </span>
        </div>
      </div>
    </div>
  );
}

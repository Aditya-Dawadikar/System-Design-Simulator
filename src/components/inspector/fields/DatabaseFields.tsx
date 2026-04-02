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

const numInputStyle: React.CSSProperties = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border)',
  color: 'var(--accent-purple)',
  borderRadius: '4px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px',
  fontWeight: 600,
  padding: '3px 5px',
  width: '54px',
  textAlign: 'right' as const,
  outline: 'none',
  flexShrink: 0,
};

type DbEngine = NonNullable<NodeConfig['engine']>;
type DbRole   = NonNullable<NodeConfig['dbRole']>;

const DB_ENGINES: DbEngine[] = ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra'];

const RPS_PER_SHARD = 800;

interface DatabaseFieldsProps {
  nodeId: string;
}

export default function DatabaseFields({ nodeId }: DatabaseFieldsProps) {
  const config         = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);
  const allNodes       = useArchitectureStore((s) => s.nodes);
  const allConfigs     = useArchitectureStore((s) => s.nodeConfigs);

  const dbRole       = config.dbRole ?? 'standalone';
  const shards       = config.shards ?? 1;
  const readReplicas = config.readReplicas ?? 0;

  // Capacity display
  const writeCapacity = shards * RPS_PER_SHARD;
  const readCapacity  = dbRole === 'standalone'
    ? (shards + readReplicas) * RPS_PER_SHARD
    : shards * RPS_PER_SHARD;

  // Other database nodes for the primaryNodeId picker
  const otherDbNodes = allNodes.filter((n) => n.type === 'database' && n.id !== nodeId);

  // Count how many nodes declare this node as their primary (display only)
  const linkedReplicaCount = Object.entries(allConfigs).filter(
    ([id, cfg]) => id !== nodeId && cfg.primaryNodeId === nodeId && cfg.dbRole === 'replica'
  ).length;

  return (
    <div>
      {/* Role */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Replication Role</label>
        <select
          value={dbRole}
          onChange={(e) => updateNodeConfig(nodeId, { dbRole: e.target.value as DbRole })}
          style={selectStyle}
        >
          <option value="standalone">Standalone — self-contained (legacy)</option>
          <option value="primary">Primary — accepts all writes</option>
          <option value="replica">Read Replica — reads only, linked to primary</option>
        </select>
        {dbRole === 'primary' && (
          <div style={{ marginTop: '5px', fontSize: '9px', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
            {linkedReplicaCount > 0
              ? `${linkedReplicaCount} replica(s) linked to this primary.`
              : 'No replicas linked yet. Set primaryNodeId on replica nodes.'}
          </div>
        )}
        {dbRole === 'replica' && (
          <div style={{ marginTop: '5px', fontSize: '9px', color: 'var(--accent-red)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
            Writes arriving at this node are rejected. Route all writes to the primary.
          </div>
        )}
      </div>

      {/* Primary node picker — replica only */}
      {dbRole === 'replica' && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Primary Node</label>
          {otherDbNodes.length === 0 ? (
            <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
              No other database nodes in canvas.
            </div>
          ) : (
            <select
              value={config.primaryNodeId ?? ''}
              onChange={(e) => updateNodeConfig(nodeId, { primaryNodeId: e.target.value || undefined })}
              style={selectStyle}
            >
              <option value="">— not linked —</option>
              {otherDbNodes.map((n) => {
                const label = allConfigs[n.id]?.label ?? n.id;
                const role  = allConfigs[n.id]?.dbRole ?? 'standalone';
                return (
                  <option key={n.id} value={n.id}>
                    {label}{role === 'primary' ? ' (primary)' : ''}
                  </option>
                );
              })}
            </select>
          )}
          {config.primaryNodeId && (
            <div style={{ marginTop: '5px', fontSize: '9px', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
              Replication lag tracks primary write load. Stale reads add minor latency.
            </div>
          )}
        </div>
      )}

      {/* Engine */}
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

      {/* Shards */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Shards
          <span style={{ marginLeft: '8px', color: '#fb923c', fontWeight: 500, fontSize: '9px' }}>
            W: {writeCapacity.toLocaleString()} rps
          </span>
          {dbRole !== 'replica' && (
            <span style={{ marginLeft: '6px', color: '#38bdf8', fontWeight: 500, fontSize: '9px' }}>
              R: {readCapacity.toLocaleString()} rps
            </span>
          )}
          {dbRole === 'replica' && (
            <span style={{ marginLeft: '6px', color: '#38bdf8', fontWeight: 500, fontSize: '9px' }}>
              reads only
            </span>
          )}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range" min={1} max={8} value={shards}
            onChange={(e) => updateNodeConfig(nodeId, { shards: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
          />
          <input
            type="number" min={1} max={8} value={shards}
            onChange={(e) => updateNodeConfig(nodeId, { shards: Math.min(8, Math.max(1, Number(e.target.value))) })}
            style={numInputStyle}
          />
        </div>
      </div>

      {/* Read Replicas — standalone only (primary uses actual replica nodes) */}
      {dbRole === 'standalone' && (
        <div style={fieldStyle}>
          <label style={labelStyle}>
            Read Replicas (virtual)
            <span style={{ marginLeft: '8px', color: '#38bdf8', fontWeight: 500, fontSize: '9px' }}>
              +{(readReplicas * RPS_PER_SHARD).toLocaleString()} read rps
            </span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range" min={0} max={4} value={readReplicas}
              onChange={(e) => updateNodeConfig(nodeId, { readReplicas: Number(e.target.value) })}
              style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
            />
            <input
              type="number" min={0} max={4} value={readReplicas}
              onChange={(e) => updateNodeConfig(nodeId, { readReplicas: Math.min(4, Math.max(0, Number(e.target.value))) })}
              style={numInputStyle}
            />
          </div>
        </div>
      )}

      {/* Primary: explain no virtual replicas */}
      {dbRole === 'primary' && (
        <div style={{ marginBottom: '14px', padding: '7px 8px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '9px', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
          Read capacity is this node only. Add separate replica nodes and link them here to scale reads across zones/regions.
        </div>
      )}

      {/* Max Connections */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Max Connections</label>
        <input
          type="number" min={10} max={10000} value={config.maxConnections ?? 200}
          onChange={(e) => updateNodeConfig(nodeId, { maxConnections: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      {/* Storage */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Storage (GB)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range" min={10} max={10000} value={config.storageGb ?? 100}
            onChange={(e) => updateNodeConfig(nodeId, { storageGb: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
          />
          <input
            type="number" min={10} max={10000} value={config.storageGb ?? 100}
            onChange={(e) => updateNodeConfig(nodeId, { storageGb: Math.min(10000, Math.max(10, Number(e.target.value))) })}
            style={{ ...numInputStyle, width: '62px' }}
          />
        </div>
      </div>
    </div>
  );
}

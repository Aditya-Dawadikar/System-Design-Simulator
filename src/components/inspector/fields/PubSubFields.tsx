'use client';

import { useArchitectureStore } from '@/store/architectureStore';

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
const COLOR = '#fb923c';

interface PubSubFieldsProps { nodeId: string; }

export default function PubSubFields({ nodeId }: PubSubFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const partitions = config.partitions ?? 4;
  const capacity = partitions * 5000;

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Partitions
          <span style={{ marginLeft: '8px', color: COLOR, fontWeight: 500, fontSize: '9px' }}>
            {capacity.toLocaleString()} msg/s cap
          </span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={32}
            value={partitions}
            onChange={(e) => updateNodeConfig(nodeId, { partitions: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: COLOR, fontWeight: 600, minWidth: '16px' }}>
            {partitions}
          </span>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Message Retention (Hours)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={168}
            value={config.messageRetentionHours ?? 24}
            onChange={(e) => updateNodeConfig(nodeId, { messageRetentionHours: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: COLOR, fontWeight: 600, minWidth: '36px', textAlign: 'right' }}>
            {config.messageRetentionHours ?? 24}h
          </span>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Max Message Size (KB)</label>
        <input
          type="number"
          min={1}
          max={10240}
          value={config.maxMessageSizeKb ?? 10}
          onChange={(e) => updateNodeConfig(nodeId, { maxMessageSizeKb: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

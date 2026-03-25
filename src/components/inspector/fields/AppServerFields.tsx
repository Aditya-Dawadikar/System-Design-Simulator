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

const sliderValueStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px',
  color: 'var(--accent-green)',
  fontWeight: 600,
};

interface AppServerFieldsProps {
  nodeId: string;
}

export default function AppServerFields({ nodeId }: AppServerFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const instances = config.instances ?? 2;

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Instances</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <input
            type="range"
            min={1}
            max={16}
            value={instances}
            onChange={(e) => updateNodeConfig(nodeId, { instances: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent-green)', cursor: 'pointer' }}
          />
          <span style={sliderValueStyle}>{instances}</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '3px',
            padding: '6px',
            background: 'var(--bg-base)',
            borderRadius: '4px',
            border: '1px solid var(--border)',
          }}
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: i < instances ? 'var(--accent-green)' : 'var(--border)',
                transition: 'background 0.1s ease',
              }}
            />
          ))}
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>CPU Cores</label>
        <select
          value={config.cpuCores ?? 4}
          onChange={(e) => updateNodeConfig(nodeId, { cpuCores: Number(e.target.value) })}
          style={selectStyle}
        >
          {[2, 4, 8, 16].map((v) => (
            <option key={v} value={v}>{v} vCPU</option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>RAM</label>
        <select
          value={config.ramGb ?? 8}
          onChange={(e) => updateNodeConfig(nodeId, { ramGb: Number(e.target.value) })}
          style={selectStyle}
        >
          {[4, 8, 16, 32].map((v) => (
            <option key={v} value={v}>{v} GB</option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>RPS per Instance</label>
        <input
          type="number"
          min={1}
          value={config.rpsPerInstance ?? 500}
          onChange={(e) => updateNodeConfig(nodeId, { rpsPerInstance: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Base Latency</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={5}
            max={500}
            value={config.avgLatencyMs ?? 40}
            onChange={(e) => updateNodeConfig(nodeId, { avgLatencyMs: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent-green)', cursor: 'pointer' }}
          />
          <span style={sliderValueStyle}>{config.avgLatencyMs ?? 40}ms</span>
        </div>
      </div>
    </div>
  );
}

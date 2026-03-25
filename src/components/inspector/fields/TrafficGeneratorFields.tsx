'use client';

import { useArchitectureStore } from '@/store/architectureStore';
import type { TrafficPattern } from '@/types';

const selectStyle: React.CSSProperties = {
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
const COLOR = '#f43f5e';

const PATTERNS: { value: TrafficPattern; label: string; description: string }[] = [
  { value: 'steady', label: 'Steady', description: 'Constant baseline RPS' },
  { value: 'ramp', label: 'Ramp', description: 'Gradually increases over time' },
  { value: 'spike', label: 'Spike', description: '3.5× burst every 30s for 5s' },
  { value: 'wave', label: 'Wave', description: 'Sinusoidal oscillation' },
  { value: 'chaos', label: 'Chaos', description: 'Random unpredictable load' },
];

interface TrafficGeneratorFieldsProps { nodeId: string; }

export default function TrafficGeneratorFields({ nodeId }: TrafficGeneratorFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const rps = config.generatorRps ?? 1000;
  const pattern = config.generatorPattern ?? 'steady';

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Base RPS
          <span style={{ marginLeft: '8px', color: COLOR, fontWeight: 500, fontSize: '9px' }}>
            {rps.toLocaleString()} req/s
          </span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={100}
            max={100000}
            step={100}
            value={rps}
            onChange={(e) => updateNodeConfig(nodeId, { generatorRps: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: COLOR, fontWeight: 600, minWidth: '44px', textAlign: 'right' }}>
            {rps >= 1000 ? `${(rps / 1000).toFixed(1)}k` : rps}
          </span>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Traffic Pattern</label>
        <select
          value={pattern}
          onChange={(e) => updateNodeConfig(nodeId, { generatorPattern: e.target.value as TrafficPattern })}
          style={selectStyle}
        >
          {PATTERNS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Pattern description */}
      <div
        style={{
          background: `${COLOR}08`,
          border: `1px solid ${COLOR}25`,
          borderRadius: '4px',
          padding: '8px 10px',
          marginBottom: '14px',
        }}
      >
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
          {PATTERNS.find((p) => p.value === pattern)?.description}
        </div>
      </div>

      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: 'var(--text-dim)',
          lineHeight: 1.6,
          marginBottom: '14px',
        }}
      >
        Connect to any component to inject traffic. Use edge split % to route different fractions to different services.
      </div>
    </div>
  );
}

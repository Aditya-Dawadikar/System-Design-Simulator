'use client';

import { useArchitectureStore } from '@/store/architectureStore';

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

const sliderValueStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px',
  color: '#00ddff',
  fontWeight: 600,
};

interface SliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  color?: string;
  unit?: string;
}

function Slider({ min, max, value, onChange, color = '#00ddff', unit = '' }: SliderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: color, cursor: 'pointer' }}
      />
      <span style={sliderValueStyle}>
        {value}{unit}
      </span>
    </div>
  );
}

interface CdnFieldsProps {
  nodeId: string;
}

export default function CdnFields({ nodeId }: CdnFieldsProps) {
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
        <label style={labelStyle}>PoPs</label>
        <Slider
          min={1}
          max={4}
          value={config.pops ?? 2}
          onChange={(v) => updateNodeConfig(nodeId, { pops: v })}
          color="#00ddff"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Cacheable %</label>
        <Slider
          min={0}
          max={100}
          value={config.cacheablePct ?? 60}
          onChange={(v) => updateNodeConfig(nodeId, { cacheablePct: v })}
          color="#00ddff"
          unit="%"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Bandwidth (Gbps)</label>
        <input
          type="number"
          min={1}
          value={config.bandwidthGbps ?? 100}
          onChange={(e) => updateNodeConfig(nodeId, { bandwidthGbps: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

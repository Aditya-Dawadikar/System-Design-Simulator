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
  const readPct = config.readRatioPct ?? 50;
  const writePct = 100 - readPct;

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
          <input
            type="number"
            min={100}
            max={100000}
            step={100}
            value={rps}
            onChange={(e) => updateNodeConfig(nodeId, { generatorRps: Math.min(100000, Math.max(100, Number(e.target.value))) })}
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: COLOR, borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, padding: '3px 5px', width: '70px', textAlign: 'right', outline: 'none', flexShrink: 0 }}
          />
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

      {/* Read / Write distribution */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Read / Write Distribution
        </label>
        {/* Split bar labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#38bdf8', fontWeight: 600 }}>
            READ {readPct}% · {Math.round(rps * readPct / 100).toLocaleString()} rps
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#fb923c', fontWeight: 600 }}>
            {Math.round(rps * writePct / 100).toLocaleString()} rps · {writePct}% WRITE
          </span>
        </div>
        {/* Visual split bar */}
        <div style={{ height: '6px', borderRadius: '3px', overflow: 'hidden', display: 'flex', marginBottom: '8px' }}>
          <div style={{ width: `${readPct}%`, background: '#38bdf8', transition: 'width 0.15s' }} />
          <div style={{ flex: 1, background: '#fb923c' }} />
        </div>
        {/* Slider + number input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={readPct}
            onChange={(e) => updateNodeConfig(nodeId, { readRatioPct: Number(e.target.value) })}
            style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={readPct}
              onChange={(e) => updateNodeConfig(nodeId, { readRatioPct: Math.min(100, Math.max(0, Number(e.target.value))) })}
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: '#38bdf8', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, padding: '3px 5px', width: '46px', textAlign: 'right', outline: 'none' }}
            />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--text-dim)' }}>%R</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--text-dim)' }}>Write only</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--text-dim)' }}>Balanced</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--text-dim)' }}>Read only</span>
        </div>
      </div>

      {/* Bad traffic */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Bad Traffic — {config.badTrafficPct ?? 0}%
          {(config.badTrafficPct ?? 0) > 0 && (
            <span style={{ marginLeft: 8, color: '#ef4444', fontWeight: 500 }}>
              {Math.round((config.generatorRps ?? 1000) * (config.badTrafficPct ?? 0) / 100).toLocaleString()} rps malicious
            </span>
          )}
        </label>
        <input
          type="range"
          min={0}
          max={80}
          step={5}
          value={config.badTrafficPct ?? 0}
          onChange={(e) => updateNodeConfig(nodeId, { badTrafficPct: Number(e.target.value) })}
          style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--text-dim)', marginTop: 3 }}>
          <span>0% (clean)</span>
          <span>80% (attack)</span>
        </div>
        {(config.badTrafficPct ?? 0) > 0 && (
          <div
            style={{
              marginTop: 8,
              padding: '6px 10px',
              background: '#ef444410',
              border: '1px solid #ef444430',
              borderRadius: 4,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px',
              color: '#ef4444',
              lineHeight: 1.6,
            }}
          >
            {(config.badTrafficPct ?? 0)}% of traffic is malicious. A Firewall downstream will auto-detect and drop it based on its rule count and inspection mode.
          </div>
        )}
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

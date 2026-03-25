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
const COLOR = '#34d399';

interface CronJobFieldsProps { nodeId: string; }

export default function CronJobFields({ nodeId }: CronJobFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const intervalMinutes = config.intervalMinutes ?? 5;
  const tasksPerRun = config.tasksPerRun ?? 100;
  const emissionRate = tasksPerRun / (intervalMinutes * 60);

  return (
    <div>
      {/* Emission rate summary */}
      <div
        style={{
          background: `${COLOR}0f`,
          border: `1px solid ${COLOR}30`,
          borderRadius: '5px',
          padding: '8px 10px',
          marginBottom: '14px',
        }}
      >
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Emission Rate
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700, color: COLOR }}>
          {emissionRate < 1
            ? `${emissionRate.toFixed(3)} tasks/s`
            : `${emissionRate.toFixed(2)} tasks/s`}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--text-dim)', marginTop: '2px' }}>
          {tasksPerRun} tasks every {intervalMinutes}m
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Interval (minutes)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={1440}
            step={1}
            value={intervalMinutes}
            onChange={(e) => updateNodeConfig(nodeId, { intervalMinutes: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: COLOR, fontWeight: 600, minWidth: '44px', textAlign: 'right' }}>
            {intervalMinutes >= 60
              ? `${(intervalMinutes / 60).toFixed(1)}h`
              : `${intervalMinutes}m`}
          </span>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Tasks per Run</label>
        <input
          type="number"
          min={1}
          max={1000000}
          value={tasksPerRun}
          onChange={(e) => updateNodeConfig(nodeId, { tasksPerRun: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: 'var(--text-dim)',
          lineHeight: 1.6,
          paddingTop: '4px',
          borderTop: '1px solid var(--border)',
        }}
      >
        Connect this node to a Worker Pool or Pub/Sub. The cron job emits tasks at a fixed rate — no incoming connections needed.
      </div>
    </div>
  );
}

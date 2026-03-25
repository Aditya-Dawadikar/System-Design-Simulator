'use client';

import { useArchitectureStore } from '@/store/architectureStore';

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
const COLOR = '#facc15';

interface WorkerPoolFieldsProps { nodeId: string; }

export default function WorkerPoolFields({ nodeId }: WorkerPoolFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const workers = config.workerCount ?? 4;
  const threads = config.threadCount ?? 4;
  const durationMs = config.taskDurationMs ?? 500;
  const capacity = Math.round(workers * threads * (1000 / durationMs));

  return (
    <div>
      {/* Throughput summary */}
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
          Throughput Capacity
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700, color: COLOR }}>
          {capacity >= 1000 ? `${(capacity / 1000).toFixed(1)}k` : capacity} tasks/s
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--text-dim)', marginTop: '2px' }}>
          {workers} workers × {threads} threads ÷ {durationMs}ms
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Workers</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={64}
            value={workers}
            onChange={(e) => updateNodeConfig(nodeId, { workerCount: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: COLOR, fontWeight: 600, minWidth: '20px', textAlign: 'right' }}>
            {workers}
          </span>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Threads per Worker</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={64}
            value={threads}
            onChange={(e) => updateNodeConfig(nodeId, { threadCount: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: COLOR, fontWeight: 600, minWidth: '20px', textAlign: 'right' }}>
            {threads}
          </span>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Task Duration / Thread (ms)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={10}
            max={30000}
            step={10}
            value={durationMs}
            onChange={(e) => updateNodeConfig(nodeId, { taskDurationMs: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: COLOR, fontWeight: 600, minWidth: '52px', textAlign: 'right' }}>
            {durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`}
          </span>
        </div>
      </div>
    </div>
  );
}

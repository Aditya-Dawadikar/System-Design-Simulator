'use client';

import { useArchitectureStore } from '@/store/architectureStore';

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
const COLOR = '#a78bfa';

const MEMORY_OPTIONS = [128, 256, 512, 1024, 2048, 4096];

interface CloudFunctionFieldsProps { nodeId: string; }

export default function CloudFunctionFields({ nodeId }: CloudFunctionFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const concurrency = config.maxConcurrency ?? 100;
  const execMs = config.avgExecutionMs ?? 200;
  const memMb = config.functionMemoryMb ?? 256;
  const memFactor = Math.sqrt(memMb / 256);
  const capacity = Math.round(concurrency * (1000 / execMs) * memFactor);

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Workload Type</label>
        <select
          value={config.workloadType ?? 'io_bound'}
          onChange={(e) => updateNodeConfig(nodeId, { workloadType: e.target.value as 'cpu_bound' | 'io_bound' | 'memory_bound' })}
          style={selectStyle}
        >
          <option value="io_bound">IO Bound — waits on stores</option>
          <option value="cpu_bound">CPU Bound — compute heavy</option>
          <option value="memory_bound">Memory Bound — RAM limited</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Memory</label>
        <select
          value={memMb}
          onChange={(e) => updateNodeConfig(nodeId, { functionMemoryMb: Number(e.target.value) })}
          style={selectStyle}
        >
          {MEMORY_OPTIONS.map((m) => (
            <option key={m} value={m}>{m} MB</option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Max Concurrency
          <span style={{ marginLeft: '8px', color: COLOR, fontWeight: 500, fontSize: '9px' }}>
            {capacity.toLocaleString()} inv/s cap
          </span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={1000}
            value={concurrency}
            onChange={(e) => updateNodeConfig(nodeId, { maxConcurrency: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <input
            type="number"
            min={1}
            max={1000}
            value={concurrency}
            onChange={(e) => updateNodeConfig(nodeId, { maxConcurrency: Math.min(1000, Math.max(1, Number(e.target.value))) })}
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: COLOR, borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, padding: '3px 5px', width: '54px', textAlign: 'right', outline: 'none', flexShrink: 0 }}
          />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Avg Execution Time (ms)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={10}
            max={5000}
            step={10}
            value={execMs}
            onChange={(e) => updateNodeConfig(nodeId, { avgExecutionMs: Number(e.target.value) })}
            style={{ flex: 1, accentColor: COLOR, cursor: 'pointer' }}
          />
          <input
            type="number"
            min={10}
            max={5000}
            step={10}
            value={execMs}
            onChange={(e) => updateNodeConfig(nodeId, { avgExecutionMs: Math.min(5000, Math.max(10, Number(e.target.value))) })}
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: COLOR, borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, padding: '3px 5px', width: '54px', textAlign: 'right', outline: 'none', flexShrink: 0 }}
          />
        </div>
      </div>
    </div>
  );
}

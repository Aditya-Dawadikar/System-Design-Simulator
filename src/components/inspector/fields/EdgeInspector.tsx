'use client';

import { useArchitectureStore } from '@/store/architectureStore';
import { DEFAULT_EDGE_CONFIG } from '@/constants/components';
import type { EdgeConfig } from '@/types';

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

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--border)',
  margin: '16px 0',
};

const subFieldStyle: React.CSSProperties = {
  marginBottom: '12px',
  paddingLeft: '10px',
  borderLeft: '2px solid var(--border)',
};

type Protocol = EdgeConfig['protocol'];
const PROTOCOLS: Protocol[] = ['REST', 'gRPC', 'TCP', 'WebSocket'];

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}

function Toggle({ value, onChange, color = 'var(--accent-cyan)' }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '11px',
        color: value ? color : 'var(--text-dim)',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '28px',
          height: '15px',
          borderRadius: '8px',
          background: value ? color : 'var(--border)',
          position: 'relative',
          transition: 'background 0.15s ease',
          border: `1px solid ${value ? color : 'var(--text-dim)'}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: value ? '14px' : '2px',
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: value ? 'var(--bg-base)' : 'var(--text-dim)',
            transition: 'left 0.15s ease',
          }}
        />
      </span>
      {value ? 'Enabled' : 'Disabled'}
    </button>
  );
}

interface EdgeInspectorProps {
  edgeId: string;
}

export default function EdgeInspector({ edgeId }: EdgeInspectorProps) {
  const config = useArchitectureStore((s) => s.edgeConfigs[edgeId] ?? DEFAULT_EDGE_CONFIG);
  const updateEdgeConfig = useArchitectureStore((s) => s.updateEdgeConfig);

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Protocol</label>
        <select
          value={config.protocol}
          onChange={(e) => updateEdgeConfig(edgeId, { protocol: e.target.value as Protocol })}
          style={selectStyle}
        >
          {PROTOCOLS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Timeout (ms)</label>
        <input
          type="number"
          min={0}
          value={config.timeoutMs}
          onChange={(e) => updateEdgeConfig(edgeId, { timeoutMs: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Retry Count</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={0}
            max={5}
            value={config.retryCount}
            onChange={(e) => updateEdgeConfig(edgeId, { retryCount: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: 'var(--accent-cyan)',
              fontWeight: 600,
              minWidth: '12px',
            }}
          >
            {config.retryCount}
          </span>
        </div>
      </div>

      <div style={dividerStyle} />

      <div style={fieldStyle}>
        <label style={labelStyle}>Circuit Breaker</label>
        <Toggle
          value={config.circuitBreaker}
          onChange={(v) => updateEdgeConfig(edgeId, { circuitBreaker: v })}
          color="var(--accent-red)"
        />
      </div>

      {config.circuitBreaker && (
        <div
          style={{
            background: 'rgba(255,51,85,0.04)',
            border: '1px solid rgba(255,51,85,0.15)',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '14px',
          }}
        >
          <div style={subFieldStyle}>
            <label style={labelStyle}>Error Threshold</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min={0}
                max={100}
                value={config.circuitBreakerThreshold}
                onChange={(e) =>
                  updateEdgeConfig(edgeId, { circuitBreakerThreshold: Number(e.target.value) })
                }
                style={{ flex: 1, accentColor: 'var(--accent-red)', cursor: 'pointer' }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  color: 'var(--accent-red)',
                  fontWeight: 600,
                  minWidth: '32px',
                }}
              >
                {config.circuitBreakerThreshold}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div style={dividerStyle} />

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Bandwidth Cap (Mbps)
          <span
            style={{
              marginLeft: '6px',
              color: 'var(--text-dim)',
              fontSize: '9px',
              fontWeight: 400,
            }}
          >
            0 = unlimited
          </span>
        </label>
        <input
          type="number"
          min={0}
          value={config.bandwidthMbps}
          onChange={(e) => updateEdgeConfig(edgeId, { bandwidthMbps: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div style={dividerStyle} />

      {/* Traffic split */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Traffic Split</label>
        <Toggle
          value={config.splitPct !== undefined}
          onChange={(v) =>
            updateEdgeConfig(edgeId, { splitPct: v ? 100 : undefined })
          }
          color="var(--accent-yellow)"
        />
      </div>

      {config.splitPct !== undefined && (
        <div
          style={{
            background: 'rgba(234,179,8,0.04)',
            border: '1px solid rgba(234,179,8,0.18)',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '14px',
          }}
        >
          <div style={subFieldStyle}>
            <label style={labelStyle}>
              Split %
              <span style={{ marginLeft: '8px', color: 'var(--accent-yellow)', fontWeight: 500, fontSize: '9px' }}>
                {config.splitPct}% of upstream output
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min={0}
                max={100}
                value={config.splitPct}
                onChange={(e) =>
                  updateEdgeConfig(edgeId, { splitPct: Number(e.target.value) })
                }
                style={{ flex: 1, accentColor: 'var(--accent-yellow)', cursor: 'pointer' }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  color: 'var(--accent-yellow)',
                  fontWeight: 600,
                  minWidth: '36px',
                }}
              >
                {config.splitPct}%
              </span>
            </div>
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px',
              color: 'var(--text-dim)',
              lineHeight: 1.5,
              paddingLeft: '10px',
            }}
          >
            Edges without an explicit split % share the remaining traffic equally.
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useArchitectureStore } from '@/store/architectureStore';
import type { RateLimitAlgorithm } from '@/types';

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

const hintStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '9px',
  color: 'var(--text-dim)',
  marginTop: '5px',
  lineHeight: 1.5,
};

const ALGORITHMS: { value: RateLimitAlgorithm; label: string; hint: string }[] = [
  {
    value: 'token_bucket',
    label: 'Token Bucket',
    hint: 'Allows bursting up to burst capacity. Tokens refill at the base rate.',
  },
  {
    value: 'leaky_bucket',
    label: 'Leaky Bucket',
    hint: 'Queues excess traffic and drains at a fixed rate. Strict smoothing, no burst.',
  },
  {
    value: 'fixed_window',
    label: 'Fixed Window',
    hint: 'Counts requests per fixed time window. Can allow 2× at window boundaries.',
  },
  {
    value: 'sliding_window',
    label: 'Sliding Window',
    hint: 'Weighted blend of current and previous window. Smoother than fixed window.',
  },
  {
    value: 'sliding_log',
    label: 'Sliding Log',
    hint: 'Tracks every request timestamp. Most accurate, strictest enforcement.',
  },
];

const ALGO_HINTS: Record<RateLimitAlgorithm, string> = Object.fromEntries(
  ALGORITHMS.map((a) => [a.value, a.hint])
) as Record<RateLimitAlgorithm, string>;

const BURST_VISIBLE: Set<RateLimitAlgorithm> = new Set(['token_bucket', 'leaky_bucket']);
const WINDOW_VISIBLE: Set<RateLimitAlgorithm> = new Set(['fixed_window', 'sliding_window', 'sliding_log']);

interface RateLimiterFieldsProps {
  nodeId: string;
}

export default function RateLimiterFields({ nodeId }: RateLimiterFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const algorithm = config.rateLimitAlgorithm ?? 'token_bucket';

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Algorithm</label>
        <select
          value={algorithm}
          onChange={(e) =>
            updateNodeConfig(nodeId, { rateLimitAlgorithm: e.target.value as RateLimitAlgorithm })
          }
          style={selectStyle}
        >
          {ALGORITHMS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <div style={hintStyle}>{ALGO_HINTS[algorithm]}</div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Requests / Second (limit)</label>
        <input
          type="number"
          min={1}
          max={1000000}
          value={config.requestsPerSecond ?? 1000}
          onChange={(e) =>
            updateNodeConfig(nodeId, { requestsPerSecond: Number(e.target.value) })
          }
          style={inputStyle}
        />
      </div>

      {BURST_VISIBLE.has(algorithm) && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Burst Capacity</label>
          <input
            type="number"
            min={0}
            max={1000000}
            value={config.burstCapacity ?? 200}
            onChange={(e) =>
              updateNodeConfig(nodeId, { burstCapacity: Number(e.target.value) })
            }
            style={inputStyle}
          />
          <div style={hintStyle}>
            Extra requests allowed above the limit during a burst window.
          </div>
        </div>
      )}

      {BURST_VISIBLE.has(algorithm) && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Max Queue Size</label>
          <input
            type="number"
            min={0}
            max={1000000}
            value={config.maxQueueSize ?? 500}
            onChange={(e) =>
              updateNodeConfig(nodeId, { maxQueueSize: Number(e.target.value) })
            }
            style={inputStyle}
          />
          <div style={hintStyle}>
            Requests held in queue when over limit. Drops occur when full.
          </div>
        </div>
      )}

      {WINDOW_VISIBLE.has(algorithm) && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Window Size (ms)</label>
          <input
            type="number"
            min={100}
            max={60000}
            step={100}
            value={config.windowSizeMs ?? 1000}
            onChange={(e) =>
              updateNodeConfig(nodeId, { windowSizeMs: Number(e.target.value) })
            }
            style={inputStyle}
          />
        </div>
      )}
    </div>
  );
}

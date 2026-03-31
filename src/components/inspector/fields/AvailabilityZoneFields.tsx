'use client';

import { useArchitectureStore } from '@/store/architectureStore';

const ACCENT = '#67e8f9';
const FAILED_COLOR = '#f87171';

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

const fieldStyle: React.CSSProperties = { marginBottom: '14px' };

interface Props { nodeId: string }

export default function AvailabilityZoneFields({ nodeId }: Props) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const update = useArchitectureStore((s) => s.updateNodeConfig);
  const nodes = useArchitectureStore((s) => s.nodes);
  const nodeConfigs = useArchitectureStore((s) => s.nodeConfigs);

  const regions = nodes.filter((n) => n.type === 'region');
  const failed = config.zoneFailed ?? false;

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Zone Name</label>
        <input
          type="text"
          value={config.zoneName ?? 'us-east-1a'}
          onChange={(e) => update(nodeId, { zoneName: e.target.value })}
          placeholder="e.g. us-east-1a"
          style={inputStyle}
          spellCheck={false}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Parent Region</label>
        <select
          value={config.regionId ?? ''}
          onChange={(e) => update(nodeId, { regionId: e.target.value || undefined })}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">— No Region —</option>
          {regions.map((r) => {
            const rCfg = nodeConfigs[r.id] ?? {};
            const rName = rCfg.regionName ?? rCfg.label ?? r.id;
            return (
              <option key={r.id} value={r.id}>
                {rName}
              </option>
            );
          })}
        </select>
      </div>

      {/* Zone Failed toggle */}
      <div
        style={{
          marginBottom: '14px',
          padding: '10px 12px',
          background: failed ? `${FAILED_COLOR}10` : 'var(--bg-base)',
          border: `1px solid ${failed ? FAILED_COLOR : 'var(--border)'}`,
          borderRadius: '6px',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={failed}
            onChange={(e) => update(nodeId, { zoneFailed: e.target.checked })}
            style={{ width: 14, height: 14, accentColor: FAILED_COLOR, cursor: 'pointer' }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              color: failed ? FAILED_COLOR : 'var(--text)',
              letterSpacing: '0.02em',
            }}
          >
            {failed ? 'Zone FAILED' : 'Simulate Zone Failure'}
          </span>
        </label>
        {failed && (
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px',
              color: FAILED_COLOR,
              margin: '6px 0 0 24px',
              lineHeight: 1.6,
              opacity: 0.8,
            }}
          >
            All resources assigned to this zone are forced to errorRate=100% and rpsOut=0.
          </p>
        )}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Container Width (px)</label>
        <input
          type="number"
          min={200}
          max={2000}
          step={20}
          value={config.containerWidth ?? 380}
          onChange={(e) => update(nodeId, { containerWidth: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Container Height (px)</label>
        <input
          type="number"
          min={200}
          max={2000}
          step={20}
          value={config.containerHeight ?? 440}
          onChange={(e) => update(nodeId, { containerHeight: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div
        style={{
          marginTop: '4px',
          padding: '8px 10px',
          background: `${ACCENT}0a`,
          border: `1px solid ${ACCENT}20`,
          borderRadius: '4px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: 'var(--text-dim)',
          lineHeight: 1.7,
        }}
      >
        Cross-AZ edges (same region) incur ~2 ms additional latency.
        Assign resources to this zone via their Zone dropdown in the inspector.
      </div>
    </div>
  );
}

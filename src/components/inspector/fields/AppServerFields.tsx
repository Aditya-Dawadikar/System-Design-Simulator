'use client';

import { useArchitectureStore } from '@/store/architectureStore';
import type { AutoscalingStrategy, TargetTrackingMetric, ScheduledScalingAction } from '@/types';

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

function numInputStyle(color: string): React.CSSProperties {
  return {
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    color,
    borderRadius: '4px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 5px',
    width: '54px',
    textAlign: 'right' as const,
    outline: 'none',
    flexShrink: 0,
  };
}

/** Pill toggle switch */
function Toggle({
  enabled,
  onChange,
  accentColor = 'var(--accent-green)',
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  accentColor?: string;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        position: 'relative',
        width: '32px',
        height: '16px',
        borderRadius: '8px',
        border: 'none',
        background: enabled ? accentColor : 'var(--border)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.15s',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: enabled ? '18px' : '2px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'var(--bg-base)',
          transition: 'left 0.15s',
        }}
      />
    </button>
  );
}

/** Section header row with label + toggle */
function SectionToggleHeader({
  label,
  enabled,
  onChange,
  accentColor = 'var(--accent-green)',
}: {
  label: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: enabled ? '12px' : '0',
      }}
    >
      <label
        style={{
          ...labelStyle,
          color: enabled ? accentColor : 'var(--text-dim)',
          marginBottom: 0,
          fontSize: '10px',
          cursor: 'pointer',
        }}
        onClick={() => onChange(!enabled)}
      >
        {label}
      </label>
      <Toggle enabled={enabled} onChange={onChange} accentColor={accentColor} />
    </div>
  );
}

interface AppServerFieldsProps {
  nodeId: string;
}

export default function AppServerFields({ nodeId }: AppServerFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const instances           = config.instances           ?? 2;
  const autoscalingEnabled  = config.autoscalingEnabled  ?? false;
  const autoscalingStrategy = config.autoscalingStrategy ?? 'threshold';
  const warmPoolEnabled     = config.warmPoolEnabled     ?? false;

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
          <input
            type="number"
            min={1}
            max={16}
            value={instances}
            onChange={(e) => updateNodeConfig(nodeId, { instances: Math.min(16, Math.max(1, Number(e.target.value))) })}
            style={numInputStyle('var(--accent-green)')}
          />
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
        <label style={labelStyle}>Workload Type</label>
        <select
          value={config.workloadType ?? 'io_bound'}
          onChange={(e) => updateNodeConfig(nodeId, { workloadType: e.target.value as 'cpu_bound' | 'io_bound' | 'memory_bound' })}
          style={selectStyle}
        >
          <option value="io_bound">IO Bound — threads wait on stores</option>
          <option value="cpu_bound">CPU Bound — compute heavy</option>
          <option value="memory_bound">Memory Bound — RAM bandwidth limited</option>
        </select>
        <div style={{ marginTop: '5px', fontSize: '9px', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", lineHeight: '1.5' }}>
          {(config.workloadType ?? 'io_bound') === 'io_bound'    && 'High peak RPS, degrades sharply when stores are slow'}
          {(config.workloadType ?? 'io_bound') === 'cpu_bound'   && 'Compute ceiling; store latency has minimal effect'}
          {(config.workloadType ?? 'io_bound') === 'memory_bound'&& 'RAM bandwidth ceiling; moderate store sensitivity'}
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>RPS per Instance (override)</label>
        <input
          type="number"
          min={1}
          placeholder={String(
            (config.workloadType ?? 'io_bound') === 'cpu_bound'    ? (config.cpuCores ?? 4) * 350 :
            (config.workloadType ?? 'io_bound') === 'memory_bound' ? Math.min((config.cpuCores ?? 4) * 300, (config.ramGb ?? 8) * 100) :
            (config.cpuCores ?? 4) * 500
          )}
          value={config.rpsPerInstance ?? ''}
          onChange={(e) => updateNodeConfig(nodeId, { rpsPerInstance: e.target.value === '' ? undefined : Number(e.target.value) })}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Base Latency (ms)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={5}
            max={500}
            value={config.avgLatencyMs ?? 40}
            onChange={(e) => updateNodeConfig(nodeId, { avgLatencyMs: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent-green)', cursor: 'pointer' }}
          />
          <input
            type="number"
            min={5}
            max={500}
            value={config.avgLatencyMs ?? 40}
            onChange={(e) => updateNodeConfig(nodeId, { avgLatencyMs: Math.min(500, Math.max(5, Number(e.target.value))) })}
            style={numInputStyle('var(--accent-green)')}
          />
        </div>
      </div>

      {/* ── Autoscaling ─────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '4px', marginBottom: '14px' }}>
        <SectionToggleHeader
          label="Autoscaling"
          enabled={autoscalingEnabled}
          onChange={(v) => updateNodeConfig(nodeId, { autoscalingEnabled: v })}
        />

        {autoscalingEnabled && (
          <>
            {/* Strategy selector */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Strategy</label>
              <select
                value={autoscalingStrategy}
                onChange={(e) => updateNodeConfig(nodeId, { autoscalingStrategy: e.target.value as AutoscalingStrategy })}
                style={selectStyle}
              >
                <option value="threshold">Threshold — scale on load % crossing</option>
                <option value="target_tracking">Target Tracking — maintain a target metric</option>
                <option value="scheduled">Scheduled — capacity changes at set ticks</option>
                <option value="predictive">Predictive — pre-provision ahead of load</option>
              </select>
            </div>

            {/* Min / Max instances — shared by all strategies */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Instance Range (min → max)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min={1}
                  max={config.maxInstances ?? 32}
                  value={config.minInstances ?? 1}
                  onChange={(e) => updateNodeConfig(nodeId, { minInstances: Math.max(1, Number(e.target.value)) })}
                  style={numInputStyle('var(--accent-green)')}
                />
                <span style={{ color: 'var(--text-dim)', fontSize: '11px', flexShrink: 0 }}>→</span>
                <input
                  type="number"
                  min={config.minInstances ?? 1}
                  max={64}
                  value={config.maxInstances ?? (instances * 4)}
                  onChange={(e) => updateNodeConfig(nodeId, { maxInstances: Math.max(config.minInstances ?? 1, Number(e.target.value)) })}
                  style={numInputStyle('var(--accent-green)')}
                />
              </div>
            </div>

            {/* ── Threshold controls ── */}
            {autoscalingStrategy === 'threshold' && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Scale-Up Load Threshold (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="range" min={50} max={95} value={config.scaleUpCpuPct ?? 75}
                      onChange={(e) => updateNodeConfig(nodeId, { scaleUpCpuPct: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--accent-green)', cursor: 'pointer' }} />
                    <input type="number" min={50} max={95} value={config.scaleUpCpuPct ?? 75}
                      onChange={(e) => updateNodeConfig(nodeId, { scaleUpCpuPct: Number(e.target.value) })}
                      style={numInputStyle('var(--accent-green)')} />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Scale-Down Load Threshold (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="range" min={5} max={50} value={config.scaleDownCpuPct ?? 25}
                      onChange={(e) => updateNodeConfig(nodeId, { scaleDownCpuPct: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }} />
                    <input type="number" min={5} max={50} value={config.scaleDownCpuPct ?? 25}
                      onChange={(e) => updateNodeConfig(nodeId, { scaleDownCpuPct: Number(e.target.value) })}
                      style={numInputStyle('var(--accent-cyan)')} />
                  </div>
                </div>
              </>
            )}

            {/* ── Target Tracking controls ── */}
            {autoscalingStrategy === 'target_tracking' && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Target Metric</label>
                  <select
                    value={config.targetMetric ?? 'load'}
                    onChange={(e) => updateNodeConfig(nodeId, { targetMetric: e.target.value as TargetTrackingMetric })}
                    style={selectStyle}
                  >
                    <option value="load">Load % — fraction of instance capacity</option>
                    <option value="cpu">CPU % — displayed CPU utilization</option>
                    <option value="rps_per_instance">RPS per Instance — absolute RPS target</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Target Value&nbsp;
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                      {(config.targetMetric ?? 'load') === 'rps_per_instance' ? '(RPS)' : '(%)'}
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {(config.targetMetric ?? 'load') !== 'rps_per_instance' ? (
                      <>
                        <input type="range" min={20} max={90} value={config.targetValue ?? 70}
                          onChange={(e) => updateNodeConfig(nodeId, { targetValue: Number(e.target.value) })}
                          style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                        <input type="number" min={20} max={90} value={config.targetValue ?? 70}
                          onChange={(e) => updateNodeConfig(nodeId, { targetValue: Number(e.target.value) })}
                          style={numInputStyle('var(--accent-purple)')} />
                      </>
                    ) : (
                      <input type="number" min={1} placeholder="500"
                        value={config.targetValue ?? ''}
                        onChange={(e) => updateNodeConfig(nodeId, { targetValue: e.target.value === '' ? undefined : Number(e.target.value) })}
                        style={inputStyle} />
                    )}
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Scale-Out Cooldown&nbsp;
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                      ({((config.ttScaleOutCooldownTicks ?? 4) * 0.5).toFixed(1)} s)
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="range" min={1} max={20} value={config.ttScaleOutCooldownTicks ?? 4}
                      onChange={(e) => updateNodeConfig(nodeId, { ttScaleOutCooldownTicks: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--accent-green)', cursor: 'pointer' }} />
                    <input type="number" min={1} max={20} value={config.ttScaleOutCooldownTicks ?? 4}
                      onChange={(e) => updateNodeConfig(nodeId, { ttScaleOutCooldownTicks: Number(e.target.value) })}
                      style={numInputStyle('var(--accent-green)')} />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Scale-In Cooldown&nbsp;
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                      ({((config.ttScaleInCooldownTicks ?? 24) * 0.5).toFixed(1)} s)
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="range" min={4} max={60} value={config.ttScaleInCooldownTicks ?? 24}
                      onChange={(e) => updateNodeConfig(nodeId, { ttScaleInCooldownTicks: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }} />
                    <input type="number" min={4} max={60} value={config.ttScaleInCooldownTicks ?? 24}
                      onChange={(e) => updateNodeConfig(nodeId, { ttScaleInCooldownTicks: Number(e.target.value) })}
                      style={numInputStyle('var(--accent-cyan)')} />
                  </div>
                </div>
              </>
            )}

            {/* ── Scheduled controls ── */}
            {autoscalingStrategy === 'scheduled' && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Scheduled Actions</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(config.scheduledActions ?? []).map((action) => (
                      <div key={action.id} style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
                        gap: '4px', alignItems: 'center',
                        padding: '6px', background: 'var(--bg-base)',
                        border: '1px solid var(--border)', borderRadius: '4px',
                      }}>
                        <div>
                          <div style={{ ...labelStyle, marginBottom: '3px' }}>at tick</div>
                          <input type="number" min={0} value={action.atTick}
                            onChange={(e) => {
                              const updated = (config.scheduledActions ?? []).map((a) =>
                                a.id === action.id ? { ...a, atTick: Number(e.target.value) } : a
                              );
                              updateNodeConfig(nodeId, { scheduledActions: updated });
                            }}
                            style={{ ...inputStyle, padding: '3px 5px' }} />
                        </div>
                        <div>
                          <div style={{ ...labelStyle, marginBottom: '3px' }}>repeat every</div>
                          <input type="number" min={0} placeholder="—"
                            value={action.intervalTicks ?? ''}
                            onChange={(e) => {
                              const updated = (config.scheduledActions ?? []).map((a) =>
                                a.id === action.id ? { ...a, intervalTicks: e.target.value === '' ? undefined : Number(e.target.value) } : a
                              );
                              updateNodeConfig(nodeId, { scheduledActions: updated });
                            }}
                            style={{ ...inputStyle, padding: '3px 5px' }} />
                        </div>
                        <div>
                          <div style={{ ...labelStyle, marginBottom: '3px' }}>desired inst</div>
                          <input type="number" min={1} placeholder="—"
                            value={action.desiredInstances ?? ''}
                            onChange={(e) => {
                              const updated = (config.scheduledActions ?? []).map((a) =>
                                a.id === action.id ? { ...a, desiredInstances: e.target.value === '' ? undefined : Number(e.target.value) } : a
                              );
                              updateNodeConfig(nodeId, { scheduledActions: updated });
                            }}
                            style={{ ...inputStyle, padding: '3px 5px' }} />
                        </div>
                        <button
                          onClick={() => {
                            const updated = (config.scheduledActions ?? []).filter((a) => a.id !== action.id);
                            updateNodeConfig(nodeId, { scheduledActions: updated });
                          }}
                          style={{
                            background: 'none', border: '1px solid var(--border)',
                            color: 'var(--accent-red)', cursor: 'pointer',
                            borderRadius: '4px', padding: '2px 6px', fontSize: '11px',
                            alignSelf: 'flex-end', marginBottom: '1px',
                          }}
                        >×</button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newAction: ScheduledScalingAction = {
                          id: `sa-${Date.now()}`,
                          atTick: 0,
                          desiredInstances: config.minInstances ?? 1,
                        };
                        updateNodeConfig(nodeId, { scheduledActions: [...(config.scheduledActions ?? []), newAction] });
                      }}
                      style={{
                        background: 'none', border: '1px dashed var(--border)',
                        color: 'var(--text-dim)', cursor: 'pointer',
                        borderRadius: '4px', padding: '5px', fontSize: '10px',
                        fontFamily: "'JetBrains Mono', monospace",
                        width: '100%',
                      }}
                    >+ add action</button>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '9px', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                    Scheduled actions bypass cooldowns. Threshold fallback remains active between actions.
                  </div>
                </div>
                {/* Threshold fallback controls */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>Fallback Scale-Up Threshold (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="range" min={50} max={95} value={config.scaleUpCpuPct ?? 75}
                      onChange={(e) => updateNodeConfig(nodeId, { scaleUpCpuPct: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--accent-green)', cursor: 'pointer' }} />
                    <input type="number" min={50} max={95} value={config.scaleUpCpuPct ?? 75}
                      onChange={(e) => updateNodeConfig(nodeId, { scaleUpCpuPct: Number(e.target.value) })}
                      style={numInputStyle('var(--accent-green)')} />
                  </div>
                </div>
              </>
            )}

            {/* ── Predictive controls ── */}
            {autoscalingStrategy === 'predictive' && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Lookback Window&nbsp;
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                      ({((config.predictiveLookbackTicks ?? 20) * 0.5).toFixed(0)} s history)
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="range" min={4} max={40} value={config.predictiveLookbackTicks ?? 20}
                      onChange={(e) => updateNodeConfig(nodeId, { predictiveLookbackTicks: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    <input type="number" min={4} max={40} value={config.predictiveLookbackTicks ?? 20}
                      onChange={(e) => updateNodeConfig(nodeId, { predictiveLookbackTicks: Number(e.target.value) })}
                      style={numInputStyle('var(--accent-purple)')} />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Lookahead Horizon&nbsp;
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                      ({((config.predictiveLookaheadTicks ?? 10) * 0.5).toFixed(0)} s ahead — should be ≥ cold provision time)
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="range" min={2} max={30} value={config.predictiveLookaheadTicks ?? 10}
                      onChange={(e) => updateNodeConfig(nodeId, { predictiveLookaheadTicks: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    <input type="number" min={2} max={30} value={config.predictiveLookaheadTicks ?? 10}
                      onChange={(e) => updateNodeConfig(nodeId, { predictiveLookaheadTicks: Number(e.target.value) })}
                      style={numInputStyle('var(--accent-purple)')} />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Capacity Buffer&nbsp;
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                      ({config.predictiveScalingBuffer ?? 20}% above predicted need)
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="range" min={0} max={80} value={config.predictiveScalingBuffer ?? 20}
                      onChange={(e) => updateNodeConfig(nodeId, { predictiveScalingBuffer: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    <input type="number" min={0} max={80} value={config.predictiveScalingBuffer ?? 20}
                      onChange={(e) => updateNodeConfig(nodeId, { predictiveScalingBuffer: Number(e.target.value) })}
                      style={numInputStyle('var(--accent-purple)')} />
                  </div>
                </div>
                {/* Scale-in is always reactive — expose threshold */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>Scale-Down Threshold (%) <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>— reactive</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="range" min={5} max={50} value={config.scaleDownCpuPct ?? 25}
                      onChange={(e) => updateNodeConfig(nodeId, { scaleDownCpuPct: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }} />
                    <input type="number" min={5} max={50} value={config.scaleDownCpuPct ?? 25}
                      onChange={(e) => updateNodeConfig(nodeId, { scaleDownCpuPct: Number(e.target.value) })}
                      style={numInputStyle('var(--accent-cyan)')} />
                  </div>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5, marginBottom: '10px' }}>
                  Scale-out uses linear trend extrapolation. Scale-in is always reactive. Needs {Math.ceil((config.predictiveLookbackTicks ?? 20) / 2)} ticks of history to activate.
                </div>
              </>
            )}

            {/* Cold provision time — shared by threshold / scheduled / predictive */}
            {autoscalingStrategy !== 'target_tracking' && (
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Cold Provision Time&nbsp;
                  <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                    ({((config.coldProvisionTicks ?? 6) * 0.5).toFixed(1)} s)
                  </span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="range" min={1} max={20} value={config.coldProvisionTicks ?? 6}
                    onChange={(e) => updateNodeConfig(nodeId, { coldProvisionTicks: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: 'var(--accent-green)', cursor: 'pointer' }} />
                  <input type="number" min={1} max={20} value={config.coldProvisionTicks ?? 6}
                    onChange={(e) => updateNodeConfig(nodeId, { coldProvisionTicks: Number(e.target.value) })}
                    style={numInputStyle('var(--accent-green)')} />
                </div>
              </div>
            )}

            {/* Scale-down drain time */}
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Scale-Down Drain Time&nbsp;
                <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                  ({((config.scaleDownDrainTicks ?? 4) * 0.5).toFixed(1)} s)
                </span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="range" min={1} max={20} value={config.scaleDownDrainTicks ?? 4}
                  onChange={(e) => updateNodeConfig(nodeId, { scaleDownDrainTicks: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }} />
                <input type="number" min={1} max={20} value={config.scaleDownDrainTicks ?? 4}
                  onChange={(e) => updateNodeConfig(nodeId, { scaleDownDrainTicks: Number(e.target.value) })}
                  style={numInputStyle('var(--accent-cyan)')} />
              </div>
            </div>

            {/* ── Warm Pool ──────────────────────────────────────── */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
              <SectionToggleHeader
                label="Warm Replicas"
                enabled={warmPoolEnabled}
                onChange={(v) => updateNodeConfig(nodeId, { warmPoolEnabled: v })}
                accentColor="var(--accent-orange)"
              />

              {warmPoolEnabled && (
                <>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>
                      Warm Pool Size&nbsp;
                      <span style={{ color: 'var(--accent-orange)', fontWeight: 400 }}>
                        ({config.warmPoolSize ?? 0} pre-warmed)
                      </span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="range"
                        min={0}
                        max={8}
                        value={config.warmPoolSize ?? 0}
                        onChange={(e) => updateNodeConfig(nodeId, { warmPoolSize: Number(e.target.value) })}
                        style={{ flex: 1, accentColor: 'var(--accent-orange)', cursor: 'pointer' }}
                      />
                      <input
                        type="number"
                        min={0}
                        max={8}
                        value={config.warmPoolSize ?? 0}
                        onChange={(e) => updateNodeConfig(nodeId, { warmPoolSize: Number(e.target.value) })}
                        style={numInputStyle('var(--accent-orange)')}
                      />
                    </div>
                    {/* Instance grid */}
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: '3px', padding: '6px',
                      background: 'var(--bg-base)', borderRadius: '4px',
                      border: '1px solid var(--border)', marginTop: '6px',
                    }}>
                      {Array.from({ length: Math.min(32, config.maxInstances ?? instances * 4) }).map((_, i) => {
                        const minI = config.minInstances ?? 1;
                        const warm = config.warmPoolSize ?? 0;
                        const isBaseline = i < minI;
                        const isWarm     = !isBaseline && i < minI + warm;
                        return (
                          <span key={i} style={{
                            display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px',
                            background: isBaseline ? 'var(--accent-green)'
                                      : isWarm     ? 'var(--accent-orange)'
                                      : 'transparent',
                            border: isBaseline || isWarm ? 'none' : '1px solid var(--border)',
                            transition: 'background 0.1s ease',
                          }} />
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '5px' }}>
                      {[
                        { color: 'var(--accent-green)',  label: 'baseline' },
                        { color: 'var(--accent-orange)', label: 'warm pool' },
                        { color: 'var(--text-dim)',       label: 'cold headroom', border: true },
                      ].map(({ color, label, border }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{
                            display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px',
                            background: border ? 'transparent' : color,
                            border: border ? `1px solid ${color}` : 'none',
                          }} />
                          <span style={{ color: 'var(--text-dim)', fontSize: '9px' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

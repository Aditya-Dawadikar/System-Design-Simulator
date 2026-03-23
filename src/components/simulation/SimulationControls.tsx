'use client';

import { useSimulationStore } from '@/store/simulationStore';
import type { TrafficPattern } from '@/types';

const PATTERNS: { value: TrafficPattern; label: string }[] = [
  { value: 'steady', label: 'STEADY' },
  { value: 'ramp',   label: 'RAMP'   },
  { value: 'spike',  label: 'SPIKE'  },
  { value: 'wave',   label: 'WAVE'   },
  { value: 'chaos',  label: 'CHAOS'  },
];

const MIN_RPS = 100;
const MAX_RPS = 50000;

/**
 * Map a linear slider value [0,1] to a logarithmic RPS value.
 * This gives fine control at low RPS and coarse at high RPS.
 */
function sliderToRps(t: number): number {
  const logMin = Math.log10(MIN_RPS);
  const logMax = Math.log10(MAX_RPS);
  return Math.round(Math.pow(10, logMin + t * (logMax - logMin)));
}

function rpsToSlider(rps: number): number {
  const logMin = Math.log10(MIN_RPS);
  const logMax = Math.log10(MAX_RPS);
  return (Math.log10(Math.max(rps, MIN_RPS)) - logMin) / (logMax - logMin);
}

function formatRps(rps: number): string {
  return rps.toLocaleString();
}

export default function SimulationControls() {
  const running    = useSimulationStore((s) => s.running);
  const peakRps    = useSimulationStore((s) => s.peakRps);
  const pattern    = useSimulationStore((s) => s.pattern);
  const start      = useSimulationStore((s) => s.start);
  const stop       = useSimulationStore((s) => s.stop);
  const reset      = useSimulationStore((s) => s.reset);
  const setPeakRps = useSimulationStore((s) => s.setPeakRps);
  const setPattern = useSimulationStore((s) => s.setPattern);

  const sliderValue = rpsToSlider(peakRps);

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const t = parseFloat(e.target.value);
    setPeakRps(sliderToRps(t));
  }

  function handlePattern(e: React.ChangeEvent<HTMLSelectElement>) {
    setPattern(e.target.value as TrafficPattern);
  }

  function handleToggle() {
    if (running) stop();
    else start();
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        background: '#0b1016',
        borderBottom: '1px solid #172030',
        flexWrap: 'nowrap',
        minHeight: '44px',
        fontFamily: "'JetBrains Mono', monospace",
        userSelect: 'none',
      }}
    >
      {/* Run / Stop button */}
      <button
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 14px',
          border: 'none',
          borderRadius: '4px',
          background: running ? '#ff3355' : '#00ff88',
          color: '#05070b',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          fontWeight: '700',
          cursor: 'pointer',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
      >
        <span style={{ fontSize: '12px', lineHeight: 1 }}>
          {running ? '⏹' : '▶'}
        </span>
        {running ? 'STOP' : 'RUN'}
      </button>

      {/* Pattern selector */}
      <select
        value={pattern}
        onChange={handlePattern}
        style={{
          background: '#05070b',
          color: '#b0c8e0',
          border: '1px solid #172030',
          borderRadius: '4px',
          padding: '4px 8px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          cursor: 'pointer',
          flexShrink: 0,
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          paddingRight: '24px',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2338505f'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 7px center',
        }}
      >
        {PATTERNS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '20px',
          background: '#172030',
          flexShrink: 0,
        }}
      />

      {/* Peak RPS label */}
      <span
        style={{
          color: '#a1b3bf',
          fontSize: '10px',
          letterSpacing: '0.08em',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        PEAK RPS:
      </span>

      {/* Logarithmic RPS slider */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={sliderValue}
        onChange={handleSlider}
        style={{
          flex: '1 1 120px',
          minWidth: '80px',
          maxWidth: '240px',
          accentColor: '#00ddff',
          cursor: 'pointer',
        }}
      />

      {/* RPS value display */}
      <span
        style={{
          color: '#00ddff',
          fontSize: '12px',
          fontWeight: '600',
          minWidth: '60px',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {formatRps(peakRps)}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Reset button */}
      <button
        onClick={reset}
        title="Reset simulation"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5px 10px',
          border: '1px solid #172030',
          borderRadius: '4px',
          background: 'transparent',
          color: '#a1b3bf',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '14px',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#b0c8e0';
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#a1b3bf';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#a1b3bf';
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#172030';
        }}
      >
        ↺
      </button>
    </div>
  );
}

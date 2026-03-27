'use client';

import { useSimulationStore } from '@/store/simulationStore';

export default function SimulationControls() {
  const running = useSimulationStore((s) => s.running);
  const start   = useSimulationStore((s) => s.start);
  const stop    = useSimulationStore((s) => s.stop);
  const reset   = useSimulationStore((s) => s.reset);

  function handleToggle() {
    if (running) stop();
    else start();
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
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
          background: running ? 'var(--accent-red)' : 'var(--accent-green)',
          color: 'var(--bg-base)',
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
          border: '1px solid var(--border)',
          borderRadius: '4px',
          background: 'transparent',
          color: 'var(--text-dim)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '14px',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-dim)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
        }}
      >
        ↺
      </button>
    </div>
  );
}

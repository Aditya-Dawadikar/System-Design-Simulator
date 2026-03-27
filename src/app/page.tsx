'use client';
import { useEffect } from 'react';
import { useTheme } from '@/components/shared/ThemeProvider';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import Canvas from '@/components/canvas/Canvas';
import ComponentLibrary from '@/components/sidebar/ComponentLibrary';
import Inspector from '@/components/inspector/Inspector';
import MetricsDashboard from '@/components/simulation/MetricsDashboard';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import { DEFAULT_TEMPLATE } from '@/templates/defaultTemplate';

export default function Home() {
  const { nodes, loadTemplate } = useArchitectureStore();

  useEffect(() => {
    if (nodes.length === 0) {
      loadTemplate(DEFAULT_TEMPLATE);
    }
  }, []);

  const { theme, toggleTheme } = useTheme();
  const running = useSimulationStore((s) => s.running);
  const start   = useSimulationStore((s) => s.start);
  const stop    = useSimulationStore((s) => s.stop);
  const reset   = useSimulationStore((s) => s.reset);

  return (
    <ReactFlowProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)', fontFamily: "'JetBrains Mono', monospace" }}>
        {/* Header */}
        <div style={{ height: 40, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0 }}>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: 13, letterSpacing: 2 }}>SYSTEM DESIGN SIMULATOR</span>
          <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 8 }}>Phase 1 — Drag · Wire · Simulate</span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Run / Stop */}
            <button
              onClick={() => running ? stop() : start()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                border: 'none',
                borderRadius: 4,
                background: running ? 'var(--accent-red)' : 'var(--accent-green)',
                color: 'var(--bg-base)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontSize: 12, lineHeight: 1 }}>{running ? '⏹' : '▶'}</span>
              {running ? 'STOP' : 'RUN'}
            </button>

            {/* Reset */}
            <button
              onClick={reset}
              title="Reset simulation"
              style={{
                padding: '4px 10px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'transparent',
                color: 'var(--text-dim)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                cursor: 'pointer',
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

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: 4,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                padding: '4px 12px',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>
        </div>

        {/* Main workspace */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
          <ComponentLibrary />
          <div style={{ flex: 1, position: 'relative' }}>
            <Canvas />
          </div>
          <Inspector />
        </div>

        {/* Bottom dashboard */}
        <div style={{ height: 280, flexShrink: 0 }}>
          <MetricsDashboard />
        </div>
      </div>
    </ReactFlowProvider>
  );
}

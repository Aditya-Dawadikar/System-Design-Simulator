'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/shared/ThemeProvider';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import Canvas from '@/components/canvas/Canvas';
import ComponentLibrary from '@/components/sidebar/ComponentLibrary';
import Inspector from '@/components/inspector/Inspector';
import MetricsDashboard from '@/components/simulation/MetricsDashboard';
import ScenarioDocsDrawer from '@/components/simulation/ScenarioDocsDrawer';
import IacEditorDrawer from '@/components/iac/IacEditorDrawer';
import { useSimulationStore } from '@/store/simulationStore';
import { useArchitectureStore } from '@/store/architectureStore';
import { SCENARIO_LIBRARY } from '@/templates/scenarios';
import { fromTopology, toYaml } from '@/iac/fromTopology';

export default function SimulatorPage() {
  const { theme, toggleTheme } = useTheme();
  const running = useSimulationStore((s) => s.running);
  const start   = useSimulationStore((s) => s.start);
  const stop    = useSimulationStore((s) => s.stop);
  const reset   = useSimulationStore((s) => s.reset);

  const activeScenarioId = useArchitectureStore((s) => s.activeScenarioId);
  const activeScenario   = SCENARIO_LIBRARY.find((s) => s.id === activeScenarioId) ?? null;
  const [docsOpen, setDocsOpen] = useState(false);

  // IaC editor open/close state
  const [iacOpen, setIacOpen] = useState(false);

  // IaC YAML lives in the store so it persists across open/close and is scoped
  // to the currently loaded architecture.
  const nodes       = useArchitectureStore((s) => s.nodes);
  const edges       = useArchitectureStore((s) => s.edges);
  const nodeConfigs = useArchitectureStore((s) => s.nodeConfigs);
  const edgeConfigs = useArchitectureStore((s) => s.edgeConfigs);
  const iacYaml     = useArchitectureStore((s) => s.iacYaml);
  const setIacYaml  = useArchitectureStore((s) => s.setIacYaml);

  // Canvas → IaC auto-sync (debounced 300 ms to absorb rapid drag events).
  // Runs on every topology change and regenerates the full YAML with all
  // fields, including default-valued and previously untouched ones.
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (nodes.length === 0 && edges.length === 0) {
        setIacYaml('');
        return;
      }
      const doc = fromTopology(
        { nodes, edges, nodeConfigs, edgeConfigs },
        { name: 'current-topology', includeDefaults: true },
      );
      setIacYaml(toYaml(doc));
    }, 300);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [nodes, edges, nodeConfigs, edgeConfigs, setIacYaml]);

  return (
    <ReactFlowProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)', fontFamily: "'JetBrains Mono', monospace" }}>
        {/* Header */}
        <div style={{ height: 40, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0 }}>
          <Link
            href="/"
            style={{
              color: 'var(--text-dim)',
              fontSize: 11,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--text-dim)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-dim)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
            }}
          >
            ← Dashboard
          </Link>

          <span style={{ color: 'var(--border)', fontSize: 11 }}>|</span>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: 13, letterSpacing: 2 }}>SIMULATOR</span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* IaC Editor */}
            <button
              onClick={() => setIacOpen(true)}
              title="Open Infrastructure-as-Code YAML editor"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                border: '1px solid var(--accent-purple)',
                borderRadius: 4,
                background: 'transparent',
                color: 'var(--accent-purple)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-purple)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--bg-base)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-purple)';
              }}
            >
              <span style={{ fontSize: 11 }}>⌥</span>
              IAC
            </button>

            {/* Scenario Docs */}
            {activeScenario && (
              <button
                onClick={() => setDocsOpen(true)}
                title="View scenario requirements & constraints"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  border: '1px solid var(--accent-orange)',
                  borderRadius: 4,
                  background: 'transparent',
                  color: 'var(--accent-orange)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-orange)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--bg-base)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-orange)';
                }}
              >
                <span style={{ fontSize: 12 }}>📋</span>
                DOCS
              </button>
            )}

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

      {/* Scenario docs drawer */}
      {docsOpen && activeScenario && (
        <ScenarioDocsDrawer
          scenarioName={activeScenario.name}
          docs={activeScenario.docs}
          onClose={() => setDocsOpen(false)}
        />
      )}

      {/* IaC YAML editor drawer */}
      {iacOpen && (
        <IacEditorDrawer
          yamlText={iacYaml}
          onYamlChange={setIacYaml}
          onClose={() => setIacOpen(false)}
        />
      )}
    </ReactFlowProvider>
  );
}

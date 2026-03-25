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
import { DEFAULT_TEMPLATE } from '@/templates/defaultTemplate';

export default function Home() {
  const { nodes, loadTemplate } = useArchitectureStore();

  useEffect(() => {
    if (nodes.length === 0) {
      loadTemplate(DEFAULT_TEMPLATE);
    }
  }, []);

  const { theme, toggleTheme } = useTheme();
  return (
    <ReactFlowProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)', fontFamily: "'JetBrains Mono', monospace" }}>
        {/* Header */}
        <div style={{ height: 40, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: 13, letterSpacing: 2 }}>SYSTEM DESIGN SIMULATOR</span>
          <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 16 }}>Phase 1 — Drag · Wire · Simulate</span>
          <button
            onClick={toggleTheme}
            style={{
              marginLeft: 'auto',
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

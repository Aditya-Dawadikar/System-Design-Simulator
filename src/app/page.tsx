'use client';
import { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import Canvas from '@/components/canvas/Canvas';
import ComponentLibrary from '@/components/sidebar/ComponentLibrary';
import Inspector from '@/components/inspector/Inspector';
import MetricsDashboard from '@/components/simulation/MetricsDashboard';
import ResizableDraggable from '@/components/shared/ResizableDraggable';
import { useArchitectureStore } from '@/store/architectureStore';
import { DEFAULT_TEMPLATE } from '@/templates/defaultTemplate';

export default function Home() {
  const { nodes, loadTemplate } = useArchitectureStore();

  useEffect(() => {
    if (nodes.length === 0) {
      loadTemplate(DEFAULT_TEMPLATE);
    }
  }, []);

  return (
    <ReactFlowProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#05070b', fontFamily: "'JetBrains Mono', monospace" }}>
        {/* Header */}
        <div style={{ height: 40, background: '#0b1016', borderBottom: '1px solid #172030', display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
          <span style={{ color: '#00ddff', fontWeight: 600, fontSize: 13, letterSpacing: 2 }}>SYSTEM DESIGN SIMULATOR</span>
          <span style={{ color: '#a1b3bf', fontSize: 11, marginLeft: 16 }}>Phase 1 — Drag · Wire · Simulate</span>
        </div>

        {/* Main workspace */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <ComponentLibrary />
          <div style={{ flex: 1, position: 'relative' }}>
            <Canvas />
          </div>
          <Inspector />
        </div>

        {/* Bottom dashboard (draggable & resizable) */}
        <ResizableDraggable initialPosition={{ x: 0, y: 0 }} initialHeight={300} minHeight={120} maxHeight={800}>
          <MetricsDashboard />
        </ResizableDraggable>
      </div>
    </ReactFlowProvider>
  );
}

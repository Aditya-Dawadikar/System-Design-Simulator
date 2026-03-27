'use client';

import { useMemo } from 'react';
import Sparkline from '@/components/shared/Sparkline';
// Helper to get global RPS history (sum of all node rpsIn)
import { useRef } from 'react';
// --- Global RPS history hook ---
function useGlobalRpsHistory(nodeMetrics: Record<string, NodeMetrics>, maxPoints = 100) {
  const historyRef = useRef<number[]>([]);
  const totalRps = Object.values(nodeMetrics).reduce((sum, m) => sum + (m.rpsIn || 0), 0);
  if (historyRef.current.length === 0 || historyRef.current[historyRef.current.length - 1] !== totalRps) {
    historyRef.current = [...historyRef.current.slice(-maxPoints + 1), totalRps];
  }
  return historyRef.current;
}
import NodeMetricCard from './NodeMetricCard';
import EventLog from './EventLog';
import { useSimulationStore } from '@/store/simulationStore';
import { useArchitectureStore } from '@/store/architectureStore';
import type { NodeMetrics } from '@/types';

// ---------------------------------------------------------------------------
// Global metric helpers
// ---------------------------------------------------------------------------

type SystemStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'FAILED';

interface GlobalMetrics {
  liveRps: number;
  e2eLatencyMs: number;
  errRate: number;
  status: SystemStatus;
}

function computeGlobalMetrics(
  nodeMetrics: Record<string, NodeMetrics>
): GlobalMetrics {
  const all = Object.values(nodeMetrics);

  if (all.length === 0) {
    return { liveRps: 0, e2eLatencyMs: 0, errRate: 0, status: 'HEALTHY' };
  }

  const liveRps       = Math.max(...all.map((m) => m.rpsIn));
  const e2eLatencyMs  = all.reduce((sum, m) => sum + m.latencyMs, 0);
  const errRate       = Math.max(...all.map((m) => m.errorRate));
  const maxLoad       = Math.max(...all.map((m) => m.load));
  const anyFailed     = all.some((m) => m.failed);

  let status: SystemStatus;
  if (anyFailed || maxLoad > 1.05)   status = 'FAILED';
  else if (maxLoad > 0.9)            status = 'CRITICAL';
  else if (maxLoad > 0.75)           status = 'DEGRADED';
  else                               status = 'HEALTHY';

  return { liveRps, e2eLatencyMs, errRate, status };
}

const STATUS_COLOR: Record<SystemStatus, string> = {
  HEALTHY:  'var(--accent-green)',
  DEGRADED: 'var(--accent-yellow)',
  CRITICAL: 'var(--accent-orange)',
  FAILED:   'var(--accent-red)',
};

function formatRps(rps: number): string {
  if (rps >= 1000) return `${(rps / 1000).toFixed(1)}k`;
  return rps.toFixed(0);
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms.toFixed(0)}ms`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------


export default function MetricsDashboard() {
  const nodeMetrics = useSimulationStore((s) => s.nodeMetrics);
  const nodes       = useArchitectureStore((s) => s.nodes);
  const global = useMemo(() => computeGlobalMetrics(nodeMetrics), [nodeMetrics]);
  const globalRpsHistory = useGlobalRpsHistory(nodeMetrics, 100);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border)',
        fontFamily: "'JetBrains Mono', monospace",
        overflow: 'hidden',
      }}
    >
      {/* ── Left: Charts and node cards ── */}
      <div
        style={{
          flex: 2,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          borderRight: '1px solid var(--border)',
          height: '100%',
        }}
      >
        {/* Global metrics row */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <GlobalStat
            label="LIVE RPS"
            value={formatRps(global.liveRps)}
            color="var(--accent-cyan)"
            separator
          />
          <GlobalStat
            label="E2E LAT"
            value={formatMs(global.e2eLatencyMs)}
            color="var(--accent-purple)"
            separator
          />
          <GlobalStat
            label="ERR RATE"
            value={`${(global.errRate * 100).toFixed(1)}%`}
            color={global.errRate > 0.05 ? 'var(--accent-red)' : 'var(--text)'}
            separator
          />
          <GlobalStat
            label="STATUS"
            value={global.status}
            color={STATUS_COLOR[global.status]}
            separator={false}
          />
        </div>

        {/* Global traffic tail curve visualization */}
        <div style={{
          width: '100%',
          height: 36,
          background: 'transparent',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ color: 'var(--border)', fontSize: 11, marginRight: 12, minWidth: 60 }}>TRAFFIC</span>
          <Sparkline data={globalRpsHistory} color="var(--accent-cyan)" width={320} height={28} />
        </div>

        {/* Per-node cards, vertically scrollable */}
        <div
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'auto',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '8px 16px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border) transparent',
            minHeight: 0,
          }}
        >
          {nodes.length === 0 ? (
            <div
              style={{
                color: 'var(--text-dim)',
                fontSize: '11px',
                margin: 'auto 0',
                alignSelf: 'center',
              }}
            >
              Add nodes to the canvas to begin
            </div>
          ) : (
            nodes.map((n) => <NodeMetricCard key={n.id} nodeId={n.id} />)
          )}
        </div>
      </div>

      {/* ── Right: Logs, vertically scrollable ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <div style={{
          fontSize: 11,
          color: 'var(--text-dim)',
          padding: '6px 12px',
          borderBottom: '1px solid var(--border)',
          letterSpacing: '0.04em',
        }}>
          EVENT LOG
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--bg-base)' }}>
          <EventLog />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal stat tile
// ---------------------------------------------------------------------------

function GlobalStat({
  label,
  value,
  color,
  separator,
}: {
  label: string;
  value: string;
  color: string;
  separator: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 12px',
        borderRight: separator ? '1px solid var(--border)' : 'none',
        gap: '2px',
        minWidth: '80px',
      }}
    >
      <span
        style={{
          color: 'var(--text-dim)',
          fontSize: '9px',
          letterSpacing: '0.08em',
          fontWeight: '600',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color,
          fontSize: '14px',
          fontWeight: '700',
          letterSpacing: '0.04em',
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
    </div>
  );
}

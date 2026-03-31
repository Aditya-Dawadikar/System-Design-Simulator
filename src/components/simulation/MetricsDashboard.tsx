'use client';

import { useMemo } from 'react';
import Sparkline from '@/components/shared/Sparkline';
import type { Node } from 'reactflow';
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

// --- Global error-rate history hook ---
function useGlobalErrorRateHistory(globalErrorRate: number, maxPoints = 100) {
  const historyRef = useRef<number[]>([]);
  if (historyRef.current.length === 0 || historyRef.current[historyRef.current.length - 1] !== globalErrorRate) {
    historyRef.current = [...historyRef.current.slice(-maxPoints + 1), globalErrorRate];
  }
  return historyRef.current;
}
import NodeMetricCard from './NodeMetricCard';
import EventLog from './EventLog';
import { useSimulationStore } from '@/store/simulationStore';
import { useArchitectureStore } from '@/store/architectureStore';
import type { NodeMetrics, NodeConfig } from '@/types';

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

// Containers don't contribute directly to error rate — only their children do.
const CONTAINER_TYPES = new Set(['region', 'availability_zone']);

/**
 * Computes propagated error rates for zone and region container nodes by
 * aggregating their children's error rates (weighted by rpsIn).
 * Returns a map of nodeId → effective error rate for zone/region nodes.
 */
function computeZoneRegionErrorRates(
  nodeMetrics: Record<string, NodeMetrics>,
  nodes: Node[],
  nodeConfigs: Record<string, NodeConfig>
): Record<string, number> {
  const result: Record<string, number> = {};

  // Zone error rate = weighted avg of all nodes with zoneId pointing to this zone
  const zoneNodes = nodes.filter(n => n.type === 'availability_zone');
  for (const zone of zoneNodes) {
    const children = nodes.filter(n => nodeConfigs[n.id]?.zoneId === zone.id);
    const totalRps = children.reduce((s, n) => s + (nodeMetrics[n.id]?.rpsIn || 0), 0);
    result[zone.id] = totalRps === 0 ? 0 :
      children.reduce((s, n) => s + (nodeMetrics[n.id]?.errorRate || 0) * (nodeMetrics[n.id]?.rpsIn || 0), 0) / totalRps;
  }

  // Region error rate = weighted avg of all resource nodes in this region
  // (direct regional children + all children of zones in this region)
  const regionNodes = nodes.filter(n => n.type === 'region');
  for (const region of regionNodes) {
    const zonesInRegion = zoneNodes.filter(n => nodeConfigs[n.id]?.regionId === region.id);
    const zonalIds = new Set(zonesInRegion.map(z => z.id));

    const resourceNodes = nodes.filter(n => {
      if (CONTAINER_TYPES.has(String(n.type))) return false;
      const cfg = nodeConfigs[n.id];
      // Direct regional node
      if (cfg?.regionId === region.id && !cfg?.zoneId) return true;
      // Zonal node whose zone is in this region
      if (cfg?.zoneId && zonalIds.has(cfg.zoneId)) return true;
      return false;
    });

    const totalRps = resourceNodes.reduce((s, n) => s + (nodeMetrics[n.id]?.rpsIn || 0), 0);
    result[region.id] = totalRps === 0 ? 0 :
      resourceNodes.reduce((s, n) => s + (nodeMetrics[n.id]?.errorRate || 0) * (nodeMetrics[n.id]?.rpsIn || 0), 0) / totalRps;
  }

  return result;
}

/**
 * Global error rate = weighted avg across all non-container resource nodes,
 * propagated upward through zone → region → global hierarchy.
 */
function computeGlobalErrorRate(
  nodeMetrics: Record<string, NodeMetrics>,
  nodes: Node[],
  nodeConfigs: Record<string, NodeConfig>,
  propagatedErrorRates: Record<string, number>
): number {
  const regionNodes = nodes.filter(n => n.type === 'region');

  if (regionNodes.length === 0) {
    // No regions: simple weighted avg over all non-container nodes
    const resourceNodes = nodes.filter(n => !CONTAINER_TYPES.has(String(n.type)));
    const totalRps = resourceNodes.reduce((s, n) => s + (nodeMetrics[n.id]?.rpsIn || 0), 0);
    return totalRps === 0 ? 0 :
      resourceNodes.reduce((s, n) => s + (nodeMetrics[n.id]?.errorRate || 0) * (nodeMetrics[n.id]?.rpsIn || 0), 0) / totalRps;
  }

  // Nodes that belong to a region (directly or via a zone)
  const zoneNodes = nodes.filter(n => n.type === 'availability_zone');
  const regionNodeIds = new Set(regionNodes.map(r => r.id));
  const affiliatedIds = new Set<string>();
  for (const n of nodes) {
    const cfg = nodeConfigs[n.id];
    if (cfg?.regionId && regionNodeIds.has(cfg.regionId)) affiliatedIds.add(n.id);
    if (cfg?.zoneId) {
      const zoneCfg = nodeConfigs[cfg.zoneId];
      if (zoneCfg?.regionId && regionNodeIds.has(zoneCfg.regionId)) affiliatedIds.add(n.id);
    }
  }

  let totalRps = 0;
  let weightedSum = 0;

  // Region contributions
  for (const region of regionNodes) {
    const zonesInRegion = zoneNodes.filter(n => nodeConfigs[n.id]?.regionId === region.id);
    const zonalIds = new Set(zonesInRegion.map(z => z.id));
    const regionRps = nodes
      .filter(n => {
        if (CONTAINER_TYPES.has(String(n.type))) return false;
        const cfg = nodeConfigs[n.id];
        if (cfg?.regionId === region.id && !cfg?.zoneId) return true;
        if (cfg?.zoneId && zonalIds.has(cfg.zoneId)) return true;
        return false;
      })
      .reduce((s, n) => s + (nodeMetrics[n.id]?.rpsIn || 0), 0);
    totalRps += regionRps;
    weightedSum += (propagatedErrorRates[region.id] || 0) * regionRps;
  }

  // Unaffiliated non-container nodes (global nodes not in any region)
  for (const n of nodes) {
    if (CONTAINER_TYPES.has(String(n.type))) continue;
    if (affiliatedIds.has(n.id)) continue;
    const m = nodeMetrics[n.id];
    if (!m) continue;
    totalRps += m.rpsIn || 0;
    weightedSum += (m.errorRate || 0) * (m.rpsIn || 0);
  }

  return totalRps === 0 ? 0 : weightedSum / totalRps;
}

function computeGlobalMetrics(
  nodeMetrics: Record<string, NodeMetrics>,
  nodes: Node[],
  nodeConfigs: Record<string, NodeConfig>,
  propagatedErrorRates: Record<string, number>
): GlobalMetrics {
  const all = Object.values(nodeMetrics);

  if (all.length === 0) {
    return { liveRps: 0, e2eLatencyMs: 0, errRate: 0, status: 'HEALTHY' };
  }

  const liveRps       = Math.max(...all.map((m) => m.rpsIn));
  const e2eLatencyMs  = all.reduce((sum, m) => sum + m.latencyMs, 0);
  const errRate       = computeGlobalErrorRate(nodeMetrics, nodes, nodeConfigs, propagatedErrorRates);
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
  const nodeMetrics  = useSimulationStore((s) => s.nodeMetrics);
  const nodes        = useArchitectureStore((s) => s.nodes);
  const nodeConfigs  = useArchitectureStore((s) => s.nodeConfigs);
  const propagatedErrorRates = useMemo(
    () => computeZoneRegionErrorRates(nodeMetrics, nodes, nodeConfigs),
    [nodeMetrics, nodes, nodeConfigs]
  );
  const global = useMemo(
    () => computeGlobalMetrics(nodeMetrics, nodes, nodeConfigs, propagatedErrorRates),
    [nodeMetrics, nodes, nodeConfigs, propagatedErrorRates]
  );
  const globalRpsHistory = useGlobalRpsHistory(nodeMetrics, 100);
  const globalErrorHistory = useGlobalErrorRateHistory(global.errRate, 100);

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
          height: 40,
          background: 'transparent',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ color: 'var(--border)', fontSize: 11, marginRight: 12, minWidth: 60 }}>TRAFFIC</span>
          <div style={{ position: 'relative', width: 320, height: 28, flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <Sparkline data={globalRpsHistory} color="var(--accent-cyan)" width={320} height={28} />
            </div>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.95 }}>
              <Sparkline data={globalErrorHistory} color="var(--accent-red)" width={320} height={28} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginLeft: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--accent-cyan)' }}>RPS</span>
            <span style={{ fontSize: 10, color: 'var(--accent-red)' }}>ERR {(global.errRate * 100).toFixed(1)}%</span>
          </div>
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
            nodes.map((n) => (
              <NodeMetricCard
                key={n.id}
                nodeId={n.id}
                overrideErrorRate={propagatedErrorRates[n.id]}
              />
            ))
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

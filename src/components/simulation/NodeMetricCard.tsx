'use client';

import ArcGauge from '@/components/shared/ArcGauge';
import Sparkline from '@/components/shared/Sparkline';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import { COMPONENT_BY_TYPE } from '@/constants/components';
import type { ComponentType, ComponentDetail } from '@/types';

interface NodeMetricCardProps {
  nodeId: string;
  overrideErrorRate?: number;
}

function formatRps(rps: number): string {
  if (rps >= 1000) return `${(rps / 1000).toFixed(1)}k`;
  return rps.toFixed(0);
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms.toFixed(0)}ms`;
}

function getStatusLabel(load: number, failed: boolean): { label: string; color: string } {
  if (failed || load > 1.05) return { label: 'FAILED',    color: 'var(--accent-red)' };
  if (load > 0.9)             return { label: 'CRITICAL',  color: 'var(--accent-red)' };
  if (load > 0.75)            return { label: 'STRESSED',  color: 'var(--accent-orange)' };
  if (load > 0.0)             return { label: 'OK',        color: 'var(--accent-green)' };
  return                             { label: 'IDLE',      color: 'var(--text-dim)' };
}

export default function NodeMetricCard({ nodeId, overrideErrorRate }: NodeMetricCardProps) {
  const node       = useArchitectureStore((s) => s.nodes.find((n) => n.id === nodeId));
  const config     = useArchitectureStore((s) => s.nodeConfigs[nodeId]);
  const metrics    = useSimulationStore((s) => s.nodeMetrics[nodeId]);
  const history    = useSimulationStore((s) => s.history[nodeId]) ?? [];

  if (!node) return null;

  const type      = (node.type ?? 'app_server') as ComponentType;
  const def       = COMPONENT_BY_TYPE[type];
  const label     = config?.label ?? def?.label ?? nodeId;
  const color     = def?.color ?? 'var(--text)';
  const icon      = def?.icon ?? '?';

  const load      = metrics?.load      ?? 0;
  const rpsIn     = metrics?.rpsIn     ?? 0;
  const rpsOut    = metrics?.rpsOut    ?? 0;
  const latencyMs = metrics?.latencyMs ?? 0;
  const p99       = metrics?.p99LatencyMs ?? 0;
  const errorRate = overrideErrorRate ?? metrics?.errorRate ?? 0;
  const failed    = metrics?.failed    ?? false;
  const detail    = metrics?.detail;

  const status    = getStatusLabel(load, failed);
  const stressed  = load > 0.8;

  const borderColor = stressed ? color : 'var(--border)';

  return (
    <>
      {/* Keyframe injection via a <style> tag — avoids a CSS file dependency */}
      <style>{`
        @keyframes sds-pulse-border {
          0%   { box-shadow: 0 0 0 0 ${color}55; }
          50%  { box-shadow: 0 0 0 5px ${color}00; }
          100% { box-shadow: 0 0 0 0 ${color}00; }
        }
        .sds-card-pulse {
          animation: sds-pulse-border 1.4s ease-out infinite;
        }
      `}</style>

      <div
        className={stressed ? 'sds-card-pulse' : undefined}
        style={{
          minWidth: '160px',
          maxWidth: '190px',
          flexShrink: 0,
          background: 'var(--bg-panel)',
          border: `1px solid ${borderColor}`,
          borderRadius: '6px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontFamily: "'JetBrains Mono', monospace",
          transition: 'border-color 0.3s',
          cursor: 'default',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflow: 'hidden',
            }}
          >
            <span style={{ color, fontSize: '14px', flexShrink: 0 }}>{icon}</span>
            <span
              style={{
                color: 'var(--text)',
                fontSize: '10px',
                fontWeight: '600',
                letterSpacing: '0.04em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={label}
            >
              {label}
            </span>
          </div>

          {/* Status badge */}
          <span
            style={{
              fontSize: '9px',
              fontWeight: '700',
              letterSpacing: '0.06em',
              color: status.color,
              flexShrink: 0,
            }}
          >
            {status.label}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)' }} />

        {/* Arc gauge — centered */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '2px' }}>
          <ArcGauge value={load} color={color} size={80} />
        </div>

        {/* RPS row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '4px',
          }}
        >
          <StatCell label="RPS IN"  value={formatRps(rpsIn)}  color="var(--text)" />
          <StatCell label="RPS OUT" value={formatRps(rpsOut)} color="var(--text)" />
        </div>

        {/* Latency row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '4px',
          }}
        >
          <StatCell label="LAT"  value={formatMs(latencyMs)} color="var(--accent-cyan)" />
          <StatCell label="P99"  value={formatMs(p99)}       color="var(--accent-purple)" />
        </div>

        {/* Error rate */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: 'var(--text-dim)', fontSize: '9px', letterSpacing: '0.06em' }}>
            ERR RATE
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: errorRate > 0.05 ? 'var(--accent-red)' : 'var(--text-dim)',
            }}
          >
            {(errorRate * 100).toFixed(1)}%
          </span>
        </div>

        {/* Component-specific detail row */}
        {detail && <ComponentDetailRow detail={detail} />}

        {/* Sparkline — 40-point RPS history */}
        <div style={{ paddingTop: '2px' }}>
          <Sparkline data={history} color={color} width={134} height={28} />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Internal mini stat cell
// ---------------------------------------------------------------------------

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '1px',
        flex: 1,
      }}
    >
      <span style={{ color: 'var(--text-dim)', fontSize: '9px', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ color, fontSize: '11px', fontWeight: '600' }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component-specific detail row
// ---------------------------------------------------------------------------

function fmtRps(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0); }
function fmtMs(n: number)  { return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${n.toFixed(0)}ms`; }
function fmtPct(n: number) { return `${n.toFixed(0)}%`; }

interface DetailPair { label: string; value: string; alert?: boolean }

function DetailCell({ label, value, alert }: DetailPair) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px', flex: 1 }}>
      <span style={{ color: 'var(--text-dim)', fontSize: '9px', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{
        fontSize: '10px', fontWeight: '600',
        color: alert ? 'var(--accent-orange)' : 'var(--text-dim)',
      }}>{value}</span>
    </div>
  );
}

function ComponentDetailRow({ detail }: { detail: ComponentDetail }) {
  let a: DetailPair;
  let b: DetailPair;

  switch (detail.kind) {
    case 'cdn':
      a = { label: 'HIT',    value: fmtPct(detail.cacheHitRate * 100) };
      b = { label: 'ORIGIN', value: `${fmtRps(detail.originBypassRps)}/s` };
      break;
    case 'load_balancer':
      a = { label: 'CONN',  value: fmtRps(detail.activeConnections) };
      b = { label: 'SCALE', value: detail.scalingEvent ? 'YES' : 'NO', alert: detail.scalingEvent };
      break;
    case 'app_server': {
      const instStr = detail.pendingInstances > 0
        ? `${detail.activeInstances}+${detail.pendingInstances}`
        : `${detail.activeInstances}`;
      const warmStr = detail.warmReserve > 0 ? ` ~${detail.warmReserve}` : '';
      a = { label: 'CPU',  value: fmtPct(detail.cpuPct), alert: detail.cpuPct > 80 };
      b = { label: 'INST', value: `${instStr}${warmStr}`,
            alert: detail.pendingInstances > 0 || detail.scalingEvent !== null };
      break;
    }
    case 'cache':
      a = { label: 'HIT',   value: fmtPct(detail.hitRate * 100) };
      b = { label: 'EVICT', value: fmtPct(detail.evictionRate * 100), alert: detail.evictionRate > 0 };
      break;
    case 'database':
      a = { label: 'POOL', value: `${detail.connectionPoolUsed}/${detail.connectionPoolMax}`, alert: detail.connectionPoolUsed >= detail.connectionPoolMax };
      if ((detail.writeRejectedRps ?? 0) > 0) {
        b = { label: 'REJECT', value: `${fmtRps(detail.writeRejectedRps ?? 0)}/s`, alert: true };
      } else if (detail.replicationLagMs > 0) {
        b = { label: 'LAG', value: fmtMs(detail.replicationLagMs), alert: detail.replicationLagMs > 100 };
      } else {
        b = { label: 'QUEUE', value: `${detail.queryQueueDepth}`, alert: detail.queryQueueDepth > 0 };
      }
      break;
    case 'cloud_storage':
      a = { label: 'BW',    value: fmtPct(detail.bandwidthUtilization), alert: detail.bandwidthUtilization > 80 };
      b = { label: 'THROT', value: `${detail.throttledRequests}`, alert: detail.throttledRequests > 0 };
      break;
    case 'pubsub':
      a = { label: 'LAG',   value: fmtMs(detail.subscriberLagMs), alert: detail.subscriberLagMs > 1000 };
      b = { label: 'UNACK', value: fmtRps(detail.unackedMessages), alert: detail.unackedMessages > 0 };
      break;
    case 'cloud_function':
      a = { label: 'CONC',  value: `${detail.concurrencyUsed.toFixed(0)}` };
      b = { label: 'COLD',  value: `×${detail.coldStarts}`, alert: detail.coldStarts > 0 };
      break;
    case 'cron_job':
      a = { label: 'DUR',  value: fmtMs(detail.lastRunDurationMs) };
      b = { label: 'OVLP', value: `${detail.overlapCount}`, alert: detail.overlapCount > 0 };
      break;
    case 'worker_pool':
      a = { label: 'UTIL',    value: fmtPct(detail.workerUtilization), alert: detail.workerUtilization > 90 };
      b = { label: 'BACKLOG', value: fmtMs(detail.taskBacklogMs),       alert: detail.taskBacklogMs > 1000 };
      break;
    case 'nat_gateway':
      a = { label: 'CONNS', value: fmtRps(detail.translatedConnections) };
      b = { label: 'BW',    value: fmtPct(detail.bandwidthUtilizationPct), alert: detail.bandwidthUtilizationPct > 80 };
      break;
    case 'firewall':
      a = { label: 'ALLOW', value: `${fmtRps(detail.allowedRps)}/s` };
      b = { label: 'BLOCK', value: `${fmtRps(detail.blockedRps)}/s`, alert: detail.blockedRps > 0 };
      break;
    default:
      return null;
  }

  return (
    <div style={{ display: 'flex', gap: '4px', justifyContent: 'space-between' }}>
      <DetailCell {...a} />
      <DetailCell {...b} />
    </div>
  );
}

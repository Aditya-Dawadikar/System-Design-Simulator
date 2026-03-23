'use client';

import ArcGauge from '@/components/shared/ArcGauge';
import Sparkline from '@/components/shared/Sparkline';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import { COMPONENT_BY_TYPE } from '@/constants/components';
import type { ComponentType } from '@/types';

interface NodeMetricCardProps {
  nodeId: string;
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
  if (failed || load > 1.05) return { label: 'FAILED',    color: '#ff3355' };
  if (load > 0.9)             return { label: 'CRITICAL',  color: '#ff3355' };
  if (load > 0.75)            return { label: 'STRESSED',  color: '#ff8833' };
  if (load > 0.0)             return { label: 'OK',        color: '#00ff88' };
  return                             { label: 'IDLE',      color: '#a1b3bf' };
}

export default function NodeMetricCard({ nodeId }: NodeMetricCardProps) {
  const node       = useArchitectureStore((s) => s.nodes.find((n) => n.id === nodeId));
  const config     = useArchitectureStore((s) => s.nodeConfigs[nodeId]);
  const metrics    = useSimulationStore((s) => s.nodeMetrics[nodeId]);
  const history    = useSimulationStore((s) => s.history[nodeId]) ?? [];

  if (!node) return null;

  const type      = (node.type ?? 'app_server') as ComponentType;
  const def       = COMPONENT_BY_TYPE[type];
  const label     = config?.label ?? def?.label ?? nodeId;
  const color     = def?.color ?? '#b0c8e0';
  const icon      = def?.icon ?? '?';

  const load      = metrics?.load      ?? 0;
  const rpsIn     = metrics?.rpsIn     ?? 0;
  const rpsOut    = metrics?.rpsOut    ?? 0;
  const latencyMs = metrics?.latencyMs ?? 0;
  const p99       = metrics?.p99LatencyMs ?? 0;
  const errorRate = metrics?.errorRate ?? 0;
  const failed    = metrics?.failed    ?? false;

  const status    = getStatusLabel(load, failed);
  const stressed  = load > 0.8;

  const borderColor = stressed ? color : '#172030';

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
          background: '#0b1016',
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
                color: '#b0c8e0',
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
        <div style={{ height: '1px', background: '#172030' }} />

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
          <StatCell label="RPS IN"  value={formatRps(rpsIn)}  color="#b0c8e0" />
          <StatCell label="RPS OUT" value={formatRps(rpsOut)} color="#b0c8e0" />
        </div>

        {/* Latency row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '4px',
          }}
        >
          <StatCell label="LAT"  value={formatMs(latencyMs)} color="#00ddff" />
          <StatCell label="P99"  value={formatMs(p99)}       color="#bb66ff" />
        </div>

        {/* Error rate */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: '#a1b3bf', fontSize: '9px', letterSpacing: '0.06em' }}>
            ERR RATE
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: errorRate > 0.05 ? '#ff3355' : '#a1b3bf',
            }}
          >
            {(errorRate * 100).toFixed(1)}%
          </span>
        </div>

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
      <span style={{ color: '#a1b3bf', fontSize: '9px', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ color, fontSize: '11px', fontWeight: '600' }}>{value}</span>
    </div>
  );
}

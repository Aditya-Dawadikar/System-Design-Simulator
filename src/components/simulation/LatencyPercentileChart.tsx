'use client';

// ---------------------------------------------------------------------------
// Percentile definitions
// Multipliers derived from a log-normal distribution (σ ≈ 0.8), consistent
// with the engine's existing p99 = latencyMs × 2.5 formula.
// ---------------------------------------------------------------------------
const PCTS = [
  { key: 'p99', mult: 2.50, color: '#ef4444', label: 'p99' },
  { key: 'p95', mult: 2.00, color: '#f97316', label: 'p95' },
  { key: 'p90', mult: 1.50, color: '#f59e0b', label: 'p90' },
  { key: 'p75', mult: 1.00, color: '#00ddff', label: 'p75' },
  { key: 'p50', mult: 0.72, color: '#00ff88', label: 'p50' },
] as const;

interface Props {
  latencyHistory: number[];   // raw latencyMs values, oldest first
  nodeLabel: string;
}

function fmtMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms >= 100)  return `${Math.round(ms)}ms`;
  return `${ms.toFixed(1)}ms`;
}

export default function LatencyPercentileChart({ latencyHistory }: Props) {
  const n = latencyHistory.length;

  // viewBox coordinate system — SVG scales to fill its container
  const VW = 400;
  const VH = 88;
  const padL = 36;   // y-axis labels
  const padR = 34;   // current value labels
  const padT = 4;
  const padB = 4;
  const cW = VW - padL - padR;
  const cH = VH - padT - padB;

  if (n < 2) {
    return (
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <text x={VW / 2} y={VH / 2 + 3} textAnchor="middle"
          fill="var(--text-dim)" fontSize={10} fontFamily="JetBrains Mono, monospace">
          waiting for data…
        </text>
      </svg>
    );
  }

  // Build per-percentile value arrays
  const series = PCTS.map(p => ({
    ...p,
    values: latencyHistory.map(v => v * p.mult),
  }));

  // Y scale: 0 → max of p99 series (with a little headroom)
  const rawMax = Math.max(...series[0].values, 1);
  const yMax   = rawMax * 1.08;

  const toX = (i: number) => padL + (i / (n - 1)) * cW;
  const toY = (v: number) => padT + (1 - Math.min(v, yMax) / yMax) * cH;

  // Three horizontal grid lines at 0%, 50%, 100% of yMax
  const gridValues = [0, rawMax * 0.5, rawMax];

  // Polygon fill between p99 (top) and p50 (bottom)
  const p99 = series[0];
  const p50 = series[series.length - 1];
  const fillTop = p99.values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const fillBot = [...p50.values]
    .reverse()
    .map((v, i) => `${toX(n - 1 - i).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(' ');

  // Latest values for right-edge labels — deduplicate overlapping y positions
  const currentLabels = series.map(s => ({
    key: s.key,
    color: s.color,
    label: s.label,
    value: s.values[n - 1],
    y: toY(s.values[n - 1]),
  }));
  // Spread labels that are within 9px of each other (bottom→top)
  const MIN_GAP = 9;
  const spread = [...currentLabels].reverse();
  for (let i = 1; i < spread.length; i++) {
    const prev = spread[i - 1];
    const cur  = spread[i];
    if (prev.y - cur.y < MIN_GAP) {
      spread[i] = { ...cur, y: prev.y - MIN_GAP };
    }
  }
  const labels = spread.reverse();

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {/* Grid lines */}
      {gridValues.map((v, i) => (
        <g key={i}>
          <line
            x1={padL} y1={toY(v)} x2={padL + cW} y2={toY(v)}
            stroke="var(--border)" strokeWidth={0.5}
            strokeDasharray={i === 0 ? undefined : '2,3'}
          />
          {i > 0 && (
            <text
              x={padL - 3} y={toY(v) + 3}
              textAnchor="end"
              fill="var(--text-dim)" fontSize={7}
              fontFamily="JetBrains Mono, monospace"
            >
              {fmtMs(v)}
            </text>
          )}
        </g>
      ))}

      {/* Fill band between p99 and p50 */}
      <polygon
        points={`${fillTop} ${fillBot}`}
        fill="#ef4444"
        opacity={0.06}
      />

      {/* Percentile lines — draw p99 first (bottom) so p50 is visually on top */}
      {series.map(s => {
        const pts = s.values
          .map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
          .join(' ');
        return (
          <polyline
            key={s.key}
            points={pts}
            fill="none"
            stroke={s.color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.9}
          />
        );
      })}

      {/* Right-edge current value labels */}
      {labels.map(l => (
        <text
          key={l.key}
          x={padL + cW + 3}
          y={l.y + 3}
          fill={l.color}
          fontSize={7}
          fontFamily="JetBrains Mono, monospace"
        >
          {fmtMs(l.value)}
        </text>
      ))}
    </svg>
  );
}

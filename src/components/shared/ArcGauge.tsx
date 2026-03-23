'use client';

interface ArcGaugeProps {
  value: number;
  color: string;
  size?: number;
}

function resolveColor(value: number, baseColor: string): string {
  if (value > 1.0) return '#ff3355';
  if (value > 0.8) return '#ff8833';
  if (value > 0.5) return '#ffcc00';
  if (value >= 0) return '#00ff88';
  return baseColor;
}

export default function ArcGauge({ value, color, size = 64 }: ArcGaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - 6;
  const strokeWidth = 5;

  // Semicircle: starts at 180° (left), ends at 0° (right), going clockwise through bottom
  // We parameterize from left (-x axis) sweeping 180° clockwise
  const startAngle = Math.PI; // left
  const endAngle = 0;         // right (going counter-clockwise in math = clockwise visually when y flipped)

  // Arc from left to right along the top of a circle means going counterclockwise in SVG coords
  // We'll map 0–1 to a sweep from left(180°) to right(0°) going counterclockwise (upward arc)
  const toCartesian = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  // Background arc: 180° → 0° (the top semicircle), counterclockwise
  const bgStart = toCartesian(180);
  const bgEnd = toCartesian(0);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;

  // Foreground arc: 180° → angle based on clamped value
  const clamped = Math.min(value, 1.0);
  const sweepDeg = clamped * 180;
  const fgAngleDeg = 180 - sweepDeg;

  const fgStart = toCartesian(180);
  const fgEnd = toCartesian(fgAngleDeg);
  const largeArc = sweepDeg > 180 ? 1 : 0;

  const fgPath =
    clamped <= 0
      ? ''
      : `M ${fgStart.x} ${fgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fgEnd.x} ${fgEnd.y}`;

  const displayColor = resolveColor(value, color);
  const pct = Math.round(value * 100);

  const fontSize = size < 48 ? 9 : size < 72 ? 11 : 13;

  return (
    <svg width={size} height={size / 2 + 10} style={{ display: 'block', overflow: 'visible' }}>
      <path
        d={bgPath}
        fill="none"
        stroke="#172030"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {fgPath && (
        <path
          d={fgPath}
          fill="none"
          stroke={displayColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fill={displayColor}
        fontSize={fontSize}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="600"
      >
        {pct}%
      </text>
    </svg>
  );
}

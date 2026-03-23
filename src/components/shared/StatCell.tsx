'use client';

interface StatCellProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export default function StatCell({ label, value, unit, highlight = false }: StatCellProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <span
        style={{
          fontSize: '9px',
          color: '#a1b3bf',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: highlight ? '#00ddff' : '#b0c8e0',
          lineHeight: 1,
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: '9px',
              fontWeight: 500,
              color: '#a1b3bf',
              marginLeft: '2px',
            }}
          >
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

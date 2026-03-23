'use client';

import type { NodeStatus } from '@/types';

interface BadgeProps {
  status: NodeStatus;
}

const STATUS_CONFIG: Record<NodeStatus, { color: string; label: string }> = {
  idle:     { color: '#a1b3bf', label: 'IDLE' },
  ok:       { color: '#00ff88', label: 'OK' },
  stressed: { color: '#ffcc00', label: 'STRESSED' },
  critical: { color: '#ff8833', label: 'CRITICAL' },
  failed:   { color: '#ff3355', label: 'FAILED' },
};

export default function Badge({ status }: BadgeProps) {
  const { color, label } = STATUS_CONFIG[status];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10px',
        fontWeight: 600,
        color,
        letterSpacing: '0.05em',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 4px ${color}`,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

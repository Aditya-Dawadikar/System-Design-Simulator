'use client';

import type { NodeStatus } from '@/types';

interface BadgeProps {
  status: NodeStatus;
}

const STATUS_CONFIG: Record<NodeStatus, { color: string; label: string }> = {
  idle:     { color: 'var(--text-dim)', label: 'IDLE' },
  ok:       { color: 'var(--accent-green)', label: 'OK' },
  stressed: { color: 'var(--accent-yellow)', label: 'STRESSED' },
  critical: { color: 'var(--accent-orange)', label: 'CRITICAL' },
  failed:   { color: 'var(--accent-red)', label: 'FAILED' },
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

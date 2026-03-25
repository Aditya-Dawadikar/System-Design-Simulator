'use client';

import { useEffect, useRef } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import type { LogEvent } from '@/types';

const LEVEL_ICON: Record<LogEvent['level'], string> = {
  info:  '›',
  warn:  '⚠',
  error: '✕',
  k8s:   '⎈',
};

const LEVEL_COLOR: Record<LogEvent['level'], string> = {
  info:  'var(--text)',
  warn:  'var(--accent-yellow)',
  error: 'var(--accent-red)',
  k8s:   'var(--accent-cyan)',
};

export default function EventLog() {
  const events  = useSimulationStore((s) => s.events);
  const running = useSimulationStore((s) => s.running);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever events change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events]);

  const isEmpty = events.length === 0;

  return (
    <div
      style={{
        padding: '4px 16px 12px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '11px',
      }}
    >
      {isEmpty && !running ? (
        <div
          style={{
            color: 'var(--text-dim)',
            padding: '8px 0',
            letterSpacing: '0.04em',
          }}
        >
          Run simulation to see events
        </div>
      ) : (
        events.map((evt, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              padding: '2px 0',
              color: LEVEL_COLOR[evt.level],
              lineHeight: 1.4,
            }}
          >
            {/* Timestamp */}
            <span
              style={{
                color: 'var(--text-dim)',
                flexShrink: 0,
                minWidth: '52px',
                letterSpacing: '0.03em',
              }}
            >
              T+{evt.tick}s
            </span>

            {/* Level icon */}
            <span
              style={{
                flexShrink: 0,
                fontSize: evt.level === 'warn' ? '10px' : '12px',
                lineHeight: 1,
              }}
            >
              {LEVEL_ICON[evt.level]}
            </span>

            {/* Message */}
            <span style={{ flex: 1, wordBreak: 'break-word' }}>
              {evt.message}
            </span>
          </div>
        ))
      )}

      {/* Sentinel div — scroll target */}
      <div ref={bottomRef} />
    </div>
  );
}

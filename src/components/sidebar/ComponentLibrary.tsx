'use client';

import { COMPONENT_DEFINITIONS } from '@/constants/components';
import ComponentItem from './ComponentItem';

export default function ComponentLibrary() {
  return (
    <div
      style={{
        width: '200px',
        minWidth: '200px',
        height: '100%',
        background: '#0b1016',
        borderRight: '1px solid #172030',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 12px 10px',
          borderBottom: '1px solid #172030',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            fontWeight: 700,
            color: '#a1b3bf',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Components
        </span>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '6px',
          paddingBottom: '6px',
        }}
      >
        {COMPONENT_DEFINITIONS.map((def) => (
          <ComponentItem key={def.type} definition={def} />
        ))}
      </div>
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid #172030',
        }}
      >
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: '#a1b3bf',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Drag components onto the canvas to build your architecture.
        </p>
      </div>
    </div>
  );
}

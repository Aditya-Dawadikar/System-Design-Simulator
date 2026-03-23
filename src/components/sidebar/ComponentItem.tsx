'use client';

import { useState } from 'react';
import type { ComponentDefinition } from '@/constants/components';

interface ComponentItemProps {
  definition: ComponentDefinition;
}

export default function ComponentItem({ definition }: ComponentItemProps) {
  const [hovered, setHovered] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('componentType', definition.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${hovered ? definition.color : '#172030'}`,
        background: hovered ? 'rgba(255,255,255,0.02)' : '#0b1016',
        borderRadius: '6px',
        padding: '10px',
        margin: '4px 8px',
        cursor: 'grab',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            fontSize: '16px',
            color: definition.color,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {definition.icon}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            fontWeight: 600,
            color: '#b0c8e0',
            letterSpacing: '0.02em',
          }}
        >
          {definition.label}
        </span>
      </div>
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: '#a1b3bf',
          margin: 0,
          lineHeight: 1.4,
          letterSpacing: '0.02em',
        }}
      >
        {definition.description}
      </p>
    </div>
  );
}

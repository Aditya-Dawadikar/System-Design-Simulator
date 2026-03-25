'use client';


import { useState } from 'react';
import { COMPONENT_DEFINITIONS } from '@/constants/components';
import ComponentItem from './ComponentItem';

export default function ComponentLibrary() {
  const [search, setSearch] = useState('');
  const filtered = COMPONENT_DEFINITIONS.filter((def) => {
    const q = search.toLowerCase();
    return (
      def.label.toLowerCase().includes(q) ||
      def.type.toLowerCase().includes(q) ||
      def.description.toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        width: '200px',
        minWidth: '200px',
        alignSelf: 'stretch',
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 12px 6px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            fontWeight: 700,
            color: 'var(--text-dim)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Components
        </span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            background: 'var(--bg-panel)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '4px 8px',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingTop: '6px',
          paddingBottom: '6px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
        }}
      >
        {filtered.length > 0 ? (
          filtered.map((def) => (
            <ComponentItem key={def.type} definition={def} />
          ))
        ) : (
          <div style={{ color: 'var(--text-dim)', fontSize: '11px', padding: '12px', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
            No components found
          </div>
        )}
      </div>
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: 'var(--text-dim)',
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

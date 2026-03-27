'use client';


import { useState } from 'react';
import { COMPONENT_DEFINITIONS } from '@/constants/components';
import type { ComponentDefinition } from '@/constants/components';
import ComponentItem from './ComponentItem';

type ComponentCategory =
  | 'Compute'
  | 'Storage'
  | 'Network'
  | 'Scaling'
  | 'Async'
  | 'Other';

const CATEGORY_ORDER: ComponentCategory[] = [
  'Compute',
  'Storage',
  'Network',
  'Scaling',
  'Async',
  'Other',
];

const COMPONENT_CATEGORY: Record<ComponentDefinition['type'], ComponentCategory> = {
  app_server: 'Compute',
  cloud_function: 'Compute',
  worker_pool: 'Compute',
  cache: 'Storage',
  database: 'Storage',
  cloud_storage: 'Storage',
  block_storage: 'Storage',
  network_storage: 'Storage',
  cdn: 'Network',
  load_balancer: 'Network',
  traffic_generator: 'Scaling',
  pubsub: 'Async',
  cron_job: 'Async',
  comment: 'Other',
};

export default function ComponentLibrary() {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<ComponentCategory, boolean>>({
    Compute: false,
    Storage: false,
    Network: false,
    Scaling: false,
    Async: false,
    Other: false,
  });

  const filtered = COMPONENT_DEFINITIONS.filter((def) => {
    const q = search.toLowerCase();
    return (
      def.label.toLowerCase().includes(q) ||
      def.type.toLowerCase().includes(q) ||
      def.description.toLowerCase().includes(q)
    );
  });

  const grouped = CATEGORY_ORDER.reduce<Record<ComponentCategory, ComponentDefinition[]>>((acc, category) => {
    acc[category] = filtered.filter((def) => COMPONENT_CATEGORY[def.type] === category);
    return acc;
  }, {
    Compute: [],
    Storage: [],
    Network: [],
    Scaling: [],
    Async: [],
    Other: [],
  });

  const visibleCategories = CATEGORY_ORDER.filter((category) => grouped[category].length > 0);
  const isSearching = search.trim().length > 0;

  const toggleCategory = (category: ComponentCategory) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

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
          visibleCategories.map((category) => {
            const categoryItems = grouped[category];
            const isExpanded = isSearching ? categoryItems.length > 0 : expandedCategories[category];

            return (
              <div key={category} style={{ marginBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderTop: '1px solid var(--border)',
                    padding: '8px 12px 6px',
                    color: 'var(--text-dim)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <span>{category}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>{categoryItems.length}</span>
                    <span style={{ color: 'var(--text)', fontSize: '11px' }}>{isExpanded ? '▾' : '▸'}</span>
                  </span>
                </button>
                {isExpanded && categoryItems.map((def) => (
                  <ComponentItem key={def.type} definition={def} />
                ))}
              </div>
            );
          })
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

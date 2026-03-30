'use client';
import { useEffect } from 'react';
import type { ScenarioDocs } from '@/templates/scenarios';

interface Props {
  scenarioName: string;
  docs: ScenarioDocs;
  onClose: () => void;
}

export default function ScenarioDocsDrawer({ scenarioName, docs, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 200,
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 480,
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'JetBrains Mono', monospace",
        overflowY: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--accent-orange)', letterSpacing: 2, marginBottom: 3 }}>
              // SCENARIO DOCS
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{scenarioName}</div>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
              borderRadius: 4,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              width: 28,
              height: 28,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-red)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-red)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>

          {/* Overview */}
          <Section title="Overview" accent="var(--accent-cyan)">
            <p style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.75, margin: 0 }}>
              {docs.overview}
            </p>
          </Section>

          {/* Functional Requirements */}
          <Section title="Functional Requirements" accent="var(--accent-green)">
            <RequirementList items={docs.functionalRequirements} bullet="▸" color="var(--accent-green)" />
          </Section>

          {/* Non-Functional Requirements */}
          <Section title="Non-Functional Requirements" accent="var(--accent-purple)">
            <RequirementList items={docs.nonFunctionalRequirements} bullet="◆" color="var(--accent-purple)" />
          </Section>

          {/* Constraints */}
          <Section title="Constraints" accent="var(--accent-orange)" last>
            <RequirementList items={docs.constraints} bullet="⚠" color="var(--accent-orange)" />
          </Section>

        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({
  title,
  accent,
  children,
  last = false,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{ marginBottom: last ? 0 : 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 14, background: accent, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function RequirementList({ items, bullet, color }: { items: string[]; bullet: string; color: string }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color, fontSize: 9, flexShrink: 0, marginTop: 2, lineHeight: 1.6 }}>{bullet}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

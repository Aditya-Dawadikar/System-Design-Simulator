'use client';

import { useEffect, useRef, useState } from 'react';
import { useArchitectureStore } from '@/store/architectureStore';
import { parseDocument } from '@/iac/parser';
import { validateDocument, hasErrors } from '@/iac/validate';
import { toTopology } from '@/iac/toTopology';
import { fromTopology, toYaml } from '@/iac/fromTopology';
import { THREE_TIER_STARTER } from '@/iac/starters';
import type { ValidationIssue } from '@/iac/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = 'idle' | 'valid' | 'invalid' | 'applied';

interface Props {
  yamlText: string;
  onYamlChange: (text: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IacEditorDrawer({ yamlText, onYamlChange, onClose }: Props) {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const nodes        = useArchitectureStore((s) => s.nodes);
  const edges        = useArchitectureStore((s) => s.edges);
  const nodeConfigs  = useArchitectureStore((s) => s.nodeConfigs);
  const edgeConfigs  = useArchitectureStore((s) => s.edgeConfigs);
  const loadTopology = useArchitectureStore((s) => s.loadTopology);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus textarea on open
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function runValidation(text: string): { ok: boolean; allIssues: ValidationIssue[] } {
    const parsed = parseDocument(text);
    if (!parsed.ok) {
      return { ok: false, allIssues: parsed.issues };
    }
    const semIssues = validateDocument(parsed.document);
    return { ok: !hasErrors(semIssues), allIssues: semIssues };
  }

  function handleValidate() {
    const { ok, allIssues } = runValidation(yamlText);
    setIssues(allIssues);
    setStatus(ok ? 'valid' : 'invalid');
  }

  function handleApply() {
    const parsed = parseDocument(yamlText);
    if (!parsed.ok) {
      setIssues(parsed.issues);
      setStatus('invalid');
      return;
    }
    const semIssues = validateDocument(parsed.document);
    setIssues(semIssues);
    if (hasErrors(semIssues)) {
      setStatus('invalid');
      return;
    }
    const topology = toTopology(parsed.document);
    loadTopology(topology);
    setStatus('applied');
  }

  function handleExport() {
    const doc = fromTopology(
      { nodes, edges, nodeConfigs, edgeConfigs },
      { name: 'exported-topology' },
    );
    onYamlChange(toYaml(doc));
    setIssues([]);
    setStatus('idle');
  }

  function handleLoadStarter() {
    // Puts the starter template in the editor for the user to review/edit.
    // The canvas is left unchanged; click APPLY to load the template.
    onYamlChange(THREE_TIER_STARTER);
    setIssues([]);
    setStatus('idle');
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const errors   = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const canApply = status !== 'invalid';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 580,
          background: 'var(--bg-panel)',
          borderLeft: '1px solid var(--border)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 9, color: 'var(--accent-purple)', letterSpacing: 2, marginBottom: 2 }}>
              {'// IAC EDITOR'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: 1 }}>
              YAML Infrastructure
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close (Esc)"
            style={closeButtonStyle}
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

        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          <ToolbarButton
            label="STARTER"
            onClick={handleLoadStarter}
            color="var(--text-dim)"
            title="Load three-tier starter template into editor (click APPLY to apply)"
          />

          <div style={{ width: 1, height: 18, background: 'var(--border)' }} />

          <ToolbarButton
            label="VALIDATE"
            onClick={handleValidate}
            color="var(--accent-cyan)"
            title="Parse and validate without applying"
          />

          <ToolbarButton
            label="APPLY"
            onClick={handleApply}
            color={canApply ? 'var(--accent-green)' : 'var(--text-dim)'}
            disabled={status === 'invalid'}
            title={
              status === 'invalid'
                ? 'Fix errors before applying'
                : 'Validate and apply to canvas'
            }
          />

          <ToolbarButton
            label="EXPORT"
            onClick={handleExport}
            color="var(--accent-purple)"
            title="Export current canvas topology to YAML"
          />

          {/* Status chip */}
          <div style={{ marginLeft: 'auto' }}>
            <StatusChip status={status} errorCount={errors.length} warnCount={warnings.length} />
          </div>
        </div>

        {/* ── YAML Textarea ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <textarea
            ref={textareaRef}
            value={yamlText}
            onChange={(e) => {
              onYamlChange(e.target.value);
              // Clear status on edit so stale validation doesn't mislead
              if (status !== 'idle') setStatus('idle');
            }}
            spellCheck={false}
            style={{
              flex: 1,
              width: '100%',
              resize: 'none',
              border: 'none',
              outline: 'none',
              background: 'var(--bg-base)',
              color: 'var(--text)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              lineHeight: 1.65,
              padding: '14px 16px',
              tabSize: 2,
              overflowY: 'auto',
              overflowX: 'auto',
              whiteSpace: 'pre',
              wordWrap: 'normal' as never,
            }}
          />
        </div>

        {/* ── Issue list ──────────────────────────────────────────────────── */}
        {issues.length > 0 && (
          <IssueList errors={errors} warnings={warnings} />
        )}

        {/* ── Footer hint ─────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '6px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 16,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 0.5 }}>
            Esc to close
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 0.5 }}>
            Apply replaces the current canvas
          </span>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ToolbarButton({
  label,
  onClick,
  color,
  title,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  color: string;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      style={{
        padding: '3px 10px',
        border: `1px solid ${disabled ? 'var(--border)' : color}`,
        borderRadius: 4,
        background: 'transparent',
        color: disabled ? 'var(--text-dim)' : color,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.background = color;
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--bg-base)';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = color;
      }}
    >
      {label}
    </button>
  );
}

function StatusChip({
  status,
  errorCount,
  warnCount,
}: {
  status: Status;
  errorCount: number;
  warnCount: number;
}) {
  const config: Record<Status, { label: string; color: string; dot: string }> = {
    idle:    { label: 'IDLE',    color: 'var(--text-dim)',    dot: 'var(--border)' },
    valid:   { label: 'VALID',   color: 'var(--accent-green)', dot: 'var(--accent-green)' },
    invalid: {
      label: `${errorCount} ERROR${errorCount !== 1 ? 'S' : ''}`,
      color: 'var(--accent-red)',
      dot: 'var(--accent-red)',
    },
    applied: { label: 'APPLIED', color: 'var(--accent-cyan)', dot: 'var(--accent-cyan)' },
  };
  const { label, color, dot } = config[status];

  const displayLabel =
    status === 'valid' && warnCount > 0
      ? `VALID · ${warnCount} WARN${warnCount !== 1 ? 'S' : ''}`
      : label;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dot,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 9, color, fontWeight: 700, letterSpacing: '0.1em' }}>
        {displayLabel}
      </span>
    </div>
  );
}

function IssueList({
  errors,
  warnings,
}: {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}) {
  const all = [...errors, ...warnings];

  return (
    <div
      style={{
        borderTop: `1px solid ${errors.length > 0 ? 'var(--accent-red)' : 'var(--accent-yellow)'}`,
        background: 'var(--bg-base)',
        maxHeight: 180,
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Issue panel header */}
      <div
        style={{
          padding: '6px 16px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-base)',
          zIndex: 1,
        }}
      >
        {errors.length > 0 && (
          <span style={{ fontSize: 9, color: 'var(--accent-red)', fontWeight: 700, letterSpacing: 1 }}>
            ✕ {errors.length} ERROR{errors.length !== 1 ? 'S' : ''}
          </span>
        )}
        {warnings.length > 0 && (
          <span style={{ fontSize: 9, color: 'var(--accent-yellow)', fontWeight: 700, letterSpacing: 1 }}>
            ⚠ {warnings.length} WARN{warnings.length !== 1 ? 'S' : ''}
          </span>
        )}
      </div>

      {/* Issue rows */}
      <div style={{ padding: '4px 0 8px' }}>
        {all.map((issue, i) => (
          <IssueRow key={i} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const isError = issue.severity === 'error';
  const color   = isError ? 'var(--accent-red)' : 'var(--accent-yellow)';
  const prefix  = isError ? '✕' : '⚠';

  return (
    <div
      style={{
        padding: '5px 16px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ color, fontSize: 10, flexShrink: 0, lineHeight: 1.6 }}>{prefix}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>
          {issue.message}
        </div>
        {(issue.path || issue.line) && (
          <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.4 }}>
            {issue.path && <span style={{ color: 'var(--accent-cyan)' }}>{issue.path}</span>}
            {issue.path && issue.line && <span style={{ margin: '0 4px' }}>·</span>}
            {issue.line && <span>line {issue.line}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const closeButtonStyle: React.CSSProperties = {
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
};

'use client';

import { useArchitectureStore } from '@/store/architectureStore';

const ACCENT = '#f59e0b';

interface CommentFieldsProps { nodeId: string; }

export default function CommentFields({ nodeId }: CommentFieldsProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  return (
    <div>
      <div style={{ marginBottom: '6px' }}>
        <label
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            display: 'block',
            marginBottom: '5px',
          }}
        >
          Description
        </label>
        <textarea
          value={config.commentBody ?? ''}
          onChange={(e) => updateNodeConfig(nodeId, { commentBody: e.target.value })}
          placeholder={
            'Describe what this component does:\n\n• Algorithm used\n• Tables / partitions / shards\n• SLA / throughput targets\n• Dependencies'
          }
          rows={10}
          style={{
            background: 'var(--bg-base)',
            border: `1px solid var(--border)`,
            borderLeft: `2px solid ${ACCENT}55`,
            color: 'var(--text)',
            borderRadius: '4px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            lineHeight: '1.6',
            padding: '8px 10px',
            width: '100%',
            boxSizing: 'border-box',
            outline: 'none',
            resize: 'vertical',
            minHeight: '140px',
          }}
          spellCheck={false}
        />
      </div>

      <div
        style={{
          marginTop: '12px',
          padding: '8px 10px',
          background: `${ACCENT}0a`,
          border: `1px solid ${ACCENT}20`,
          borderRadius: '4px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: 'var(--text-dim)',
          lineHeight: 1.7,
        }}
      >
        This node has no simulation effect. Connect it to any component to annotate your architecture diagram.
      </div>
    </div>
  );
}

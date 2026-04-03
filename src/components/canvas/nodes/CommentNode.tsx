'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useArchitectureStore } from '@/store/architectureStore';
import NodeLocationBadge from '@/components/shared/NodeLocationBadge';

const ACCENT = '#f59e0b';

export default memo(function CommentNode({ id, selected }: NodeProps) {
  const config = useArchitectureStore((s) => s.nodeConfigs[id]);

  const title = config?.label ?? 'Comment';
  const body = config?.commentBody ?? '';

  const boxShadow = selected
    ? `0 0 0 2px ${ACCENT}55, 0 0 24px ${ACCENT}22`
    : 'none';

  return (
    <div
      style={{
        width: 260,
        background: '#0d1117',
        border: `1px solid #1e2a1a`,
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: 6,
        fontFamily: "'JetBrains Mono', monospace",
        boxShadow,
        transition: 'box-shadow 0.2s',
        position: 'relative',
      }}
    >
      {/* Handles on all 4 sides so it can attach to any face of a node */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: ACCENT, border: '2px solid #0d1117', width: 8, height: 8, top: -5, opacity: 0.6 }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{ background: ACCENT, border: '2px solid #0d1117', width: 8, height: 8, top: -5, left: '65%', opacity: 0.6 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: ACCENT, border: '2px solid #0d1117', width: 8, height: 8, left: -5, opacity: 0.6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: ACCENT, border: '2px solid #0d1117', width: 8, height: 8, right: -5, opacity: 0.6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: ACCENT, border: '2px solid #0d1117', width: 8, height: 8, bottom: -5, opacity: 0.6 }}
      />
      <NodeLocationBadge nodeId={id} />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{ background: ACCENT, border: '2px solid #0d1117', width: 8, height: 8, bottom: -5, left: '65%', opacity: 0.6 }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '9px 12px 7px',
          borderBottom: body ? '1px solid var(--border)' : 'none',
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: ACCENT,
            letterSpacing: '0.12em',
            opacity: 0.8,
            flexShrink: 0,
          }}
        >
          {'//'}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#e2c97e',
            letterSpacing: '0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
      </div>

      {/* Body text */}
      {body && (
        <div
          style={{
            padding: '8px 12px 10px',
            fontSize: 11,
            color: '#7c9ab5',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {body}
        </div>
      )}

      {/* Empty state */}
      {!body && (
        <div style={{ padding: '6px 12px 8px', fontSize: 10, color: '#3a4f60', fontStyle: 'italic' }}>
          Click to add description…
        </div>
      )}
    </div>
  );
});

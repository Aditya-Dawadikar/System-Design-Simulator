'use client';

import { useArchitectureStore } from '@/store/architectureStore';
import { COMPONENT_BY_TYPE } from '@/constants/components';
import type { ComponentType } from '@/types';
import CdnFields from './fields/CdnFields';
import LoadBalancerFields from './fields/LoadBalancerFields';
import AppServerFields from './fields/AppServerFields';
import CacheFields from './fields/CacheFields';
import DatabaseFields from './fields/DatabaseFields';
import EdgeInspector from './fields/EdgeInspector';

function NodeFields({ nodeId, type }: { nodeId: string; type: ComponentType }) {
  switch (type) {
    case 'cdn':
      return <CdnFields nodeId={nodeId} />;
    case 'load_balancer':
      return <LoadBalancerFields nodeId={nodeId} />;
    case 'app_server':
      return <AppServerFields nodeId={nodeId} />;
    case 'cache':
      return <CacheFields nodeId={nodeId} />;
    case 'database':
      return <DatabaseFields nodeId={nodeId} />;
    default:
      return null;
  }
}

function NodeHeader({ nodeId }: { nodeId: string }) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId]);
  const nodes = useArchitectureStore((s) => s.nodes);
  const node = nodes.find((n) => n.id === nodeId);

  if (!node) return null;

  const type = node.type as ComponentType;
  const def = COMPONENT_BY_TYPE[type];
  const label = config?.label ?? def?.label ?? type;

  return (
    <div
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid #172030',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '16px',
            color: def?.color ?? '#b0c8e0',
            lineHeight: 1,
          }}
        >
          {def?.icon ?? '○'}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            fontWeight: 700,
            color: '#b0c8e0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          fontWeight: 600,
          color: def?.color ?? '#b0c8e0',
          background: `${def?.color ?? '#b0c8e0'}18`,
          border: `1px solid ${def?.color ?? '#b0c8e0'}30`,
          borderRadius: '3px',
          padding: '2px 6px',
          alignSelf: 'flex-start',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {type.replace('_', ' ')}
      </span>
    </div>
  );
}

function EdgeHeader({ edgeId }: { edgeId: string }) {
  const edges = useArchitectureStore((s) => s.edges);
  const edge = edges.find((e) => e.id === edgeId);

  return (
    <div
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid #172030',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', color: '#00ddff', lineHeight: 1 }}>⇢</span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            fontWeight: 700,
            color: '#b0c8e0',
          }}
        >
          Connection
        </span>
      </div>
      {edge && (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: '#a1b3bf',
            letterSpacing: '0.04em',
          }}
        >
          {edge.source} → {edge.target}
        </span>
      )}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          fontWeight: 600,
          color: '#00ddff',
          background: '#00ddff18',
          border: '1px solid #00ddff30',
          borderRadius: '3px',
          padding: '2px 6px',
          alignSelf: 'flex-start',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        edge
      </span>
    </div>
  );
}

export default function Inspector() {
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);
  const selectedEdgeId = useArchitectureStore((s) => s.selectedEdgeId);
  const nodes = useArchitectureStore((s) => s.nodes);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  return (
    <div
      style={{
        width: '260px',
        minWidth: '260px',
        height: '100%',
        background: '#0b1016',
        borderLeft: '1px solid #172030',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 14px 10px',
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
          Inspector
        </span>
      </div>

      {!selectedNodeId && !selectedEdgeId && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '24px', opacity: 0.3 }}>◎</span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: '#a1b3bf',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            Select a component to configure
          </span>
        </div>
      )}

      {selectedNodeId && selectedNode && (
        <>
          <NodeHeader nodeId={selectedNodeId} />
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
            }}
          >
            <NodeFields nodeId={selectedNodeId} type={selectedNode.type as ComponentType} />
          </div>
        </>
      )}

      {selectedEdgeId && !selectedNodeId && (
        <>
          <EdgeHeader edgeId={selectedEdgeId} />
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
            }}
          >
            <EdgeInspector edgeId={selectedEdgeId} />
          </div>
        </>
      )}
    </div>
  );
}

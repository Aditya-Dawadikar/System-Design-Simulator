'use client';

import { useArchitectureStore } from '@/store/architectureStore';
import { COMPONENT_BY_TYPE } from '@/constants/components';
import type { ComponentType } from '@/types';
import type { ComponentScope } from '@/constants/components';
import CdnFields from './fields/CdnFields';
import LoadBalancerFields from './fields/LoadBalancerFields';
import AppServerFields from './fields/AppServerFields';
import CacheFields from './fields/CacheFields';
import DatabaseFields from './fields/DatabaseFields';
import CloudStorageFields from './fields/CloudStorageFields';
import BlockStorageFields from './fields/BlockStorageFields';
import NetworkStorageFields from './fields/NetworkStorageFields';
import PubSubFields from './fields/PubSubFields';
import CloudFunctionFields from './fields/CloudFunctionFields';
import CronJobFields from './fields/CronJobFields';
import WorkerPoolFields from './fields/WorkerPoolFields';
import CommentFields from './fields/CommentFields';
import TrafficGeneratorFields from './fields/TrafficGeneratorFields';
import RateLimiterFields from './fields/RateLimiterFields';
import ServiceMeshFields from './fields/ServiceMeshFields';
import RegionFields from './fields/RegionFields';
import AvailabilityZoneFields from './fields/AvailabilityZoneFields';
import GlobalAcceleratorFields from './fields/GlobalAcceleratorFields';
import EdgeInspector from './fields/EdgeInspector';

function NodeNameField({ nodeId, label = 'Name' }: { nodeId: string; label?: string }) {
  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);
  return (
    <div style={{ marginBottom: '14px' }}>
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
        {label}
      </label>
      <input
        type="text"
        value={config.label ?? ''}
        onChange={(e) => updateNodeConfig(nodeId, { label: e.target.value })}
        placeholder="Custom name…"
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          borderRadius: '4px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          padding: '5px 8px',
          width: '100%',
          boxSizing: 'border-box',
          outline: 'none',
        }}
        spellCheck={false}
      />
    </div>
  );
}

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
    case 'cloud_storage':
      return <CloudStorageFields nodeId={nodeId} />;
    case 'block_storage':
      return <BlockStorageFields nodeId={nodeId} />;
    case 'network_storage':
      return <NetworkStorageFields nodeId={nodeId} />;
    case 'pubsub':
      return <PubSubFields nodeId={nodeId} />;
    case 'cloud_function':
      return <CloudFunctionFields nodeId={nodeId} />;
    case 'cron_job':
      return <CronJobFields nodeId={nodeId} />;
    case 'worker_pool':
      return <WorkerPoolFields nodeId={nodeId} />;
    case 'comment':
      return <CommentFields nodeId={nodeId} />;
    case 'traffic_generator':
      return <TrafficGeneratorFields nodeId={nodeId} />;
    case 'rate_limiter':
      return <RateLimiterFields nodeId={nodeId} />;
    case 'service_mesh':
      return <ServiceMeshFields nodeId={nodeId} />;
    case 'region':
      return <RegionFields nodeId={nodeId} />;
    case 'availability_zone':
      return <AvailabilityZoneFields nodeId={nodeId} />;
    case 'global_accelerator':
      return <GlobalAcceleratorFields nodeId={nodeId} />;
    default:
      return null;
  }
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: '4px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px',
  padding: '5px 8px',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  cursor: 'pointer',
};

const locationLabelStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  display: 'block',
  marginBottom: '5px',
};

/**
 * Scope-aware placement field shown in the inspector for every resource node.
 *  zonal    → "Availability Zone" dropdown (sets zoneId)
 *  regional → "Region" dropdown           (sets regionId)
 *  global / container → hidden
 */
function NodeLocationField({ nodeId, type }: { nodeId: string; type: ComponentType }) {
  const def = COMPONENT_BY_TYPE[type];
  const scope: ComponentScope | undefined = def?.scope;

  const config = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);
  const nodes = useArchitectureStore((s) => s.nodes);
  const nodeConfigs = useArchitectureStore((s) => s.nodeConfigs);

  // Containers and global components don't get a placement picker
  if (!scope || scope === 'global') return null;

  if (scope === 'zonal') {
    const zones = nodes.filter((n) => n.type === 'availability_zone');
    if (zones.length === 0) return null;
    return (
      <div style={{ marginBottom: '14px' }}>
        <label style={{ ...locationLabelStyle, color: '#67e8f9' }}>◎ Availability Zone</label>
        <select
          value={config.zoneId ?? ''}
          onChange={(e) => updateNodeConfig(nodeId, { zoneId: e.target.value || undefined })}
          style={selectStyle}
        >
          <option value="">— No Zone —</option>
          {zones.map((z) => {
            const zCfg = nodeConfigs[z.id] ?? {};
            return (
              <option key={z.id} value={z.id}>
                {zCfg.zoneName ?? zCfg.label ?? z.id}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  // regional
  const regions = nodes.filter((n) => n.type === 'region');
  if (regions.length === 0) return null;
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ ...locationLabelStyle, color: '#c084fc' }}>⬡ Region</label>
      <select
        value={config.regionId ?? ''}
        onChange={(e) => updateNodeConfig(nodeId, { regionId: e.target.value || undefined })}
        style={selectStyle}
      >
        <option value="">— No Region —</option>
        {regions.map((r) => {
          const rCfg = nodeConfigs[r.id] ?? {};
          return (
            <option key={r.id} value={r.id}>
              {rCfg.regionName ?? rCfg.label ?? r.id}
            </option>
          );
        })}
      </select>
    </div>
  );
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
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '16px',
            color: def?.color ?? 'var(--text)',
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
            color: 'var(--text)',
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
          color: def?.color ?? 'var(--text)',
          background: `${def?.color ?? 'var(--text)'}18`,
          border: `1px solid ${def?.color ?? 'var(--text)'}30`,
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
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', color: 'var(--accent-cyan)', lineHeight: 1 }}>⇢</span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text)',
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
            color: 'var(--text-dim)',
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
          color: 'var(--accent-cyan)',
          background: 'color-mix(in srgb, var(--accent-cyan) 9%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent-cyan) 19%, transparent)',
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
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 14px 10px',
          borderBottom: '1px solid var(--border)',
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
              color: 'var(--text-dim)',
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
              minHeight: 0,
              overflowY: 'auto',
              padding: '14px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--border) transparent',
            }}
          >
            <NodeNameField
              nodeId={selectedNodeId}
              label={selectedNode.type === 'comment' ? 'Title' : 'Name'}
            />
            <NodeLocationField nodeId={selectedNodeId} type={selectedNode.type as ComponentType} />
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
              minHeight: 0,
              overflowY: 'auto',
              padding: '14px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--border) transparent',
            }}
          >
            <EdgeInspector edgeId={selectedEdgeId} />
          </div>
        </>
      )}
    </div>
  );
}

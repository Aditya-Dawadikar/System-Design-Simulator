import type { Node, Edge } from 'reactflow';
import type { ArchitectureTemplate, NodeConfig, EdgeConfig } from '@/types';
import { COMPONENT_BY_TYPE, DEFAULT_EDGE_CONFIG } from '@/constants/components';

// ---------------------------------------------------------------------------
// Node IDs
// ---------------------------------------------------------------------------

const ID_TRAFFIC = 'default-traffic';
const ID_APP_SERVER = 'default-app-server';

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

const nodes: Node[] = [
  {
    id:       ID_TRAFFIC,
    type:     'traffic_generator',
    position: { x: 200, y: 100 },
    data:     { label: COMPONENT_BY_TYPE.traffic_generator.label },
  },
  {
    id:       ID_APP_SERVER,
    type:     'app_server',
    position: { x: 500, y: 100 },
    data:     { label: COMPONENT_BY_TYPE.app_server.label },
  },
];

// ---------------------------------------------------------------------------
// Node configs (derive from component defaults)
// ---------------------------------------------------------------------------

const nodeConfigs: Record<string, NodeConfig> = {
  [ID_TRAFFIC]:    { ...COMPONENT_BY_TYPE.traffic_generator.defaults, label: COMPONENT_BY_TYPE.traffic_generator.label },
  [ID_APP_SERVER]: { ...COMPONENT_BY_TYPE.app_server.defaults, label: COMPONENT_BY_TYPE.app_server.label },
};

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

function makeEdge(source: string, target: string): Edge {
  return {
    id:     `${source}->${target}`,
    source,
    target,
    type:   'wire',
  };
}

const edges: Edge[] = [
  makeEdge(ID_TRAFFIC, ID_APP_SERVER),
];

// ---------------------------------------------------------------------------
// Edge configs
// ---------------------------------------------------------------------------

const edgeConfigs: Record<string, EdgeConfig> = Object.fromEntries(
  edges.map((e) => [e.id, { ...DEFAULT_EDGE_CONFIG }])
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const DEFAULT_TEMPLATE: ArchitectureTemplate = {
  nodes,
  edges,
  nodeConfigs,
  edgeConfigs,
};

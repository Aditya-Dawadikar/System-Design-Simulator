import type { Node, Edge } from 'reactflow';
import type { ArchitectureTemplate, NodeConfig, EdgeConfig } from '@/types';
import { COMPONENT_BY_TYPE, DEFAULT_EDGE_CONFIG } from '@/constants/components';

// ---------------------------------------------------------------------------
// Node IDs
// ---------------------------------------------------------------------------

const ID_CDN  = 'default-cdn';
const ID_LB   = 'default-lb';
const ID_AS1  = 'default-as1';
const ID_AS2  = 'default-as2';
const ID_CACHE = 'default-cache';
const ID_DB   = 'default-db';

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

const nodes: Node[] = [
  {
    id:       ID_CDN,
    type:     'cdn',
    position: { x: 200, y: 100 },
    data:     { label: COMPONENT_BY_TYPE.cdn.label },
  },
  {
    id:       ID_LB,
    type:     'load_balancer',
    position: { x: 450, y: 100 },
    data:     { label: COMPONENT_BY_TYPE.load_balancer.label },
  },
  {
    id:       ID_AS1,
    type:     'app_server',
    position: { x: 700, y: 20 },
    data:     { label: `${COMPONENT_BY_TYPE.app_server.label} 1` },
  },
  {
    id:       ID_AS2,
    type:     'app_server',
    position: { x: 700, y: 180 },
    data:     { label: `${COMPONENT_BY_TYPE.app_server.label} 2` },
  },
  {
    id:       ID_CACHE,
    type:     'cache',
    position: { x: 950, y: 20 },
    data:     { label: COMPONENT_BY_TYPE.cache.label },
  },
  {
    id:       ID_DB,
    type:     'database',
    position: { x: 950, y: 180 },
    data:     { label: COMPONENT_BY_TYPE.database.label },
  },
];

// ---------------------------------------------------------------------------
// Node configs (derive from component defaults)
// ---------------------------------------------------------------------------

const nodeConfigs: Record<string, NodeConfig> = {
  [ID_CDN]:   { ...COMPONENT_BY_TYPE.cdn.defaults,           label: COMPONENT_BY_TYPE.cdn.label            },
  [ID_LB]:    { ...COMPONENT_BY_TYPE.load_balancer.defaults, label: COMPONENT_BY_TYPE.load_balancer.label  },
  [ID_AS1]:   { ...COMPONENT_BY_TYPE.app_server.defaults,    label: `${COMPONENT_BY_TYPE.app_server.label} 1` },
  [ID_AS2]:   { ...COMPONENT_BY_TYPE.app_server.defaults,    label: `${COMPONENT_BY_TYPE.app_server.label} 2` },
  [ID_CACHE]: { ...COMPONENT_BY_TYPE.cache.defaults,         label: COMPONENT_BY_TYPE.cache.label           },
  [ID_DB]:    { ...COMPONENT_BY_TYPE.database.defaults,      label: COMPONENT_BY_TYPE.database.label        },
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
  makeEdge(ID_CDN,   ID_LB),
  makeEdge(ID_LB,    ID_AS1),
  makeEdge(ID_LB,    ID_AS2),
  makeEdge(ID_AS1,   ID_CACHE),
  makeEdge(ID_AS1,   ID_DB),
  makeEdge(ID_AS2,   ID_CACHE),
  makeEdge(ID_AS2,   ID_DB),
  makeEdge(ID_CACHE, ID_DB),
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

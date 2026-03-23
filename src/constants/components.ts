import type { ComponentType, NodeConfig, EdgeConfig } from '@/types';

export interface ComponentDefinition {
  type: ComponentType;
  label: string;
  icon: string;
  color: string;
  description: string;
  defaults: NodeConfig;
}

export const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  {
    type: 'cdn',
    label: 'CDN Edge',
    icon: '◎',
    color: '#00ddff',
    description: 'Content delivery network',
    defaults: {
      pops: 2,
      cacheablePct: 60,
      bandwidthGbps: 100,
    },
  },
  {
    type: 'load_balancer',
    label: 'Load Balancer',
    icon: '⇌',
    color: '#ff55bb',
    description: 'Distributes incoming traffic',
    defaults: {
      algorithm: 'round_robin',
      healthChecks: true,
      maxConnections: 100000,
    },
  },
  {
    type: 'app_server',
    label: 'App Server',
    icon: '◈',
    color: '#00ff88',
    description: 'Application compute layer',
    defaults: {
      instances: 2,
      cpuCores: 4,
      ramGb: 8,
      rpsPerInstance: 500,
      avgLatencyMs: 40,
    },
  },
  {
    type: 'cache',
    label: 'Redis Cache',
    icon: '⚡',
    color: '#ff8833',
    description: 'In-memory key-value store',
    defaults: {
      memoryGb: 8,
      ttlSeconds: 60,
      evictionPolicy: 'lru',
      clusterMode: false,
    },
  },
  {
    type: 'database',
    label: 'PostgreSQL',
    icon: '▣',
    color: '#bb66ff',
    description: 'Persistent relational database',
    defaults: {
      engine: 'PostgreSQL',
      instanceType: 'db.m5.large',
      storageGb: 100,
      maxConnections: 200,
      readReplicas: 0,
      shards: 1,
      rpsPerShard: 800,
    },
  },
];

export const COMPONENT_BY_TYPE: Record<ComponentType, ComponentDefinition> =
  Object.fromEntries(
    COMPONENT_DEFINITIONS.map((c) => [c.type, c])
  ) as Record<ComponentType, ComponentDefinition>;

export const DEFAULT_EDGE_CONFIG: EdgeConfig = {
  protocol: 'REST',
  timeoutMs: 5000,
  retryCount: 2,
  circuitBreaker: false,
  circuitBreakerThreshold: 50,
  bandwidthMbps: 0,
};

export const RPS_PER_POP = 25000;
export const LB_RPS_MAX = 50000;
export const CACHE_RPS_MAX = 100000;

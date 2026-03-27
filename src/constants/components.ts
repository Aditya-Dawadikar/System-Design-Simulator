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
      minInstances: 1,
      maxInstances: 8,
      warmPoolSize: 1,
      scaleUpCpuPct: 75,
      scaleDownCpuPct: 25,
      scaleUpCooldownTicks: 4,
      scaleDownCooldownTicks: 12,
      coldProvisionTicks: 6,
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
  {
    type: 'cloud_storage',
    label: 'Cloud Storage',
    icon: '◫',
    color: '#38bdf8',
    description: 'Object storage buckets',
    defaults: {
      storageThroughputMbps: 1000,
      objectSizeKb: 512,
      storageClass: 'standard',
      storageGb: 1000,
    },
  },
  {
    type: 'block_storage',
    label: 'Block Storage',
    icon: '▤',
    color: '#d97706',
    description: 'Persistent block volume (NVMe/SSD/HDD)',
    defaults: {
      diskType: 'ssd',
      iops: 3000,
      storageGb: 100,
      objectSizeKb: 64,
    },
  },
  {
    type: 'network_storage',
    label: 'Network Storage',
    icon: '⊜',
    color: '#6366f1',
    description: 'Shared network file system (NFS/SMB/CephFS)',
    defaults: {
      nfsProtocol: 'nfs',
      storageThroughputMbps: 500,
      connectionLimit: 100,
      objectSizeKb: 64,
      storageGb: 1000,
    },
  },
  {
    type: 'pubsub',
    label: 'Pub/Sub',
    icon: '⊕',
    color: '#fb923c',
    description: 'Async message bus',
    defaults: {
      partitions: 4,
      messageRetentionHours: 24,
      maxMessageSizeKb: 10,
    },
  },
  {
    type: 'cloud_function',
    label: 'Cloud Function',
    icon: 'ƒ',
    color: '#a78bfa',
    description: 'Serverless compute',
    defaults: {
      functionMemoryMb: 256,
      maxConcurrency: 100,
      avgExecutionMs: 200,
    },
  },
  {
    type: 'cron_job',
    label: 'Cron Job',
    icon: '◷',
    color: '#34d399',
    description: 'Schedule-driven task emitter',
    defaults: {
      intervalMinutes: 5,
      tasksPerRun: 100,
    },
  },
  {
    type: 'traffic_generator',
    label: 'Traffic Generator',
    icon: '↯',
    color: '#f43f5e',
    description: 'Injects traffic at a configurable RPS',
    defaults: {
      generatorRps: 1000,
      generatorPattern: 'steady',
    },
  },
  {
    type: 'comment',
    label: 'Comment',
    icon: '//',
    color: '#f59e0b',
    description: 'Annotation node — no simulation effect',
    defaults: {
      commentBody: '',
    },
  },
  {
    type: 'worker_pool',
    label: 'Worker Pool',
    icon: '⚙',
    color: '#facc15',
    description: 'Parallel task processing pool',
    defaults: {
      workerCount: 4,
      threadCount: 4,
      taskDurationMs: 500,
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

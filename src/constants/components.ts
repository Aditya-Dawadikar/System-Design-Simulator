import type { ComponentType, NodeConfig, EdgeConfig, RateLimitAlgorithm } from '@/types';
export type { RateLimitAlgorithm };

export type ComponentScope = 'global' | 'regional' | 'zonal';

export interface ComponentDefinition {
  type: ComponentType;
  label: string;
  icon: string;
  color: string;
  description: string;
  defaults: NodeConfig;
  /**
   * AWS-style placement scope:
   *  global   — spans all regions (CDN, Traffic Generator, Comment)
   *  regional — lives in one region, spans AZs (Load Balancer, S3, Lambda…)
   *  zonal    — pinned to a single AZ (EC2/App Server, EBS, RDS instance…)
   */
  scope: ComponentScope;
}

export const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  // ── Global ────────────────────────────────────────────────────────────────
  // Spans all regions; not bound to any specific region or AZ.
  {
    type: 'cdn',
    label: 'CDN Edge',
    icon: '◎',
    color: '#00ddff',
    description: 'Content delivery network',
    scope: 'global',
    defaults: { pops: 2, cacheablePct: 60, bandwidthGbps: 100 },
  },
  {
    type: 'traffic_generator',
    label: 'Traffic Generator',
    icon: '↯',
    color: '#f43f5e',
    description: 'Injects traffic at a configurable RPS',
    scope: 'global',
    defaults: { generatorRps: 1000, generatorPattern: 'steady' },
  },
  {
    type: 'comment',
    label: 'Comment',
    icon: '//',
    color: '#f59e0b',
    description: 'Annotation node — no simulation effect',
    scope: 'global',
    defaults: { commentBody: '' },
  },

  // ── Regional ──────────────────────────────────────────────────────────────
  // Lives inside one region; automatically spans multiple AZs within that region.
  // AWS analogues: ALB/NLB, S3, SQS/SNS/Kinesis, Lambda, EventBridge.
  {
    type: 'load_balancer',
    label: 'Load Balancer',
    icon: '⇌',
    color: '#ff55bb',
    description: 'Regional — distributes traffic across AZs (ALB / NLB)',
    scope: 'regional',
    defaults: { algorithm: 'round_robin', healthChecks: true, maxConnections: 100000 },
  },
  {
    type: 'api_gateway',
    label: 'API Gateway',
    icon: '⊞',
    color: '#3b82f6',
    description: 'Regional — routes traffic to microservices by path/weight (API Gateway)',
    scope: 'regional',
    defaults: { gatewayAuthEnabled: false, gatewayAuthOverheadMs: 5, gatewayCacheEnabled: false, gatewayCacheHitPct: 30 },
  },
  {
    type: 'cloud_storage',
    label: 'Cloud Storage',
    icon: '◫',
    color: '#38bdf8',
    description: 'Regional — object storage replicated across AZs (S3)',
    scope: 'regional',
    defaults: { storageThroughputMbps: 1000, objectSizeKb: 512, storageClass: 'standard', storageGb: 1000 },
  },
  {
    type: 'pubsub',
    label: 'Pub/Sub',
    icon: '⊕',
    color: '#fb923c',
    description: 'Regional — async message bus replicated across AZs (SQS / Kinesis)',
    scope: 'regional',
    defaults: { partitions: 4, messageRetentionHours: 24, maxMessageSizeKb: 10 },
  },
  {
    type: 'cloud_function',
    label: 'Cloud Function',
    icon: 'ƒ',
    color: '#a78bfa',
    description: 'Regional — serverless compute, scheduler places across AZs (Lambda)',
    scope: 'regional',
    defaults: { functionMemoryMb: 256, maxConcurrency: 100, avgExecutionMs: 200 },
  },
  {
    type: 'rate_limiter',
    label: 'Rate Limiter',
    icon: '⊘',
    color: '#c026d3',
    description: 'Regional — throttles traffic across AZs',
    scope: 'regional',
    defaults: { rateLimitAlgorithm: 'token_bucket', requestsPerSecond: 1000, burstCapacity: 200, windowSizeMs: 1000, maxQueueSize: 500 },
  },
  {
    type: 'service_mesh',
    label: 'Service Mesh',
    icon: '⊛',
    color: '#22d3ee',
    description: 'Regional — control plane spans AZs; data plane sidecars are zonal (Istio / App Mesh)',
    scope: 'regional',
    defaults: { mtlsEnabled: true, observabilityLevel: 'basic', proxyOverheadMs: 2, meshRetryCount: 1, meshCircuitBreakerEnabled: false, meshCircuitBreakerThreshold: 50 },
  },
  {
    type: 'cron_job',
    label: 'Cron Job',
    icon: '◷',
    color: '#34d399',
    description: 'Regional — schedule-driven task emitter (EventBridge Scheduler)',
    scope: 'regional',
    defaults: { intervalMinutes: 5, tasksPerRun: 100 },
  },

  // ── Zonal ─────────────────────────────────────────────────────────────────
  // Pinned to a single AZ; fails with that AZ.
  // AWS analogues: EC2, ElastiCache node, RDS instance, EBS volume, EFS mount target.
  {
    type: 'app_server',
    label: 'App Server',
    icon: '◈',
    color: '#00ff88',
    description: 'Zonal — compute instance pinned to one AZ (EC2 / ECS task)',
    scope: 'zonal',
    defaults: {
      instances: 1, cpuCores: 4, ramGb: 8, rpsPerInstance: 500, avgLatencyMs: 40,
      minInstances: 1, maxInstances: 8, warmPoolSize: 1,
      scaleUpCpuPct: 75, scaleDownCpuPct: 25,
      scaleUpCooldownTicks: 4, scaleDownCooldownTicks: 12, coldProvisionTicks: 6,
    },
  },
  {
    type: 'cache',
    label: 'Redis Cache',
    icon: '⚡',
    color: '#ff8833',
    description: 'Zonal — in-memory cache node pinned to one AZ (ElastiCache node)',
    scope: 'zonal',
    defaults: { memoryGb: 8, ttlSeconds: 60, evictionPolicy: 'lru', clusterMode: false },
  },
  {
    type: 'database',
    label: 'PostgreSQL',
    icon: '▣',
    color: '#bb66ff',
    description: 'Zonal — primary or replica DB instance in a single AZ (RDS / Aurora)',
    scope: 'zonal',
    defaults: { engine: 'PostgreSQL', instanceType: 'db.m5.large', storageGb: 100, maxConnections: 200, readReplicas: 0, shards: 1, rpsPerShard: 800 },
  },
  {
    type: 'block_storage',
    label: 'Block Storage',
    icon: '▤',
    color: '#d97706',
    description: 'Zonal — block volume attached to one AZ (EBS)',
    scope: 'zonal',
    defaults: { diskType: 'ssd', iops: 3000, storageGb: 100, objectSizeKb: 64 },
  },
  {
    type: 'network_storage',
    label: 'Network Storage',
    icon: '⊜',
    color: '#6366f1',
    description: 'Zonal — NFS/SMB mount target in one AZ (EFS mount target)',
    scope: 'zonal',
    defaults: { nfsProtocol: 'nfs', storageThroughputMbps: 500, connectionLimit: 100, objectSizeKb: 64, storageGb: 1000 },
  },
  {
    type: 'worker_pool',
    label: 'Worker Pool',
    icon: '⚙',
    color: '#facc15',
    description: 'Zonal — EC2-backed worker fleet in one AZ',
    scope: 'zonal',
    defaults: { workerCount: 4, threadCount: 4, taskDurationMs: 500 },
  },

  // ── Global infrastructure ─────────────────────────────────────────────────
  {
    type: 'global_accelerator',
    label: 'Global Accelerator',
    icon: '⊙',
    color: '#818cf8',
    description: 'Global — anycast routing across regions with health-aware failover (AWS Global Accelerator / GCP GLB)',
    scope: 'global',
    defaults: { routingPolicy: 'latency', failoverEnabled: true },
  },

  // ── Infrastructure containers ─────────────────────────────────────────────
  {
    type: 'region',
    label: 'Region',
    icon: '⬡',
    color: '#c084fc',
    description: 'Cloud region — groups availability zones (e.g. us-east-1)',
    scope: 'global',
    defaults: { regionName: 'us-east-1', containerWidth: 900, containerHeight: 560 },
  },
  {
    type: 'availability_zone',
    label: 'Availability Zone',
    icon: '◎',
    color: '#67e8f9',
    description: 'Isolated failure domain within a region (e.g. us-east-1a)',
    scope: 'global',
    defaults: { zoneName: 'us-east-1a', zoneFailed: false, containerWidth: 380, containerHeight: 440 },
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

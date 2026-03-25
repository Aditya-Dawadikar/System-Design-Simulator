export type ComponentType =
  | 'cdn'
  | 'load_balancer'
  | 'app_server'
  | 'cache'
  | 'database'
  | 'cloud_storage'
  | 'pubsub'
  | 'cloud_function'
  | 'cron_job'
  | 'worker_pool'
  | 'comment'
  | 'traffic_generator';

export type TrafficPattern = 'steady' | 'ramp' | 'spike' | 'wave' | 'chaos';

export type LoadBalancerAlgorithm =
  | 'round_robin'
  | 'least_conn'
  | 'ip_hash'
  | 'random'
  | 'weighted';

export type NodeStatus = 'idle' | 'ok' | 'stressed' | 'critical' | 'failed';

export interface NodeMetrics {
  rpsIn: number;
  rpsOut: number;
  load: number;
  latencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  failed: boolean;
}

export interface EdgeMetrics {
  rps: number;
  latencyMs: number;
  isBottleneck: boolean;
}

export interface NodeConfig {
  label?: string;
  // CDN
  pops?: number;
  cacheablePct?: number;
  bandwidthGbps?: number;
  // Load Balancer
  algorithm?: LoadBalancerAlgorithm;
  healthChecks?: boolean;
  maxConnections?: number;
  // App Server
  instances?: number;
  cpuCores?: number;
  ramGb?: number;
  rpsPerInstance?: number;
  avgLatencyMs?: number;
  // Cache
  memoryGb?: number;
  ttlSeconds?: number;
  evictionPolicy?: 'lru' | 'lfu' | 'noeviction';
  clusterMode?: boolean;
  // Database
  instanceType?: string;
  storageGb?: number;
  readReplicas?: number;
  shards?: number;
  rpsPerShard?: number;
  engine?: 'PostgreSQL' | 'MySQL' | 'MongoDB' | 'Redis' | 'Cassandra';
  // Cloud Storage
  storageThroughputMbps?: number;
  objectSizeKb?: number;
  storageClass?: 'standard' | 'nearline' | 'coldline' | 'archive';
  // Pub/Sub
  partitions?: number;
  messageRetentionHours?: number;
  maxMessageSizeKb?: number;
  // Cloud Function
  functionMemoryMb?: number;
  maxConcurrency?: number;
  avgExecutionMs?: number;
  // Cron Job (schedule-driven source node)
  intervalMinutes?: number;   // how often the job fires
  tasksPerRun?: number;       // tasks generated each run
  // Worker Pool
  workerCount?: number;       // number of worker processes
  threadCount?: number;       // threads per worker
  taskDurationMs?: number;    // time a single thread takes per task (ms)
  // Comment / Annotation
  commentBody?: string;
  // Traffic Generator
  generatorRps?: number;
  generatorPattern?: TrafficPattern;
}

export interface EdgeConfig {
  protocol: 'REST' | 'gRPC' | 'TCP' | 'WebSocket';
  timeoutMs: number;
  retryCount: number;
  circuitBreaker: boolean;
  circuitBreakerThreshold: number;
  bandwidthMbps: number;
  splitPct?: number; // 0-100; undefined = auto equal-split
}

export interface LogEvent {
  tick: number;
  level: 'info' | 'warn' | 'error' | 'k8s';
  message: string;
  nodeId?: string;
}

export interface ArchitectureTemplate {
  nodes: import('reactflow').Node[];
  edges: import('reactflow').Edge[];
  nodeConfigs: Record<string, NodeConfig>;
  edgeConfigs: Record<string, EdgeConfig>;
}

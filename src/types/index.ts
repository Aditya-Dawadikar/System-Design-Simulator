export type ComponentType =
  | 'cdn'
  | 'load_balancer'
  | 'app_server'
  | 'cache'
  | 'database'
  | 'cloud_storage'
  | 'block_storage'
  | 'network_storage'
  | 'pubsub'
  | 'cloud_function'
  | 'cron_job'
  | 'worker_pool'
  | 'comment'
  | 'traffic_generator'
  | 'rate_limiter';

export type RateLimitAlgorithm =
  | 'token_bucket'
  | 'leaky_bucket'
  | 'fixed_window'
  | 'sliding_window'
  | 'sliding_log';

export type TrafficPattern = 'steady' | 'ramp' | 'spike' | 'wave' | 'chaos';

export type WorkloadType = 'cpu_bound' | 'io_bound' | 'memory_bound';

export type LoadBalancerAlgorithm =
  | 'round_robin'
  | 'least_conn'
  | 'ip_hash'
  | 'random'
  | 'weighted';

export type NodeStatus = 'idle' | 'ok' | 'stressed' | 'critical' | 'failed';

// ---------------------------------------------------------------------------
// Per-component detail metrics (discriminated union keyed by `kind`)
// ---------------------------------------------------------------------------

export type ComponentDetail =
  | { kind: 'cdn';            cacheHitRate: number; originBypassRps: number; bandwidthGbps: number }
  | { kind: 'load_balancer';  activeConnections: number; scalingEvent: boolean; connectionsPerSecond: number }
  | { kind: 'app_server';
      cpuPct: number;
      memPct: number;
      activeInstances: number;
      pendingInstances: number;   // cold instances still provisioning
      pendingCountdown: number;   // ticks until pending are ready
      warmReserve: number;        // warm-pool slots currently available
      scalingEvent: 'up-warm' | 'up-cold' | 'down' | null;
      scaleUpCooldown: number;    // ticks remaining before next scale-up allowed
      scaleDownCooldown: number;  // ticks remaining before next scale-down allowed
    }
  | { kind: 'cache';          hitRate: number; evictionRate: number; memoryUsedPct: number }
  | { kind: 'database';       connectionPoolUsed: number; connectionPoolMax: number; queryQueueDepth: number; slowQueryRate: number }
  | { kind: 'cloud_storage';  throttledRequests: number; bandwidthUtilization: number }
  | { kind: 'block_storage';  iopsUsed: number; iopsLimit: number; queueDepth: number; throughputMbps: number }
  | { kind: 'network_storage'; activeConnections: number; bandwidthUsedMbps: number; throughputLimitMbps: number }
  | { kind: 'pubsub';         subscriberLagMs: number; consumerThroughput: number; unackedMessages: number }
  | { kind: 'cloud_function'; coldStarts: number; throttledInvocations: number; concurrencyUsed: number }
  | { kind: 'cron_job';       overlapCount: number; lastRunDurationMs: number }
  | { kind: 'worker_pool';    queueDepth: number; workerUtilization: number; taskBacklogMs: number }
  | { kind: 'rate_limiter';  allowedRps: number; throttledRps: number; throttleRate: number; queueDepth: number };

export interface NodeMetrics {
  rpsIn: number;
  rpsOut: number;
  load: number;
  latencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  failed: boolean;
  /** Fraction of rpsIn that is read traffic (0–1). Propagated from traffic generators. */
  readRatio: number;
  /** Derived: rpsIn * readRatio */
  readRpsIn: number;
  /** Derived: rpsIn * (1 - readRatio) */
  writeRpsIn: number;
  /** Database only: load on read path (read rps / read capacity) */
  readLoad?: number;
  /** Database only: load on write path (write rps / write capacity) */
  writeLoad?: number;
  /** Component-specific failure/scaling detail metrics */
  detail?: ComponentDetail;
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
  workloadType?: WorkloadType;
  // Autoscaling (app_server)
  autoscalingEnabled?: boolean;    // master toggle — default false
  warmPoolEnabled?: boolean;       // warm replica toggle — default false
  minInstances?: number;           // floor — always running
  maxInstances?: number;           // ceiling — never exceed
  warmPoolSize?: number;           // pre-provisioned instances, scale instantly (0-latency)
  scaleUpCpuPct?: number;          // CPU % that triggers a scale-out (default 75)
  scaleDownCpuPct?: number;        // CPU % that triggers a scale-in  (default 25)
  scaleUpCooldownTicks?: number;   // ticks between scale-up events   (default 4 = 2 s)
  scaleDownCooldownTicks?: number; // ticks before a scale-in fires   (default 12 = 6 s)
  coldProvisionTicks?: number;     // ticks to provision a cold instance (default 6 = 3 s)
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
  // Block Storage
  diskType?: 'nvme' | 'ssd' | 'hdd';
  iops?: number;                   // IOPS limit (default 3000)
  // Network Storage
  nfsProtocol?: 'nfs' | 'smb' | 'cephfs';
  connectionLimit?: number;        // max simultaneous mounts
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
  /** 0–100: percentage of traffic that is reads. Default 50. */
  readRatioPct?: number;
  // Rate Limiter
  rateLimitAlgorithm?: RateLimitAlgorithm;
  requestsPerSecond?: number;   // allowed RPS (default 1000)
  burstCapacity?: number;       // extra requests allowed in burst window (default 200)
  windowSizeMs?: number;        // window size for window-based algorithms (default 1000)
  maxQueueSize?: number;        // max requests held in queue before dropping (default 500)
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

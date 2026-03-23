export type ComponentType =
  | 'cdn'
  | 'load_balancer'
  | 'app_server'
  | 'cache'
  | 'database';

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
}

export interface EdgeConfig {
  protocol: 'REST' | 'gRPC' | 'TCP' | 'WebSocket';
  timeoutMs: number;
  retryCount: number;
  circuitBreaker: boolean;
  circuitBreakerThreshold: number;
  bandwidthMbps: number;
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

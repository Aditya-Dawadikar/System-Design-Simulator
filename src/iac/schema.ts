/**
 * src/iac/schema.ts
 *
 * TypeScript types and Zod validation schemas for the simulator YAML DSL.
 * This module has no React imports and no side effects — pure types + schema.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enum literals (must match src/types/index.ts exactly)
// ---------------------------------------------------------------------------

export const COMPONENT_TYPES = [
  'cdn', 'load_balancer', 'api_gateway', 'app_server', 'cache', 'database',
  'cloud_storage', 'block_storage', 'network_storage', 'pubsub', 'cloud_function',
  'cron_job', 'worker_pool', 'comment', 'traffic_generator', 'rate_limiter',
  'service_mesh', 'region', 'availability_zone', 'global_accelerator',
  'nat_gateway', 'firewall', 'public_subnet', 'private_subnet',
] as const;

export const TRAFFIC_PATTERNS = ['steady', 'ramp', 'spike', 'wave', 'chaos'] as const;
export const AUTOSCALING_STRATEGIES = ['threshold', 'target_tracking', 'scheduled', 'predictive'] as const;
export const TARGET_TRACKING_METRICS = ['load', 'cpu', 'rps_per_instance'] as const;
export const WORKLOAD_TYPES = ['cpu_bound', 'io_bound', 'memory_bound'] as const;
export const EDGE_PROTOCOLS = ['REST', 'gRPC', 'TCP', 'WebSocket'] as const;
export const LB_ALGORITHMS = ['round_robin', 'least_conn', 'ip_hash', 'random', 'weighted'] as const;

// ---------------------------------------------------------------------------
// Scope classification sets (derived from ComponentDefinition.scope)
// ---------------------------------------------------------------------------

/** Types that live in a single AZ and fail with it. */
export const ZONAL_COMPONENT_TYPES = new Set([
  'app_server', 'cache', 'database', 'block_storage', 'network_storage', 'worker_pool',
]);

/** Types that live in one region and span AZs within it. */
export const REGIONAL_COMPONENT_TYPES = new Set([
  'load_balancer', 'api_gateway', 'cloud_storage', 'pubsub', 'cloud_function',
  'rate_limiter', 'service_mesh', 'cron_job', 'nat_gateway', 'firewall',
]);

/** Infrastructure container types — declared in regions[], not resources[]. */
export const CONTAINER_COMPONENT_TYPES = new Set([
  'region', 'availability_zone', 'public_subnet', 'private_subnet',
]);

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const IacAutoscalingSchema = z.object({
  enabled: z.boolean(),
  strategy: z.enum(AUTOSCALING_STRATEGIES).optional(),
  minInstances: z.number().int().positive().optional(),
  maxInstances: z.number().int().positive().optional(),
  warmPoolEnabled: z.boolean().optional(),
  warmPoolSize: z.number().int().nonnegative().optional(),
  // threshold strategy
  scaleUpCpuPct: z.number().min(0).max(100).optional(),
  scaleDownCpuPct: z.number().min(0).max(100).optional(),
  scaleUpCooldownTicks: z.number().int().nonnegative().optional(),
  scaleDownCooldownTicks: z.number().int().nonnegative().optional(),
  coldProvisionTicks: z.number().int().nonnegative().optional(),
  scaleDownDrainTicks: z.number().int().nonnegative().optional(),
  // target_tracking strategy
  targetMetric: z.enum(TARGET_TRACKING_METRICS).optional(),
  targetValue: z.number().min(0).optional(),
  ttScaleOutCooldownTicks: z.number().int().nonnegative().optional(),
  ttScaleInCooldownTicks: z.number().int().nonnegative().optional(),
  // predictive strategy
  predictiveLookbackTicks: z.number().int().positive().optional(),
  predictiveLookaheadTicks: z.number().int().positive().optional(),
  predictiveScalingBuffer: z.number().min(0).optional(),
});

/** deploy block — compute-specific runtime settings */
export const IacDeploySchema = z.object({
  // App Server
  instances: z.number().int().positive().optional(),
  cpuCores: z.number().positive().optional(),
  ramGb: z.number().positive().optional(),
  rpsPerInstance: z.number().positive().optional(),
  avgLatencyMs: z.number().nonnegative().optional(),
  workloadType: z.enum(WORKLOAD_TYPES).optional(),
  // Cloud Function
  functionMemoryMb: z.number().positive().optional(),
  maxConcurrency: z.number().int().positive().optional(),
  avgExecutionMs: z.number().positive().optional(),
  // Worker Pool
  workerCount: z.number().int().positive().optional(),
  threadCount: z.number().int().positive().optional(),
  taskDurationMs: z.number().positive().optional(),
  // Autoscaling (app_server only)
  autoscaling: IacAutoscalingSchema.optional(),
});

/** placement block — determines where the resource lives */
export const IacPlacementSchema = z.object({
  scope: z.enum(['global', 'region', 'zone']).optional(),
  region: z.string().optional(),
  zone: z.string().optional(),
});

/** A single resource entry inside resources[] */
export const IacResourceSchema = z.object({
  id: z.string().min(1, 'Resource id must not be empty'),
  type: z.enum(COMPONENT_TYPES, { error: 'Unknown component type' }),
  label: z.string().optional(),
  placement: IacPlacementSchema.optional(),
  /** config fields for non-compute types (maps directly to NodeConfig) */
  spec: z.record(z.string(), z.unknown()).optional(),
  /** runtime/deployment fields for compute types */
  deploy: IacDeploySchema.optional(),
});

/** An edge between two resources */
export const IacConnectionSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  protocol: z.enum(EDGE_PROTOCOLS).optional(),
  timeoutMs: z.number().positive().optional(),
  retryCount: z.number().int().nonnegative().optional(),
  circuitBreaker: z.boolean().optional(),
  circuitBreakerThreshold: z.number().min(0).max(100).optional(),
  bandwidthMbps: z.number().nonnegative().optional(),
  splitPct: z.number().min(0).max(100).optional(),
  readSplitPct: z.number().min(0).max(100).optional(),
  writeSplitPct: z.number().min(0).max(100).optional(),
});

export const IacZoneSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const IacRegionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  zones: z.array(IacZoneSchema).optional(),
});

export const IacGlobalsSchema = z.object({
  peakRps: z.number().positive().optional(),
  trafficPattern: z.enum(TRAFFIC_PATTERNS).optional(),
});

export const IacScenarioSchema = z.object({
  type: z.string().min(1),
  target: z.string().optional(),
  enabled: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Service / Deployment schemas
// ---------------------------------------------------------------------------

/** One edge-type dependency declared on a service (→ IaC connections between service replicas). */
export const IacServiceDependencySchema = z.object({
  service: z.string().min(1),
  protocol: z.enum(EDGE_PROTOCOLS).optional(),
  splitPct: z.number().min(0).max(100).optional(),
  readSplitPct: z.number().min(0).max(100).optional(),
  writeSplitPct: z.number().min(0).max(100).optional(),
});

/** Healing policy for a service — stored in NodeConfig; engine integration is future work. */
export const IacHealingPolicySchema = z.object({
  enabled: z.boolean(),
  restartPolicy: z.enum(['always', 'on-failure', 'never']).optional(),
});

/**
 * A logical service definition.  Each service is a named, typed unit whose
 * config (spec / deploy / autoscaling) is shared across every replica created
 * by a matching deployment entry.
 */
export const IacServiceSchema = z.object({
  id: z.string().min(1),
  type: z.enum(COMPONENT_TYPES, { error: 'Unknown component type' }),
  label: z.string().optional(),
  /** Config fields for non-compute types (maps directly to NodeConfig). */
  spec: z.record(z.string(), z.unknown()).optional(),
  /** Runtime/deployment fields for compute types (app_server, worker_pool, cloud_function). */
  deploy: IacDeploySchema.optional(),
  /** Other services this service depends on (creates edges between their replicas). */
  dependencies: z.array(IacServiceDependencySchema).optional(),
  /** Auto-healing configuration (stored; simulation engine integration is future). */
  healing: IacHealingPolicySchema.optional(),
});

/** One replica placement — used in the `replicas[]` array of a deployment. */
export const IacReplicaSpecSchema = z.object({
  zone: z.string().optional(),
  region: z.string().optional(),
});

/**
 * A deployment instantiates a service across one or more zones / regions.
 * Each zone/region entry produces exactly one canvas node with ID `{serviceId}-{zoneId}`.
 * `replicas[]` supports the database primary/replica pattern: primary comes from
 * `zones[]`; replicas come from `replicas[]`.
 */
export const IacDeploymentSchema = z.object({
  service: z.string().min(1),
  /** Zones to deploy to (for zonal component types: app_server, cache, database, …). */
  zones: z.array(z.string().min(1)).optional(),
  /** Regions to deploy to (for regional component types: load_balancer, pubsub, …). */
  regions: z.array(z.string().min(1)).optional(),
  /** Database replica zones — each creates a replica node pointing to the first zones[] entry. */
  replicas: z.array(IacReplicaSpecSchema).optional(),
});

// ---------------------------------------------------------------------------
// Root document schema
// ---------------------------------------------------------------------------

export const IacDocumentSchema = z.object({
  version: z.literal(1, { error: 'version must be 1' }),
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  globals: IacGlobalsSchema.optional(),
  regions: z.array(IacRegionSchema).optional(),
  /** Standalone resources (original DSL).  Defaults to [] so service-only YAMLs can omit this key. */
  resources: z.array(IacResourceSchema).default([]),
  connections: z.array(IacConnectionSchema).optional(),
  /** Logical service definitions (K8s-style abstraction). */
  services: z.array(IacServiceSchema).optional(),
  /** Deployment instantiations — each entry maps a service to zones / regions / replicas. */
  deployments: z.array(IacDeploymentSchema).optional(),
  scenarios: z.array(IacScenarioSchema).optional(),
});

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type IacDocument = z.infer<typeof IacDocumentSchema>;
export type IacResource = z.infer<typeof IacResourceSchema>;
export type IacConnection = z.infer<typeof IacConnectionSchema>;
export type IacRegion = z.infer<typeof IacRegionSchema>;
export type IacZone = z.infer<typeof IacZoneSchema>;
export type IacPlacement = z.infer<typeof IacPlacementSchema>;
export type IacDeploy = z.infer<typeof IacDeploySchema>;
export type IacAutoscaling = z.infer<typeof IacAutoscalingSchema>;
export type IacGlobals = z.infer<typeof IacGlobalsSchema>;
export type IacScenario = z.infer<typeof IacScenarioSchema>;
// Service / Deployment types
export type IacService = z.infer<typeof IacServiceSchema>;
export type IacDeployment = z.infer<typeof IacDeploymentSchema>;
export type IacServiceDependency = z.infer<typeof IacServiceDependencySchema>;
export type IacHealingPolicy = z.infer<typeof IacHealingPolicySchema>;
export type IacReplicaSpec = z.infer<typeof IacReplicaSpecSchema>;

// ---------------------------------------------------------------------------
// ValidationIssue — shared result type for validate.ts
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  /** e.g. "resources[2].placement.zone" */
  path?: string;
  line?: number;
}

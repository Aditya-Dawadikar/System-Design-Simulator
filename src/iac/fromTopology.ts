/**
 * src/iac/fromTopology.ts
 *
 * Exports the current canvas topology (nodes + edges + configs) back into
 * an IacDocument, which can then be serialized to YAML with toYaml().
 *
 * Attempts a clean, minimal export:
 *   - Fields equal to their ComponentDefinition default are omitted
 *   - The autoscaling block is reconstructed from flat NodeConfig fields
 *   - Region and AZ nodes are extracted into the regions[] section
 *
 * Pure module — no React imports, no store imports.
 */

import yaml from 'js-yaml';
import type { Node, Edge } from 'reactflow';
import type { NodeConfig, EdgeConfig } from '@/types';
import { COMPONENT_BY_TYPE, DEFAULT_EDGE_CONFIG } from '@/constants/components';
import { CONTAINER_COMPONENT_TYPES } from './schema';
import type {
  IacDocument, IacResource, IacRegion, IacZone,
  IacConnection, IacDeploy, IacAutoscaling,
} from './schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopologyInput {
  nodes: Node[];
  edges: Edge[];
  nodeConfigs: Record<string, NodeConfig>;
  edgeConfigs: Record<string, EdgeConfig>;
}

export interface ExportMeta {
  name?: string;
  description?: string;
  peakRps?: number;
  trafficPattern?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert current topology state into an IacDocument.
 */
export function fromTopology(input: TopologyInput, meta: ExportMeta = {}): IacDocument {
  const { nodes, edges, nodeConfigs, edgeConfigs } = input;

  // --- Index nodes by id and type ---
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // --- Extract region nodes ---
  const regionNodes = nodes.filter((n) => n.type === 'region');
  const zoneNodes = nodes.filter((n) => n.type === 'availability_zone');
  const resourceNodes = nodes.filter(
    (n) => n.type && !CONTAINER_COMPONENT_TYPES.has(n.type),
  );

  // Build region→zone map
  const zonesByRegion = new Map<string, Node[]>();
  for (const zone of zoneNodes) {
    const cfg = nodeConfigs[zone.id] ?? {};
    const regionId = cfg.regionId;
    if (regionId) {
      const list = zonesByRegion.get(regionId) ?? [];
      list.push(zone);
      zonesByRegion.set(regionId, list);
    }
  }

  // --- Build regions[] ---
  const regions: IacRegion[] = regionNodes.map((rNode) => {
    const cfg = nodeConfigs[rNode.id] ?? {};
    const regionLabel = cfg.regionName ?? cfg.label ?? rNode.id;

    const zones: IacZone[] = (zonesByRegion.get(rNode.id) ?? []).map((zNode) => {
      const zCfg = nodeConfigs[zNode.id] ?? {};
      return {
        id: zNode.id,
        label: zCfg.zoneName ?? zCfg.label ?? zNode.id,
      };
    });

    return {
      id: rNode.id,
      label: regionLabel,
      ...(zones.length > 0 ? { zones } : {}),
    };
  });

  // --- Build resources[] ---
  const resources: IacResource[] = resourceNodes.map((rNode) => {
    const type = rNode.type!;
    const cfg = nodeConfigs[rNode.id] ?? {};
    const def = COMPONENT_BY_TYPE[type as keyof typeof COMPONENT_BY_TYPE];

    // Placement
    const placement = buildPlacement(cfg, def?.scope);

    // Spec vs deploy split
    const { spec, deploy } = splitConfig(type, cfg, def?.defaults ?? {});

    const resource: IacResource = {
      id: rNode.id,
      type: type as IacResource['type'],
      label: cfg.label !== (def?.label ?? rNode.id) ? cfg.label : undefined,
    };

    if (placement) resource.placement = placement;
    if (spec && Object.keys(spec).length > 0) resource.spec = spec;
    if (deploy && hasDeployContent(deploy)) resource.deploy = deploy;

    return resource;
  });

  // --- Build connections[] ---
  const connections: IacConnection[] = edges
    .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
    .map((e) => {
      const eCfg = edgeConfigs[e.id] ?? DEFAULT_EDGE_CONFIG;
      return buildConnection(e.source, e.target, eCfg);
    });

  // --- Assemble document ---
  const doc: IacDocument = {
    version: 1,
    name: meta.name ?? 'exported-topology',
    ...(meta.description ? { description: meta.description } : {}),
    ...(meta.peakRps || meta.trafficPattern
      ? {
          globals: {
            ...(meta.peakRps ? { peakRps: meta.peakRps } : {}),
            ...(meta.trafficPattern ? { trafficPattern: meta.trafficPattern as IacDocument['globals'] extends { trafficPattern?: infer T } ? T : never } : {}),
          },
        }
      : {}),
    ...(regions.length > 0 ? { regions } : {}),
    resources,
    ...(connections.length > 0 ? { connections } : {}),
  };

  return doc;
}

/**
 * Serialize an IacDocument to a YAML string.
 */
export function toYaml(doc: IacDocument): string {
  return yaml.dump(doc, {
    indent: 2,
    noRefs: true,
    lineWidth: 120,
    // Preserve insertion order (default for yaml.dump)
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildPlacement(
  cfg: NodeConfig,
  scope: 'global' | 'regional' | 'zonal' | undefined,
): IacResource['placement'] | undefined {
  if (scope === 'zonal' && cfg.zoneId) return { zone: cfg.zoneId };
  if (scope === 'regional' && cfg.regionId) return { region: cfg.regionId };
  if (scope === 'global') return undefined;
  // Fallback: check what IDs are set
  if (cfg.zoneId) return { zone: cfg.zoneId };
  if (cfg.regionId) return { region: cfg.regionId };
  return undefined;
}

/** NodeConfig fields that belong in deploy (compute-specific runtime config) */
const DEPLOY_FIELDS = new Set([
  'instances', 'cpuCores', 'ramGb', 'rpsPerInstance', 'avgLatencyMs', 'workloadType',
  'functionMemoryMb', 'maxConcurrency', 'avgExecutionMs',
  'workerCount', 'threadCount', 'taskDurationMs',
  // Autoscaling (flattened) — handled separately in extractAutoscaling
  'autoscalingEnabled', 'autoscalingStrategy', 'warmPoolEnabled', 'warmPoolSize',
  'minInstances', 'maxInstances',
  'scaleUpCpuPct', 'scaleDownCpuPct', 'scaleUpCooldownTicks', 'scaleDownCooldownTicks',
  'coldProvisionTicks', 'scaleDownDrainTicks',
  'targetMetric', 'targetValue', 'ttScaleOutCooldownTicks', 'ttScaleInCooldownTicks',
  'predictiveLookbackTicks', 'predictiveLookaheadTicks', 'predictiveScalingBuffer',
]);

/** NodeConfig fields that are internal (placement, sizing, meta) and should not be exported */
const SKIP_FIELDS = new Set([
  'label', 'zoneId', 'regionId', 'containerWidth', 'containerHeight',
  'regionName', 'zoneName', 'zoneFailed', 'regionFailed',
  // Autoscaling — handled via deploy.autoscaling block
  'autoscalingEnabled', 'autoscalingStrategy', 'warmPoolEnabled', 'warmPoolSize',
  'minInstances', 'maxInstances',
  'scaleUpCpuPct', 'scaleDownCpuPct', 'scaleUpCooldownTicks', 'scaleDownCooldownTicks',
  'coldProvisionTicks', 'scaleDownDrainTicks',
  'targetMetric', 'targetValue', 'ttScaleOutCooldownTicks', 'ttScaleInCooldownTicks',
  'predictiveLookbackTicks', 'predictiveLookaheadTicks', 'predictiveScalingBuffer',
]);

/** Compute types that use a deploy block */
const COMPUTE_TYPES = new Set(['app_server', 'cloud_function', 'worker_pool']);

function splitConfig(
  type: string,
  cfg: NodeConfig,
  defaults: NodeConfig,
): { spec?: Record<string, unknown>; deploy?: IacDeploy } {
  const spec: Record<string, unknown> = {};
  const deployBase: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(cfg)) {
    if (SKIP_FIELDS.has(key)) continue;

    // Skip if value equals the component default
    const defVal = (defaults as Record<string, unknown>)[key];
    if (defVal !== undefined && defVal === value) continue;

    if (DEPLOY_FIELDS.has(key)) {
      deployBase[key] = value;
    } else {
      spec[key] = value;
    }
  }

  // Reconstruct autoscaling sub-block
  const autoscaling = extractAutoscaling(cfg);

  if (COMPUTE_TYPES.has(type)) {
    const deploy: IacDeploy = {};
    if (deployBase.instances !== undefined) deploy.instances = deployBase.instances as number;
    if (deployBase.cpuCores !== undefined) deploy.cpuCores = deployBase.cpuCores as number;
    if (deployBase.ramGb !== undefined) deploy.ramGb = deployBase.ramGb as number;
    if (deployBase.rpsPerInstance !== undefined) deploy.rpsPerInstance = deployBase.rpsPerInstance as number;
    if (deployBase.avgLatencyMs !== undefined) deploy.avgLatencyMs = deployBase.avgLatencyMs as number;
    if (deployBase.workloadType !== undefined) deploy.workloadType = deployBase.workloadType as IacDeploy['workloadType'];
    if (deployBase.functionMemoryMb !== undefined) deploy.functionMemoryMb = deployBase.functionMemoryMb as number;
    if (deployBase.maxConcurrency !== undefined) deploy.maxConcurrency = deployBase.maxConcurrency as number;
    if (deployBase.avgExecutionMs !== undefined) deploy.avgExecutionMs = deployBase.avgExecutionMs as number;
    if (deployBase.workerCount !== undefined) deploy.workerCount = deployBase.workerCount as number;
    if (deployBase.threadCount !== undefined) deploy.threadCount = deployBase.threadCount as number;
    if (deployBase.taskDurationMs !== undefined) deploy.taskDurationMs = deployBase.taskDurationMs as number;
    if (autoscaling) deploy.autoscaling = autoscaling;
    return { spec: Object.keys(spec).length > 0 ? spec : undefined, deploy };
  }

  return { spec: Object.keys(spec).length > 0 ? spec : undefined };
}

function extractAutoscaling(cfg: NodeConfig): IacAutoscaling | undefined {
  if (!cfg.autoscalingEnabled) return undefined;

  const as: IacAutoscaling = { enabled: true };
  if (cfg.autoscalingStrategy) as.strategy = cfg.autoscalingStrategy;
  if (cfg.minInstances !== undefined) as.minInstances = cfg.minInstances;
  if (cfg.maxInstances !== undefined) as.maxInstances = cfg.maxInstances;
  if (cfg.warmPoolEnabled !== undefined) as.warmPoolEnabled = cfg.warmPoolEnabled;
  if (cfg.warmPoolSize !== undefined) as.warmPoolSize = cfg.warmPoolSize;
  if (cfg.scaleUpCpuPct !== undefined) as.scaleUpCpuPct = cfg.scaleUpCpuPct;
  if (cfg.scaleDownCpuPct !== undefined) as.scaleDownCpuPct = cfg.scaleDownCpuPct;
  if (cfg.scaleUpCooldownTicks !== undefined) as.scaleUpCooldownTicks = cfg.scaleUpCooldownTicks;
  if (cfg.scaleDownCooldownTicks !== undefined) as.scaleDownCooldownTicks = cfg.scaleDownCooldownTicks;
  if (cfg.coldProvisionTicks !== undefined) as.coldProvisionTicks = cfg.coldProvisionTicks;
  if (cfg.scaleDownDrainTicks !== undefined) as.scaleDownDrainTicks = cfg.scaleDownDrainTicks;
  if (cfg.targetMetric !== undefined) as.targetMetric = cfg.targetMetric;
  if (cfg.targetValue !== undefined) as.targetValue = cfg.targetValue;
  if (cfg.ttScaleOutCooldownTicks !== undefined) as.ttScaleOutCooldownTicks = cfg.ttScaleOutCooldownTicks;
  if (cfg.ttScaleInCooldownTicks !== undefined) as.ttScaleInCooldownTicks = cfg.ttScaleInCooldownTicks;
  if (cfg.predictiveLookbackTicks !== undefined) as.predictiveLookbackTicks = cfg.predictiveLookbackTicks;
  if (cfg.predictiveLookaheadTicks !== undefined) as.predictiveLookaheadTicks = cfg.predictiveLookaheadTicks;
  if (cfg.predictiveScalingBuffer !== undefined) as.predictiveScalingBuffer = cfg.predictiveScalingBuffer;

  return as;
}

function buildConnection(from: string, to: string, eCfg: EdgeConfig): IacConnection {
  const conn: IacConnection = { from, to };
  if (eCfg.protocol && eCfg.protocol !== DEFAULT_EDGE_CONFIG.protocol) conn.protocol = eCfg.protocol;
  if (eCfg.timeoutMs !== DEFAULT_EDGE_CONFIG.timeoutMs) conn.timeoutMs = eCfg.timeoutMs;
  if (eCfg.retryCount !== DEFAULT_EDGE_CONFIG.retryCount) conn.retryCount = eCfg.retryCount;
  if (eCfg.circuitBreaker !== DEFAULT_EDGE_CONFIG.circuitBreaker) conn.circuitBreaker = eCfg.circuitBreaker;
  if (eCfg.circuitBreakerThreshold !== DEFAULT_EDGE_CONFIG.circuitBreakerThreshold) conn.circuitBreakerThreshold = eCfg.circuitBreakerThreshold;
  if (eCfg.bandwidthMbps !== 0) conn.bandwidthMbps = eCfg.bandwidthMbps;
  if (eCfg.splitPct !== undefined) conn.splitPct = eCfg.splitPct;
  if (eCfg.readSplitPct !== undefined) conn.readSplitPct = eCfg.readSplitPct;
  if (eCfg.writeSplitPct !== undefined) conn.writeSplitPct = eCfg.writeSplitPct;
  return conn;
}

function hasDeployContent(deploy: IacDeploy): boolean {
  return Object.values(deploy).some((v) => v !== undefined);
}

/**
 * src/iac/toTopology.ts
 *
 * Converts a validated IacDocument into the { nodes, edges, nodeConfigs, edgeConfigs,
 * serviceGroups } shape consumed by architectureStore.
 *
 * Two pathways coexist and are merged:
 *   • Classic: resources[] + connections[]  → direct node/edge creation
 *   • Service:  services[] + deployments[]  → expanded node/edge creation with service groups
 *
 * Also computes initial node positions (auto-layout).
 *
 * Pure module — no React imports, no store imports.
 */

import type { Node, Edge } from 'reactflow';
import type { NodeConfig, EdgeConfig, ServiceGroup } from '@/types';
import { COMPONENT_BY_TYPE, DEFAULT_EDGE_CONFIG } from '@/constants/components';
import { CONTAINER_COMPONENT_TYPES } from './schema';
import type {
  IacDocument,
  IacResource,
  IacConnection,
  IacAutoscaling,
  IacService,
  IacDeployment,
} from './schema';

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface Topology {
  nodes: Node[];
  edges: Edge[];
  nodeConfigs: Record<string, NodeConfig>;
  edgeConfigs: Record<string, EdgeConfig>;
  /** Populated when the document uses services[] + deployments[]. Empty otherwise. */
  serviceGroups: Record<string, ServiceGroup>;
}

// ---------------------------------------------------------------------------
// Layout constants (px)
// ---------------------------------------------------------------------------

const GLOBAL_Y = 80;
const GLOBAL_X_START = 80;
const GLOBAL_X_STEP = 280;

const REGION_Y_START = 300;
const REGION_X_START = 80;
const REGION_X_GAP = 80;
const REGION_DEFAULT_W = 900;
const REGION_DEFAULT_H = 560;

const REGIONAL_RES_X_OFFSET = 30;
const REGIONAL_RES_Y_OFFSET = 30;
const REGIONAL_RES_X_STEP = 260;

const ZONE_X_OFFSET = 30;
const ZONE_Y_OFFSET = 110;
const ZONE_X_GAP = 20;
const ZONE_DEFAULT_W = 380;
const ZONE_DEFAULT_H = 420;

const ZONAL_RES_X_OFFSET = 30;
const ZONAL_RES_Y_OFFSET = 60;
const ZONAL_RES_Y_STEP = 110;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a validated IacDocument into the topology consumed by the canvas.
 */
export function toTopology(doc: IacDocument): Topology {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeConfigs: Record<string, NodeConfig> = {};
  const edgeConfigs: Record<string, EdgeConfig> = {};
  const serviceGroups: Record<string, ServiceGroup> = {};

  // ── Region / Zone container layout ───────────────────────────────────────
  const regionById = new Map<string, { id: string; label: string; x: number; y: number }>();
  const zoneById   = new Map<string, { id: string; label: string; regionId: string; x: number; y: number }>();

  let regionX = REGION_X_START;

  for (const region of doc.regions ?? []) {
    const rx = regionX;
    const ry = REGION_Y_START;
    regionById.set(region.id, { id: region.id, label: region.label, x: rx, y: ry });

    nodes.push({ id: region.id, type: 'region', position: { x: rx, y: ry }, data: { label: region.label } });
    nodeConfigs[region.id] = {
      ...COMPONENT_BY_TYPE.region.defaults,
      label: region.label,
      regionName: region.label,
      containerWidth: REGION_DEFAULT_W,
      containerHeight: REGION_DEFAULT_H,
    };

    let zoneX = rx + ZONE_X_OFFSET;
    const zoneY = ry + ZONE_Y_OFFSET;

    for (const zone of region.zones ?? []) {
      zoneById.set(zone.id, { id: zone.id, label: zone.label, regionId: region.id, x: zoneX, y: zoneY });

      nodes.push({ id: zone.id, type: 'availability_zone', position: { x: zoneX, y: zoneY }, data: { label: zone.label } });
      nodeConfigs[zone.id] = {
        ...COMPONENT_BY_TYPE.availability_zone.defaults,
        label: zone.label,
        zoneName: zone.label,
        regionId: region.id,
        containerWidth: ZONE_DEFAULT_W,
        containerHeight: ZONE_DEFAULT_H,
      };
      zoneX += ZONE_DEFAULT_W + ZONE_X_GAP;
    }

    regionX += REGION_DEFAULT_W + REGION_X_GAP;
  }

  // ── Classic resource layout ──────────────────────────────────────────────
  const globalResources: IacResource[] = [];
  const resourcesByRegion = new Map<string, IacResource[]>();
  const resourcesByZone   = new Map<string, IacResource[]>();

  for (const resource of doc.resources) {
    if (CONTAINER_COMPONENT_TYPES.has(resource.type)) continue;
    const p = resource.placement;
    if (p?.zone)   { const l = resourcesByZone.get(p.zone)     ?? []; l.push(resource); resourcesByZone.set(p.zone, l); }
    else if (p?.region) { const l = resourcesByRegion.get(p.region) ?? []; l.push(resource); resourcesByRegion.set(p.region, l); }
    else           { globalResources.push(resource); }
  }

  // Track how many resource-layer nodes each zone/region already has so service
  // nodes can be stacked below without overlapping.
  const zoneNodeCount:   Map<string, number> = new Map();
  const regionNodeCount: Map<string, number> = new Map();

  let globalX = GLOBAL_X_START;
  for (const resource of globalResources) {
    const cfg = buildNodeConfig(resource, undefined, undefined);
    nodes.push({ id: resource.id, type: resource.type, position: { x: globalX, y: GLOBAL_Y }, data: { label: cfg.label ?? resource.id } });
    nodeConfigs[resource.id] = cfg;
    globalX += GLOBAL_X_STEP;
  }

  for (const [zoneId, resources] of resourcesByZone) {
    const zone = zoneById.get(zoneId);
    if (!zone) continue;
    let resY = zone.y + ZONAL_RES_Y_OFFSET;
    const resX = zone.x + ZONAL_RES_X_OFFSET;
    for (const resource of resources) {
      const cfg = buildNodeConfig(resource, zone.regionId, zoneId);
      nodes.push({ id: resource.id, type: resource.type, position: { x: resX, y: resY }, data: { label: cfg.label ?? resource.id } });
      nodeConfigs[resource.id] = cfg;
      resY += ZONAL_RES_Y_STEP;
    }
    zoneNodeCount.set(zoneId, resources.length);
  }

  for (const [regionId, resources] of resourcesByRegion) {
    const region = regionById.get(regionId);
    if (!region) continue;
    let resX = region.x + REGIONAL_RES_X_OFFSET;
    const resY = region.y + REGIONAL_RES_Y_OFFSET;
    for (const resource of resources) {
      const cfg = buildNodeConfig(resource, regionId, undefined);
      nodes.push({ id: resource.id, type: resource.type, position: { x: resX, y: resY }, data: { label: cfg.label ?? resource.id } });
      nodeConfigs[resource.id] = cfg;
      resX += REGIONAL_RES_X_STEP;
    }
    regionNodeCount.set(regionId, resources.length);
  }

  // ── Classic edges ────────────────────────────────────────────────────────
  const edgeIdCounts = new Map<string, number>();

  for (const conn of doc.connections ?? []) {
    const edgeId = uniqueEdgeId(conn.from, conn.to, edgeIdCounts);
    edges.push({ id: edgeId, source: conn.from, target: conn.to, type: 'wire' });
    edgeConfigs[edgeId] = buildEdgeConfig(conn);
  }

  // ── Service / Deployment expansion ──────────────────────────────────────
  if ((doc.services ?? []).length > 0 && (doc.deployments ?? []).length > 0) {
    expandServices(
      doc, zoneById, regionById,
      zoneNodeCount, regionNodeCount,
      nodes, edges, nodeConfigs, edgeConfigs, serviceGroups,
      edgeIdCounts,
    );
  }

  return { nodes, edges, nodeConfigs, edgeConfigs, serviceGroups };
}

// ---------------------------------------------------------------------------
// Service expansion
// ---------------------------------------------------------------------------

function expandServices(
  doc: IacDocument,
  zoneById:   Map<string, { id: string; label: string; regionId: string; x: number; y: number }>,
  regionById: Map<string, { id: string; label: string; x: number; y: number }>,
  zoneNodeCount:   Map<string, number>,
  regionNodeCount: Map<string, number>,
  nodes:       Node[],
  edges:       Edge[],
  nodeConfigs: Record<string, NodeConfig>,
  edgeConfigs: Record<string, EdgeConfig>,
  serviceGroups: Record<string, ServiceGroup>,
  edgeIdCounts: Map<string, number>,
): void {
  const serviceById = new Map<string, IacService>(
    (doc.services ?? []).map((s) => [s.id, s]),
  );
  const deploymentByService = new Map<string, IacDeployment>(
    (doc.deployments ?? []).map((d) => [d.service, d]),
  );

  // Map serviceId → list of created canvas nodeIds
  const serviceNodeMap = new Map<string, string[]>();

  // ── Phase 1: create nodes per zone / region / replica ───────────────────
  for (const deployment of doc.deployments ?? []) {
    const service = serviceById.get(deployment.service);
    if (!service) continue;

    const def = COMPONENT_BY_TYPE[service.type as keyof typeof COMPONENT_BY_TYPE];
    const nodeIds: string[] = [];

    // Primary zone(s)
    for (const zoneId of deployment.zones ?? []) {
      const zone = zoneById.get(zoneId);
      if (!zone) continue;

      const nodeId = `${service.id}-${zoneId}`;
      const cfg = buildServiceNodeConfig(service, zone.regionId, zoneId);

      // First zone in the list becomes the primary for database services
      const isPrimary = service.type === 'database' && deployment.zones?.[0] === zoneId;
      if (service.type === 'database') cfg.dbRole = isPrimary ? 'primary' : 'standalone';

      const slotIdx = zoneNodeCount.get(zoneId) ?? 0;
      nodeConfigs[nodeId] = cfg;
      nodes.push({
        id: nodeId,
        type: service.type,
        position: {
          x: zone.x + ZONAL_RES_X_OFFSET,
          y: zone.y + ZONAL_RES_Y_OFFSET + slotIdx * ZONAL_RES_Y_STEP,
        },
        data: { label: cfg.label ?? service.id },
      });
      zoneNodeCount.set(zoneId, slotIdx + 1);
      nodeIds.push(nodeId);
    }

    // Replica zones (database replica pattern)
    const primaryZone = deployment.zones?.[0];
    const primaryNodeId = primaryZone ? `${service.id}-${primaryZone}` : undefined;

    for (const replica of deployment.replicas ?? []) {
      const zoneId = replica.zone;
      if (!zoneId) continue;
      const zone = zoneById.get(zoneId);
      if (!zone) continue;

      const nodeId = `${service.id}-${zoneId}`;
      const cfg = buildServiceNodeConfig(service, zone.regionId, zoneId);

      if (service.type === 'database') {
        cfg.dbRole = 'replica';
        if (primaryNodeId) cfg.primaryNodeId = primaryNodeId;
      }

      const slotIdx = zoneNodeCount.get(zoneId) ?? 0;
      nodeConfigs[nodeId] = cfg;
      nodes.push({
        id: nodeId,
        type: service.type,
        position: {
          x: zone.x + ZONAL_RES_X_OFFSET,
          y: zone.y + ZONAL_RES_Y_OFFSET + slotIdx * ZONAL_RES_Y_STEP,
        },
        data: { label: cfg.label ?? service.id },
      });
      zoneNodeCount.set(zoneId, slotIdx + 1);
      nodeIds.push(nodeId);
    }

    // Regional deployments
    for (const regionId of deployment.regions ?? []) {
      const region = regionById.get(regionId);
      if (!region) continue;

      const nodeId = `${service.id}-${regionId}`;
      const cfg = buildServiceNodeConfig(service, regionId, undefined);

      const slotIdx = regionNodeCount.get(regionId) ?? 0;
      nodeConfigs[nodeId] = cfg;
      nodes.push({
        id: nodeId,
        type: service.type,
        position: {
          x: region.x + REGIONAL_RES_X_OFFSET + slotIdx * REGIONAL_RES_X_STEP,
          y: region.y + REGIONAL_RES_Y_OFFSET,
        },
        data: { label: cfg.label ?? service.id },
      });
      regionNodeCount.set(regionId, slotIdx + 1);
      nodeIds.push(nodeId);
    }

    serviceNodeMap.set(service.id, nodeIds);
    serviceGroups[service.id] = {
      id: service.id,
      type: service.type as ServiceGroup['type'],
      label: service.label ?? def?.label ?? service.id,
      nodeIds,
      healingEnabled: service.healing?.enabled,
    };
  }

  // ── Phase 2: dependency edges (all-to-all between service replica sets) ──
  for (const service of doc.services ?? []) {
    const fromIds = serviceNodeMap.get(service.id) ?? [];
    for (const dep of service.dependencies ?? []) {
      const toIds = serviceNodeMap.get(dep.service) ?? [];
      for (const fromId of fromIds) {
        for (const toId of toIds) {
          const edgeId = uniqueEdgeId(fromId, toId, edgeIdCounts);
          edges.push({ id: edgeId, source: fromId, target: toId, type: 'wire' });
          edgeConfigs[edgeId] = {
            ...DEFAULT_EDGE_CONFIG,
            ...(dep.protocol       !== undefined ? { protocol: dep.protocol }           : {}),
            ...(dep.splitPct       !== undefined ? { splitPct: dep.splitPct }           : {}),
            ...(dep.readSplitPct   !== undefined ? { readSplitPct: dep.readSplitPct }   : {}),
            ...(dep.writeSplitPct  !== undefined ? { writeSplitPct: dep.writeSplitPct } : {}),
          };
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a NodeConfig for a service instance in a specific zone/region. */
function buildServiceNodeConfig(
  service: IacService,
  regionId: string | undefined,
  zoneId:   string | undefined,
): NodeConfig {
  const def = COMPONENT_BY_TYPE[service.type as keyof typeof COMPONENT_BY_TYPE];
  const base: NodeConfig = { ...def?.defaults };

  if (service.spec)   Object.assign(base, service.spec);
  if (service.deploy) {
    const { autoscaling, ...deployFields } = service.deploy;
    Object.assign(base, deployFields);
    if (autoscaling) Object.assign(base, flattenAutoscaling(autoscaling));
  }

  base.label = service.label ?? def?.label ?? service.id;
  if (zoneId)   base.zoneId   = zoneId;
  if (regionId) base.regionId = regionId;
  if (service.healing?.enabled !== undefined) base.healingEnabled = service.healing.enabled;

  return base;
}

/**
 * Merge a resource's spec + deploy into a flat NodeConfig.
 * Placement (regionId, zoneId) is set from the resolved IDs.
 */
function buildNodeConfig(
  resource: IacResource,
  regionId: string | undefined,
  zoneId:   string | undefined,
): NodeConfig {
  const def = COMPONENT_BY_TYPE[resource.type];
  const base: NodeConfig = { ...def?.defaults };

  if (resource.spec) Object.assign(base, resource.spec);
  if (resource.deploy) {
    const { autoscaling, ...deployFields } = resource.deploy;
    Object.assign(base, deployFields);
    if (autoscaling) Object.assign(base, flattenAutoscaling(autoscaling));
  }

  base.label = resource.label ?? def?.label ?? resource.id;
  if (zoneId)   base.zoneId   = zoneId;
  if (regionId) base.regionId = regionId;

  return base;
}

/** Flatten the nested autoscaling block into flat NodeConfig fields. */
function flattenAutoscaling(as: IacAutoscaling): Partial<NodeConfig> {
  const { enabled, strategy, ...rest } = as;
  const flat: Partial<NodeConfig> = { autoscalingEnabled: enabled };
  if (strategy) flat.autoscalingStrategy = strategy;
  return { ...flat, ...rest };
}

/** Build an EdgeConfig from a connection declaration. */
function buildEdgeConfig(conn: IacConnection): EdgeConfig {
  return {
    ...DEFAULT_EDGE_CONFIG,
    ...(conn.protocol                  !== undefined ? { protocol: conn.protocol }                           : {}),
    ...(conn.timeoutMs                 !== undefined ? { timeoutMs: conn.timeoutMs }                         : {}),
    ...(conn.retryCount                !== undefined ? { retryCount: conn.retryCount }                       : {}),
    ...(conn.circuitBreaker            !== undefined ? { circuitBreaker: conn.circuitBreaker }               : {}),
    ...(conn.circuitBreakerThreshold   !== undefined ? { circuitBreakerThreshold: conn.circuitBreakerThreshold } : {}),
    ...(conn.bandwidthMbps             !== undefined ? { bandwidthMbps: conn.bandwidthMbps }                 : {}),
    ...(conn.splitPct                  !== undefined ? { splitPct: conn.splitPct }                           : {}),
    ...(conn.readSplitPct              !== undefined ? { readSplitPct: conn.readSplitPct }                   : {}),
    ...(conn.writeSplitPct             !== undefined ? { writeSplitPct: conn.writeSplitPct }                 : {}),
  };
}

/** Generate a unique edge ID, appending a counter suffix when duplicates occur. */
function uniqueEdgeId(from: string, to: string, counts: Map<string, number>): string {
  const base  = `${from}->${to}`;
  const count = counts.get(base) ?? 0;
  counts.set(base, count + 1);
  return count === 0 ? base : `${base}#${count}`;
}

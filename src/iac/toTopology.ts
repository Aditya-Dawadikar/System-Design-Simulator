/**
 * src/iac/toTopology.ts
 *
 * Converts a validated IacDocument into the { nodes, edges, nodeConfigs, edgeConfigs }
 * shape consumed by architectureStore.
 *
 * Also computes initial node positions (auto-layout).
 *
 * Pure module — no React imports, no store imports.
 */

import type { Node, Edge } from 'reactflow';
import type { NodeConfig, EdgeConfig } from '@/types';
import { COMPONENT_BY_TYPE, DEFAULT_EDGE_CONFIG } from '@/constants/components';
import { CONTAINER_COMPONENT_TYPES } from './schema';
import type { IacDocument, IacResource, IacConnection, IacAutoscaling } from './schema';

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface Topology {
  nodes: Node[];
  edges: Edge[];
  nodeConfigs: Record<string, NodeConfig>;
  edgeConfigs: Record<string, EdgeConfig>;
}

// ---------------------------------------------------------------------------
// Layout constants (px)
// ---------------------------------------------------------------------------

const GLOBAL_Y = 80;
const GLOBAL_X_START = 80;
const GLOBAL_X_STEP = 280;

const REGION_Y_START = 300;
const REGION_X_START = 80;
const REGION_X_GAP = 80;   // gap between regions
const REGION_DEFAULT_W = 900;
const REGION_DEFAULT_H = 560;

// Resources within a region (no zone)
const REGIONAL_RES_X_OFFSET = 30;
const REGIONAL_RES_Y_OFFSET = 30;
const REGIONAL_RES_X_STEP = 260;

// Zone containers within region
const ZONE_X_OFFSET = 30;
const ZONE_Y_OFFSET = 110;   // below the regional-resource row
const ZONE_X_GAP = 20;
const ZONE_DEFAULT_W = 380;
const ZONE_DEFAULT_H = 420;

// Resources within a zone
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

  // --- Build lookup maps ---
  const regionById = new Map<string, { id: string; label: string; x: number; y: number }>();
  const zoneById = new Map<string, { id: string; label: string; regionId: string; x: number; y: number }>();

  // --- Layout: region containers ---
  let regionX = REGION_X_START;

  for (const region of doc.regions ?? []) {
    const rx = regionX;
    const ry = REGION_Y_START;
    regionById.set(region.id, { id: region.id, label: region.label, x: rx, y: ry });

    nodes.push({
      id: region.id,
      type: 'region',
      position: { x: rx, y: ry },
      data: { label: region.label },
    });

    nodeConfigs[region.id] = {
      ...COMPONENT_BY_TYPE.region.defaults,
      label: region.label,
      regionName: region.label,
      containerWidth: REGION_DEFAULT_W,
      containerHeight: REGION_DEFAULT_H,
    };

    // --- Layout: zone containers within this region ---
    let zoneX = rx + ZONE_X_OFFSET;
    const zoneY = ry + ZONE_Y_OFFSET;

    for (const zone of region.zones ?? []) {
      zoneById.set(zone.id, { id: zone.id, label: zone.label, regionId: region.id, x: zoneX, y: zoneY });

      nodes.push({
        id: zone.id,
        type: 'availability_zone',
        position: { x: zoneX, y: zoneY },
        data: { label: zone.label },
      });

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

  // --- Group resources by scope for layout ---
  const globalResources: IacResource[] = [];
  const resourcesByRegion = new Map<string, IacResource[]>();
  const resourcesByZone = new Map<string, IacResource[]>();

  for (const resource of doc.resources) {
    // Skip container types — they're built from regions[]
    if (CONTAINER_COMPONENT_TYPES.has(resource.type)) continue;

    const placement = resource.placement;

    if (placement?.zone) {
      const list = resourcesByZone.get(placement.zone) ?? [];
      list.push(resource);
      resourcesByZone.set(placement.zone, list);
    } else if (placement?.region) {
      const list = resourcesByRegion.get(placement.region) ?? [];
      list.push(resource);
      resourcesByRegion.set(placement.region, list);
    } else {
      // Global (no placement or explicit scope: global)
      globalResources.push(resource);
    }
  }

  // --- Layout: global resources ---
  let globalX = GLOBAL_X_START;
  for (const resource of globalResources) {
    const cfg = buildNodeConfig(resource, undefined, undefined);
    nodes.push({
      id: resource.id,
      type: resource.type,
      position: { x: globalX, y: GLOBAL_Y },
      data: { label: cfg.label ?? resource.label ?? resource.id },
    });
    nodeConfigs[resource.id] = cfg;
    globalX += GLOBAL_X_STEP;
  }

  // --- Layout: zonal resources (inside zone boxes) ---
  for (const [zoneId, resources] of resourcesByZone) {
    const zone = zoneById.get(zoneId);
    if (!zone) continue;

    let resY = zone.y + ZONAL_RES_Y_OFFSET;
    const resX = zone.x + ZONAL_RES_X_OFFSET;

    for (const resource of resources) {
      const regionId = zone.regionId;
      const cfg = buildNodeConfig(resource, regionId, zoneId);
      nodes.push({
        id: resource.id,
        type: resource.type,
        position: { x: resX, y: resY },
        data: { label: cfg.label ?? resource.label ?? resource.id },
      });
      nodeConfigs[resource.id] = cfg;
      resY += ZONAL_RES_Y_STEP;
    }
  }

  // --- Layout: regional resources (inside region boxes, above zones) ---
  for (const [regionId, resources] of resourcesByRegion) {
    const region = regionById.get(regionId);
    if (!region) continue;

    let resX = region.x + REGIONAL_RES_X_OFFSET;
    const resY = region.y + REGIONAL_RES_Y_OFFSET;

    for (const resource of resources) {
      const cfg = buildNodeConfig(resource, regionId, undefined);
      nodes.push({
        id: resource.id,
        type: resource.type,
        position: { x: resX, y: resY },
        data: { label: cfg.label ?? resource.label ?? resource.id },
      });
      nodeConfigs[resource.id] = cfg;
      resX += REGIONAL_RES_X_STEP;
    }
  }

  // --- Edges ---
  const edgeIdCounts = new Map<string, number>();

  for (const conn of doc.connections ?? []) {
    const baseId = `${conn.from}->${conn.to}`;
    const count = edgeIdCounts.get(baseId) ?? 0;
    const edgeId = count === 0 ? baseId : `${baseId}#${count}`;
    edgeIdCounts.set(baseId, count + 1);

    edges.push({
      id: edgeId,
      source: conn.from,
      target: conn.to,
      type: 'wire',
    });

    edgeConfigs[edgeId] = buildEdgeConfig(conn);
  }

  return { nodes, edges, nodeConfigs, edgeConfigs };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Merge a resource's spec + deploy into a flat NodeConfig.
 * Placement (regionId, zoneId) is set from the resolved IDs.
 */
function buildNodeConfig(
  resource: IacResource,
  regionId: string | undefined,
  zoneId: string | undefined,
): NodeConfig {
  const def = COMPONENT_BY_TYPE[resource.type];
  const base: NodeConfig = { ...def?.defaults };

  // Apply spec fields (direct NodeConfig passthrough)
  if (resource.spec) {
    Object.assign(base, resource.spec);
  }

  // Apply deploy fields (compute types)
  if (resource.deploy) {
    const { autoscaling, ...deployFields } = resource.deploy;
    Object.assign(base, deployFields);

    if (autoscaling) {
      Object.assign(base, flattenAutoscaling(autoscaling));
    }
  }

  // Set label
  base.label = resource.label ?? def?.label ?? resource.id;

  // Set placement IDs
  if (zoneId) base.zoneId = zoneId;
  if (regionId) base.regionId = regionId;

  return base;
}

/**
 * Flatten the nested autoscaling block into flat NodeConfig fields.
 */
function flattenAutoscaling(as: IacAutoscaling): Partial<NodeConfig> {
  const { enabled, strategy, ...rest } = as;
  const flat: Partial<NodeConfig> = {
    autoscalingEnabled: enabled,
  };
  if (strategy) flat.autoscalingStrategy = strategy;

  // Spread remaining fields directly (they map 1:1 to NodeConfig)
  return { ...flat, ...rest };
}

/**
 * Build an EdgeConfig from a connection declaration.
 * Defaults come from DEFAULT_EDGE_CONFIG.
 */
function buildEdgeConfig(conn: IacConnection): EdgeConfig {
  return {
    ...DEFAULT_EDGE_CONFIG,
    ...(conn.protocol !== undefined ? { protocol: conn.protocol } : {}),
    ...(conn.timeoutMs !== undefined ? { timeoutMs: conn.timeoutMs } : {}),
    ...(conn.retryCount !== undefined ? { retryCount: conn.retryCount } : {}),
    ...(conn.circuitBreaker !== undefined ? { circuitBreaker: conn.circuitBreaker } : {}),
    ...(conn.circuitBreakerThreshold !== undefined ? { circuitBreakerThreshold: conn.circuitBreakerThreshold } : {}),
    ...(conn.bandwidthMbps !== undefined ? { bandwidthMbps: conn.bandwidthMbps } : {}),
    ...(conn.splitPct !== undefined ? { splitPct: conn.splitPct } : {}),
    ...(conn.readSplitPct !== undefined ? { readSplitPct: conn.readSplitPct } : {}),
    ...(conn.writeSplitPct !== undefined ? { writeSplitPct: conn.writeSplitPct } : {}),
  };
}

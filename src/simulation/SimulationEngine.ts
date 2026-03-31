import type { Node, Edge } from 'reactflow';
import type { NodeConfig, EdgeConfig, NodeMetrics, EdgeMetrics, ComponentType, TrafficPattern, ComponentDetail } from '@/types';

// ---------------------------------------------------------------------------
// Traffic pattern multiplier (mirrors simulationStore — kept in sync manually)
// ---------------------------------------------------------------------------

function getTrafficMultiplier(pattern: TrafficPattern, tick: number): number {
  switch (pattern) {
    case 'steady': return 1.0;
    case 'ramp':   return Math.min(1 + (tick / 60) * 0.6, 1.6);
    case 'spike':  return (tick % 30) < 5 ? 3.5 : 0.35;
    case 'wave':   return 0.5 + 0.5 * Math.sin((tick / 20) * Math.PI * 2);
    case 'chaos':  return 0.3 + Math.random() * 1.4;
    default:       return 1.0;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Topology {
  nodes: Node[];
  edges: Edge[];
  nodeConfigs: Record<string, NodeConfig>;
  edgeConfigs: Record<string, EdgeConfig>;
}

interface AdjacencyMap {
  /** source → list of target node IDs */
  downstream: Map<string, string[]>;
  /** target → list of source node IDs */
  upstream: Map<string, string[]>;
  /** "sourceId|targetId" → edge ID (for deduplication) */
  edgeKey: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Base latencies (ms) per component type
// ---------------------------------------------------------------------------

const BASE_LATENCY: Record<ComponentType, number> = {
  cdn: 5,
  load_balancer: 2,
  app_server: 40,        // overridden by avgLatencyMs config
  cache: 1,
  database: 10,
  cloud_storage: 20,     // overridden by storageClass config
  block_storage: 1,      // overridden by diskType config (NVMe 0.2ms, SSD 1ms, HDD 5ms)
  network_storage: 5,    // overridden by nfsProtocol config
  pubsub: 5,
  cloud_function: 200,   // overridden by avgExecutionMs config
  cron_job: 0,           // cron_job has no request latency — it's a scheduler
  worker_pool: 0,        // overridden by taskDurationMs config
  comment: 0,            // annotation only — no simulation effect
  traffic_generator: 0,  // pure source — no latency on the generator itself
  rate_limiter: 1,       // minimal overhead per request
  service_mesh: 2,       // sidecar proxy overhead; overridden by proxyOverheadMs config
  region: 0,             // structural container — no simulation latency
  availability_zone: 0,  // structural container — no simulation latency
  global_accelerator: 5, // anycast edge routing overhead
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNodeType(node: Node): ComponentType {
  return node.type as ComponentType;
}

function formatWarn(msg: string): void {
  // Pure-TS module — use console.warn so it is still visible in dev tools
  // without importing React.
  console.warn(`[SimulationEngine] ${msg}`);
}

/**
 * Build bidirectional adjacency maps and detect any backward (cycling) edges.
 * Returns the adjacency maps plus a Set of edge IDs that form cycles so the
 * caller can skip them during traversal.
 */
function buildAdjacency(
  nodes: Node[],
  edges: Edge[]
): { adj: AdjacencyMap; cyclingEdgeIds: Set<string> } {
  const nodeIds = new Set(nodes.map((n) => n.id));

  const downstream = new Map<string, string[]>();
  const upstream = new Map<string, string[]>();
  const edgeKey = new Map<string, string>();

  for (const node of nodes) {
    downstream.set(node.id, []);
    upstream.set(node.id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    downstream.get(edge.source)!.push(edge.target);
    upstream.get(edge.target)!.push(edge.source);
    edgeKey.set(`${edge.source}|${edge.target}`, edge.id);
  }

  const adj: AdjacencyMap = { downstream, upstream, edgeKey };

  // Cycle detection via DFS (Kahn's with visited coloring)
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const cyclingEdgeIds = new Set<string>();

  for (const node of nodes) color.set(node.id, WHITE);

  const dfs = (id: string): void => {
    color.set(id, GRAY);
    for (const neighbour of (downstream.get(id) ?? [])) {
      if (color.get(neighbour) === GRAY) {
        const eid = edgeKey.get(`${id}|${neighbour}`);
        if (eid) {
          cyclingEdgeIds.add(eid);
          formatWarn(`Cycle detected on edge ${id} → ${neighbour} (edgeId: ${eid}), skipping.`);
        }
      } else if (color.get(neighbour) === WHITE) {
        dfs(neighbour);
      }
    }
    color.set(id, BLACK);
  };

  for (const node of nodes) {
    if (color.get(node.id) === WHITE) dfs(node.id);
  }

  return { adj, cyclingEdgeIds };
}

/**
 * Kahn's BFS topological sort. Returns nodes in processing order.
 * Edges in cyclingEdgeIds are ignored for in-degree computation.
 */
function topoSort(
  nodes: Node[],
  edges: Edge[],
  adj: AdjacencyMap,
  cyclingEdgeIds: Set<string>
): { order: Node[]; sourceNodes: Node[] } {
  const inDegree = new Map<string, number>();
  for (const node of nodes) inDegree.set(node.id, 0);

  for (const edge of edges) {
    if (cyclingEdgeIds.has(edge.id)) continue;
    if (!inDegree.has(edge.target)) continue;
    inDegree.set(edge.target, inDegree.get(edge.target)! + 1);
  }

  const sourceNodes: Node[] = [];
  const queue: Node[] = [];
  for (const node of nodes) {
    if (inDegree.get(node.id) === 0) {
      queue.push(node);
      sourceNodes.push(node);
    }
  }

  const order: Node[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const neighbourId of (adj.downstream.get(current.id) ?? [])) {
      const newDeg = inDegree.get(neighbourId)! - 1;
      inDegree.set(neighbourId, newDeg);
      if (newDeg === 0) {
        const neighbourNode = nodes.find((n) => n.id === neighbourId);
        if (neighbourNode) queue.push(neighbourNode);
      }
    }
  }

  return { order, sourceNodes };
}

// ---------------------------------------------------------------------------
// Per-node capacity & latency computations
// ---------------------------------------------------------------------------

function computeCapacity(type: ComponentType, config: NodeConfig): number {
  switch (type) {
    case 'cdn':
      return (config.pops ?? 2) * 25000;

    case 'load_balancer':
      return 50000;

    case 'app_server': {
      // Make RPS depend on both RAM and CPU
      const instances = config.instances ?? 2;
      const cpuCores = config.cpuCores ?? 2;
      const ramGb = config.ramGb ?? 4;
      // Each instance's RPS is proportional to min(cpuCores, ramGb * 0.5) * 300
      // (e.g., 2 cores, 4GB RAM → min(2,2) * 300 = 600 RPS per instance)
      const perInstanceRps = Math.min(cpuCores, ramGb * 0.5) * 300;
      return instances * perInstanceRps;
    }

    case 'cache':
      return 100000;

    case 'database': {
      // Total capacity = primary shards (reads+writes) + replicas (reads only)
      // Used as the "combined" capacity for the base load calculation.
      const shards = config.shards ?? 1;
      const rpsPerShard = config.rpsPerShard ?? 800;
      const readReplicas = config.readReplicas ?? 0;
      return shards * rpsPerShard + readReplicas * rpsPerShard;
    }

    case 'cloud_storage': {
      // Throughput (Mbps) → ops/sec: higher bandwidth = more concurrent object requests
      const throughputMbps = config.storageThroughputMbps ?? 1000;
      const objectSizeKb = config.objectSizeKb ?? 512;
      // ops/sec = (throughput in KB/s) / objectSizeKb
      return Math.round((throughputMbps * 1000) / 8 / objectSizeKb);
    }

    case 'block_storage':
      // Capacity is pure IOPS (each IO op = 1 RPS unit)
      return config.iops ?? 3000;

    case 'network_storage': {
      // Bandwidth-limited: throughput in Mbps → IO ops/sec for given IO size
      const throughputMbps = config.storageThroughputMbps ?? 500;
      const ioSizeKb = config.objectSizeKb ?? 64;
      return Math.round((throughputMbps * 1000) / 8 / ioSizeKb);
    }

    case 'pubsub': {
      // Each partition handles messages independently; more partitions = more throughput
      const partitions = config.partitions ?? 4;
      return partitions * 5000;
    }

    case 'cloud_function': {
      // Max concurrent invocations × invocations-per-second each can sustain
      const concurrency = config.maxConcurrency ?? 100;
      const execMs = config.avgExecutionMs ?? 200;
      // Memory scaling: more memory → faster execution (GCP/AWS behavior)
      const memMb = config.functionMemoryMb ?? 256;
      const memFactor = Math.sqrt(memMb / 256);
      return Math.round(concurrency * (1000 / execMs) * memFactor);
    }

    case 'cron_job': {
      // Cron job is a pure emitter — it has no load cap; its capacity is
      // effectively unbounded (the scheduler never "overloads" itself).
      return Number.MAX_SAFE_INTEGER;
    }

    case 'comment':
    case 'traffic_generator':
    case 'region':
    case 'availability_zone':
      // Annotation / pure-source / structural container nodes — never get overloaded
      return Number.MAX_SAFE_INTEGER;

    case 'global_accelerator':
      // Cloud-scale anycast network — extremely high capacity
      return 500000;

    case 'rate_limiter':
      // Pre-switch load is overridden in the tick case; return rpsLimit as placeholder
      return config.requestsPerSecond ?? 1000;

    case 'service_mesh':
      // High-throughput transparent proxy; load rarely saturates
      return 100000;

    case 'worker_pool': {
      // Throughput = workerCount × threadCount × (1000 / taskDurationMs)
      const workers = config.workerCount ?? 4;
      const threads = config.threadCount ?? 4;
      const durationMs = config.taskDurationMs ?? 500;
      return Math.round(workers * threads * (1000 / durationMs));
    }

    default:
      return 1000;
  }
}

function computeBaseLatency(type: ComponentType, config: NodeConfig): number {
  if (type === 'app_server') return config.avgLatencyMs ?? BASE_LATENCY.app_server;
  if (type === 'cloud_function') return config.avgExecutionMs ?? BASE_LATENCY.cloud_function;
  if (type === 'worker_pool') return config.taskDurationMs ?? 500;
  if (type === 'cloud_storage') {
    const classLatency: Record<string, number> = {
      standard: 20, nearline: 50, coldline: 100, archive: 500,
    };
    return classLatency[config.storageClass ?? 'standard'] ?? 20;
  }
  if (type === 'block_storage') {
    const diskLatency: Record<string, number> = { nvme: 0.2, ssd: 1, hdd: 5 };
    return diskLatency[config.diskType ?? 'ssd'] ?? 1;
  }
  if (type === 'network_storage') {
    const protoLatency: Record<string, number> = { nfs: 5, smb: 8, cephfs: 3 };
    return protoLatency[config.nfsProtocol ?? 'nfs'] ?? 5;
  }
  if (type === 'service_mesh') return config.proxyOverheadMs ?? 2;
  return BASE_LATENCY[type] ?? 10;
}

function computeErrorRate(load: number): number {
  if (load < 0.9) return 0;
  if (load >= 1.2) return 1.0;
  // linear ramp: 0 at 0.9 → 1.0 at 1.2
  return (load - 0.9) / (1.2 - 0.9);
}

function computeDropRate(load: number): number {
  return Math.min(1, Math.max(0, (load - 1.0) * 0.8));
}

/**
 * Returns the cumulative IO wait (ms) added to a compute node's effective task
 * duration by its downstream data stores (database, cache, block/network/cloud
 * storage).  Uses previous-tick metrics so it is available on the current tick
 * without a second pass; the first tick always returns 0.
 *
 * Each store contributes `prevLatencyMs × ioFraction` where ioFraction models
 * the average fraction of compute requests that block on that store:
 *   - cache          → 0.2  (designed for sub-ms access, usually a read path)
 *   - everything else→ 0.5  (50 % of requests are I/O-bound on the store)
 */
function computeDownstreamIoWaitMs(
  nodeId: string,
  adj: AdjacencyMap,
  nodes: Node[],
  previousMetrics: Record<string, NodeMetrics>
): number {
  let ioWaitMs = 0;
  for (const dsId of (adj.downstream.get(nodeId) ?? [])) {
    const dsNode = nodes.find((n) => n.id === dsId);
    const dsType = dsNode?.type as string | undefined;
    if (
      dsType !== 'database' &&
      dsType !== 'cache' &&
      dsType !== 'block_storage' &&
      dsType !== 'network_storage' &&
      dsType !== 'cloud_storage'
    ) continue;
    const prevDs = previousMetrics[dsId];
    if (!prevDs || prevDs.load === 0) continue;
    const ioFraction = dsType === 'cache' ? 0.2 : 0.5;
    ioWaitMs += prevDs.latencyMs * ioFraction;
  }
  return ioWaitMs;
}

// ---------------------------------------------------------------------------
// Edge split helper
// ---------------------------------------------------------------------------

/**
 * Given a source node's rpsOut, return the fraction that flows along the edge
 * source→target.  If any edges from source have an explicit `splitPct`, those
 * percentages are honoured; remaining percentage is distributed equally among
 * edges that have no explicit `splitPct`.
 */
function computeEdgeShare(
  sourceId: string,
  targetId: string,
  sourceOut: number,
  adj: AdjacencyMap,
  edgeConfigs: Record<string, EdgeConfig>,
  cyclingEdgeIds: Set<string>
): number {
  const downstreamIds = (adj.downstream.get(sourceId) ?? []).filter(
    (tid) => !cyclingEdgeIds.has(adj.edgeKey.get(`${sourceId}|${tid}`) ?? '')
  );
  if (downstreamIds.length === 0) return 0;

  let definedPctTotal = 0;
  let undefinedCount = 0;
  const splits: Record<string, number | undefined> = {};

  for (const tid of downstreamIds) {
    const eid = adj.edgeKey.get(`${sourceId}|${tid}`);
    const splitPct = eid !== undefined ? edgeConfigs[eid]?.splitPct : undefined;
    splits[tid] = splitPct;
    if (splitPct !== undefined) {
      definedPctTotal += splitPct;
    } else {
      undefinedCount++;
    }
  }

  const remainingPct = Math.max(0, 100 - definedPctTotal);
  const undefinedShare = undefinedCount > 0 ? remainingPct / undefinedCount : 0;

  const thisSplit = splits[targetId];
  const pct = thisSplit !== undefined ? thisSplit : undefinedShare;
  return sourceOut * pct / 100;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function runSimulationTick(
  topology: Topology,
  incomingRps: number,
  tick = 0,
  previousMetrics: Record<string, NodeMetrics> = {}
): {
  nodeMetrics: Record<string, NodeMetrics>;
  edgeMetrics: Record<string, EdgeMetrics>;
} {
  const { nodes, edges, nodeConfigs, edgeConfigs } = topology;

  if (nodes.length === 0) {
    return { nodeMetrics: {}, edgeMetrics: {} };
  }

  // ---- 1. Build adjacency & detect cycles ----
  const { adj, cyclingEdgeIds } = buildAdjacency(nodes, edges);

  // ---- 2. Topological order & source nodes ----
  const { order, sourceNodes } = topoSort(nodes, edges, adj, cyclingEdgeIds);

  const sourceIdSet = new Set(sourceNodes.map((n) => n.id));

  // ---- 3. Track computed rpsOut per node (needed for downstream calcs) ----
  const rpsOutMap = new Map<string, number>();

  // ---- 4. Track read ratio per node (fraction of rpsOut that is reads) ----
  // Propagated from traffic_generator config downstream through the graph.
  const readRatioOutMap = new Map<string, number>();

  // ---- 4.5. Resolve service mesh routing tables into effective edge splitPct overrides ----
  // For each service_mesh node with meshRoutes, match route destNodeId to downstream node IDs
  // and override the edge's splitPct so the BFS distributes traffic accordingly.
  // Deduplication: for duplicate (sourceNodeId, destNodeId) pairs only the highest weight wins.
  const resolvedEdgeConfigs = { ...edgeConfigs };
  for (const node of nodes) {
    if (getNodeType(node) !== 'service_mesh') continue;
    const meshCfg = nodeConfigs[node.id] ?? {};
    const routes = meshCfg.meshRoutes;
    if (!routes || routes.length === 0) continue;

    // Deduplicate: keep max weight per dest
    const destMaxWeight = new Map<string, number>();
    for (const r of routes) {
      if (!r.destNodeId) continue;
      const cur = destMaxWeight.get(r.destNodeId) ?? -1;
      if (r.weightPct > cur) destMaxWeight.set(r.destNodeId, r.weightPct);
    }
    if (destMaxWeight.size === 0) continue;

    const totalWeight = Array.from(destMaxWeight.values()).reduce((s, w) => s + w, 0);
    if (totalWeight === 0) continue;

    const downstreamIds = (adj.downstream.get(node.id) ?? []).filter(
      (tid) => !cyclingEdgeIds.has(adj.edgeKey.get(`${node.id}|${tid}`) ?? '')
    );
    for (const dsId of downstreamIds) {
      const weight = destMaxWeight.get(dsId);
      if (weight !== undefined) {
        const eid = adj.edgeKey.get(`${node.id}|${dsId}`);
        if (eid) {
          const normalizedPct = (weight / totalWeight) * 100;
          resolvedEdgeConfigs[eid] = {
            ...(edgeConfigs[eid] ?? { protocol: 'REST', timeoutMs: 5000, retryCount: 2, circuitBreaker: false, circuitBreakerThreshold: 50, bandwidthMbps: 0 }),
            splitPct: normalizedPct,
          };
        }
      }
    }
  }

  // ---- 4.6. Pre-compute effectively failed regions ----
  // Moved before health-aware redistribution so GA/LB can react to current-tick failures immediately.
  // A region is effectively failed if:
  //   a) its regionFailed config flag is explicitly set, OR
  //   b) every availability_zone belonging to it has zoneFailed=true
  const effectivelyFailedRegions = new Set<string>();
  for (const n of nodes) {
    if (n.type !== 'region') continue;
    const rCfg = nodeConfigs[n.id] ?? {};
    if (rCfg.regionFailed) {
      effectivelyFailedRegions.add(n.id);
      continue;
    }
    const zonesInRegion = nodes.filter(
      (z) => z.type === 'availability_zone' && nodeConfigs[z.id]?.regionId === n.id
    );
    if (zonesInRegion.length > 0 && zonesInRegion.every((z) => nodeConfigs[z.id]?.zoneFailed)) {
      effectivelyFailedRegions.add(n.id);
    }
  }

  // Helper: check if a downstream node is currently failed (region/zone config or previous tick)
  function isDownstreamFailed(id: string): boolean {
    if (previousMetrics[id]?.failed === true) return true;
    const dsCfg = nodeConfigs[id] ?? {};
    const dsRegionId = dsCfg.regionId;
    if (dsRegionId && effectivelyFailedRegions.has(dsRegionId)) return true;
    const dsZoneId = dsCfg.zoneId;
    if (dsZoneId) {
      if (nodeConfigs[dsZoneId]?.zoneFailed) return true;
      const zoneRegionId = nodeConfigs[dsZoneId]?.regionId;
      if (zoneRegionId && effectivelyFailedRegions.has(zoneRegionId)) return true;
    }
    const dsNode = nodes.find((n) => n.id === id);
    if (dsNode?.type === 'region' && effectivelyFailedRegions.has(id)) return true;
    return false;
  }

  // Helper: active zone count for a downstream node's region (used for GA proportional routing).
  // Returns the number of non-failed zones in the region the downstream belongs to.
  // Falls back to 1 if no region/zone info is available (treat as fully healthy).
  function getActiveZoneWeight(id: string): number {
    const dsCfg = nodeConfigs[id] ?? {};
    const dsNode = nodes.find((n) => n.id === id);

    let regionId: string | undefined;
    if (dsNode?.type === 'region') {
      regionId = id;
    } else {
      regionId = dsCfg.regionId;
      if (!regionId && dsCfg.zoneId) {
        regionId = nodeConfigs[dsCfg.zoneId]?.regionId;
      }
    }

    if (!regionId) return 1;

    const zonesInRegion = nodes.filter(
      (z) => z.type === 'availability_zone' && nodeConfigs[z.id]?.regionId === regionId
    );
    if (zonesInRegion.length === 0) return 1; // No zones defined — treat as fully healthy

    return zonesInRegion.filter((z) => !nodeConfigs[z.id]?.zoneFailed).length;
  }

  // ---- 4.7. Health-aware downstream redistribution ----
  // LB: equal split among healthy targets (mirrors ALB/NLB target-group health checks).
  // GA: zone-weighted split — each downstream is weighted by active zone count in its region,
  //     so a partially-degraded region receives proportionally less traffic.
  for (const node of nodes) {
    const nodeType = getNodeType(node);
    const cfg = nodeConfigs[node.id] ?? {};

    const isLb = nodeType === 'load_balancer' && (cfg.healthChecks !== false);
    const isGa = nodeType === 'global_accelerator' && (cfg.failoverEnabled !== false);
    if (!isLb && !isGa) continue;

    const downstreamIds = (adj.downstream.get(node.id) ?? []).filter(
      (tid) => !cyclingEdgeIds.has(adj.edgeKey.get(`${node.id}|${tid}`) ?? '')
    );
    if (downstreamIds.length < 2) continue;

    if (isGa) {
      // Proportional routing: weight each downstream by active zone count.
      // Failed downstreams get weight 0 (no traffic).
      const weightMap = new Map<string, number>();
      let totalWeight = 0;
      for (const dsId of downstreamIds) {
        const w = isDownstreamFailed(dsId) ? 0 : getActiveZoneWeight(dsId);
        weightMap.set(dsId, w);
        totalWeight += w;
      }
      if (totalWeight === 0) continue; // All endpoints failed — leave splits unchanged

      for (const dsId of downstreamIds) {
        const eid = adj.edgeKey.get(`${node.id}|${dsId}`);
        if (!eid) continue;
        const w = weightMap.get(dsId) ?? 0;
        resolvedEdgeConfigs[eid] = {
          ...(edgeConfigs[eid] ?? {
            protocol: 'REST', timeoutMs: 5000, retryCount: 2,
            circuitBreaker: false, circuitBreakerThreshold: 50, bandwidthMbps: 0,
          }),
          splitPct: (w / totalWeight) * 100,
        };
      }
    } else {
      // LB: equal split among healthy targets; zero out failed ones.
      const failedIds = downstreamIds.filter((id) => isDownstreamFailed(id));
      const healthyIds = downstreamIds.filter((id) => !isDownstreamFailed(id));
      if (failedIds.length === 0 || healthyIds.length === 0) continue;

      const healthyPct = 100 / healthyIds.length;
      for (const dsId of downstreamIds) {
        const eid = adj.edgeKey.get(`${node.id}|${dsId}`);
        if (!eid) continue;
        resolvedEdgeConfigs[eid] = {
          ...(edgeConfigs[eid] ?? {
            protocol: 'REST', timeoutMs: 5000, retryCount: 2,
            circuitBreaker: false, circuitBreakerThreshold: 50, bandwidthMbps: 0,
          }),
          splitPct: healthyIds.includes(dsId) ? healthyPct : 0,
        };
      }
    }
  }

  // ---- 5. BFS traversal in topological order ----
  const nodeMetrics: Record<string, NodeMetrics> = {};

  for (const node of order) {
    const type = getNodeType(node);
    const config = nodeConfigs[node.id] ?? {};

    // Determine rpsIn and readRatio
    let rpsIn: number;
    let readRatio: number; // fraction of rpsIn that is read traffic

    if (type === 'cron_job') {
      // Schedule-driven: emits at a fixed rate regardless of global incomingRps.
      const tasksPerRun = config.tasksPerRun ?? 100;
      const intervalSec = (config.intervalMinutes ?? 5) * 60;
      rpsIn = tasksPerRun / intervalSec;
      readRatio = 0.5; // cron tasks are assumed balanced
    } else if (type === 'traffic_generator') {
      // Each traffic generator has its own configurable RPS + pattern.
      const baseRps = config.generatorRps ?? 1000;
      const pattern = config.generatorPattern ?? 'steady';
      rpsIn = baseRps * getTrafficMultiplier(pattern, tick);
      readRatio = (config.readRatioPct ?? 50) / 100;
    } else if (sourceIdSet.has(node.id)) {
      // Other unconnected source nodes receive the global incoming RPS.
      rpsIn = incomingRps;
      readRatio = 0.5;
    } else {
      // Sum contributions from all upstream nodes, respecting edge splitPct.
      const upstreamIds = (adj.upstream.get(node.id) ?? []).filter(
        (uid) => !cyclingEdgeIds.has(adj.edgeKey.get(`${uid}|${node.id}`) ?? '')
      );

      if (upstreamIds.length === 0) {
        nodeMetrics[node.id] = {
          rpsIn: 0, rpsOut: 0, load: 0,
          latencyMs: 0, p99LatencyMs: 0, errorRate: 0, failed: false,
          readRatio: 0.5, readRpsIn: 0, writeRpsIn: 0,
        };
        rpsOutMap.set(node.id, 0);
        readRatioOutMap.set(node.id, 0.5);
        continue;
      }

      rpsIn = 0;
      let totalReadRpsIn = 0;
      for (const uid of upstreamIds) {
        const upstreamOut = rpsOutMap.get(uid) ?? 0;
        const share = computeEdgeShare(uid, node.id, upstreamOut, adj, resolvedEdgeConfigs, cyclingEdgeIds);
        rpsIn += share;
        totalReadRpsIn += share * (readRatioOutMap.get(uid) ?? 0.5);
      }
      // Weighted average read ratio from upstream contributions
      readRatio = rpsIn > 0 ? totalReadRpsIn / rpsIn : 0.5;
    }

    const readRpsIn = rpsIn * readRatio;
    const writeRpsIn = rpsIn * (1 - readRatio);

    // ---- Capacity & load ----
    const capacity = computeCapacity(type, config);

    // Database: compute separate read/write loads since replicas only serve reads.
    let load: number;
    let readLoad: number | undefined;
    let writeLoad: number | undefined;

    if (type === 'database') {
      const shards = config.shards ?? 1;
      const rpsPerShard = config.rpsPerShard ?? 800;
      const readReplicas = config.readReplicas ?? 0;
      const writeCapacity = shards * rpsPerShard;                        // primary only
      const dbReadCapacity = (shards + readReplicas) * rpsPerShard;      // primary + replicas
      writeLoad = writeCapacity > 0 ? writeRpsIn / writeCapacity : 0;
      readLoad  = dbReadCapacity > 0 ? readRpsIn  / dbReadCapacity  : 0;
      load = Math.max(readLoad, writeLoad);
    } else {
      load = capacity > 0 ? rpsIn / capacity : 0;
    }

    let failed = load > 1.05;

    // ---- Latency (base + queueing; may be augmented per type below) ----
    const baseLatency = computeBaseLatency(type, config);
    const queueingFactor = Math.pow(Math.min(load, 2.0), 2) * 200;
    let latencyMs = baseLatency + queueingFactor;

    // ---- Error rate ----
    let errorRate = computeErrorRate(load);

    // ---- Zone failure: force-fail all resources assigned to a failed zone ----
    if (type !== 'region' && type !== 'availability_zone' && type !== 'comment') {
      const nodeZoneId = config.zoneId;
      if (nodeZoneId) {
        const zoneConfig = nodeConfigs[nodeZoneId];
        if (zoneConfig?.zoneFailed) {
          nodeMetrics[node.id] = {
            rpsIn, rpsOut: 0, load: 2, latencyMs: 0, p99LatencyMs: 0,
            errorRate: 1, failed: true, readRatio, readRpsIn, writeRpsIn,
          };
          rpsOutMap.set(node.id, 0);
          readRatioOutMap.set(node.id, readRatio);
          continue;
        }
      }

      // ---- Region failure: force-fail resources if their region is effectively failed ----
      // Check direct regionId assignment (regional components)
      const directRegionId = config.regionId;
      if (directRegionId && effectivelyFailedRegions.has(directRegionId)) {
        nodeMetrics[node.id] = {
          rpsIn, rpsOut: 0, load: 2, latencyMs: 0, p99LatencyMs: 0,
          errorRate: 1, failed: true, readRatio, readRpsIn, writeRpsIn,
        };
        rpsOutMap.set(node.id, 0);
        readRatioOutMap.set(node.id, readRatio);
        continue;
      }
      // Check zone → region path (zonal components inside an effectively failed region)
      if (nodeZoneId) {
        const zoneRegionId = nodeConfigs[nodeZoneId]?.regionId;
        if (zoneRegionId && effectivelyFailedRegions.has(zoneRegionId)) {
          nodeMetrics[node.id] = {
            rpsIn, rpsOut: 0, load: 2, latencyMs: 0, p99LatencyMs: 0,
            errorRate: 1, failed: true, readRatio, readRpsIn, writeRpsIn,
          };
          rpsOutMap.set(node.id, 0);
          readRatioOutMap.set(node.id, readRatio);
          continue;
        }
      }
    }

    // ---- Per-type tick: rpsOut, readRatioOut, latency penalties, detail ----
    const prevNodeMetrics = previousMetrics[node.id];
    let rpsOut: number;
    let readRatioOut = readRatio;
    let detail: ComponentDetail | undefined;

    switch (type) {
      case 'cdn': {
        // Cache hit rate degrades under load (invalidation storms / hot-key eviction)
        const cacheablePct = config.cacheablePct ?? 60;
        const dropRate = computeDropRate(load);
        const baseCacheHitRate = cacheablePct / 100;
        const hitRateDegradation = Math.max(0, (load - 0.8) * 0.4);
        const effectiveHitRate = baseCacheHitRate * Math.max(0.4, 1 - hitRateDegradation);
        const readRpsOut  = readRpsIn  * (1 - effectiveHitRate) * (1 - dropRate);
        const writeRpsOut = writeRpsIn * (1 - dropRate);
        rpsOut = readRpsOut + writeRpsOut;
        readRatioOut = rpsOut > 0 ? readRpsOut / rpsOut : readRatio;
        const bandwidthGbps = (rpsIn * 0.8) / 1000; // ~100 KB avg CDN object
        detail = { kind: 'cdn', cacheHitRate: effectiveHitRate, originBypassRps: rpsIn * (1 - effectiveHitRate), bandwidthGbps };
        break;
      }

      case 'load_balancer': {
        const dropRate = computeDropRate(load);
        rpsOut = rpsIn * (1 - dropRate);
        // ~50 ms avg connection hold → 0.05 connections per rps
        const maxConns = config.maxConnections ?? 100000;
        const activeConnections = Math.min(maxConns, Math.round(rpsIn * 0.05));
        // Signals downstream auto-scale when load exceeds 75 %
        const scalingEvent = load > 0.75;
        // Count failed targets and aggregate health by downstream zone for routing status.
        const lbDownstreamIds = (adj.downstream.get(node.id) ?? []).filter(
          (tid) => !cyclingEdgeIds.has(adj.edgeKey.get(`${node.id}|${tid}`) ?? '')
        );
        const zoneAvailability = new Map<string, boolean>();
        let failedTargets = 0;

        for (const targetId of lbDownstreamIds) {
          const targetConfig = nodeConfigs[targetId];
          const zoneId = targetConfig?.zoneId;
          const regionId = targetConfig?.regionId ?? (zoneId ? nodeConfigs[zoneId]?.regionId : undefined);
          const zoneFailed = zoneId ? nodeConfigs[zoneId]?.zoneFailed === true : false;
          const regionFailed = regionId ? nodeConfigs[regionId]?.regionFailed === true : false;
          const targetFailed = zoneFailed || regionFailed || previousMetrics[targetId]?.failed === true;

          if (targetFailed) failedTargets++;

          const zoneKey = zoneId ?? targetId;
          zoneAvailability.set(zoneKey, (zoneAvailability.get(zoneKey) ?? false) || !targetFailed);
        }

        const totalZones = zoneAvailability.size;
        const availableZones = Array.from(zoneAvailability.values()).filter(Boolean).length;
        const noZonesAvailable = totalZones > 0 && availableZones === 0;

        detail = {
          kind: 'load_balancer',
          activeConnections,
          scalingEvent,
          connectionsPerSecond: rpsIn,
          failedTargets,
          availableZones,
          totalZones,
          noZonesAvailable,
        };
        break;
      }

      case 'app_server': {
        const prevD = prevNodeMetrics?.detail?.kind === 'app_server' ? prevNodeMetrics.detail : null;

        const autoscalingEnabled = config.autoscalingEnabled ?? false;
        const warmPoolEnabled    = config.warmPoolEnabled    ?? false;

        // ---- Shared config ----
        const cpuCores    = config.cpuCores    ?? 4;
        const ramGb       = config.ramGb       ?? 8;
        const workload    = config.workloadType ?? 'io_bound';

        // Nominal RPS ceiling per instance (compute-bound, IO assumed instant).
        // Each workload type implies a different bottleneck resource.
        const nominalPerInstRps = config.rpsPerInstance ?? (
          workload === 'cpu_bound'    ? cpuCores * 350 :
          workload === 'memory_bound' ? Math.min(cpuCores * 300, ramGb * 100) :
          /* io_bound */                cpuCores * 500
        );

        // ---- Downstream data-store back-pressure (Little's Law) ----
        // IO-bound workloads are fully degraded by slow stores; CPU-bound barely at all.
        const ioWaitWeight = workload === 'cpu_bound' ? 0.1 : workload === 'memory_bound' ? 0.35 : 1.0;
        const ioWaitMs  = computeDownstreamIoWaitMs(node.id, adj, nodes, previousMetrics);
        const ioScale   = baseLatency > 0 ? baseLatency / (baseLatency + ioWaitMs * ioWaitWeight) : 1;
        const perInstRps = nominalPerInstRps * ioScale;

        // cpuPct / memPct helpers — reflects which resource is actually saturating
        function computeResourcePcts(dynLoad: number): { cpuPct: number; memPct: number } {
          if (workload === 'cpu_bound')    return { cpuPct: Math.min(100, dynLoad * 97), memPct: Math.min(100, dynLoad * 45 + 10) };
          if (workload === 'memory_bound') return { cpuPct: Math.min(100, dynLoad * 60), memPct: Math.min(100, dynLoad * 97) };
          /* io_bound */                   return { cpuPct: Math.min(100, dynLoad * 50), memPct: Math.min(100, dynLoad * 55) };
        }

        if (!autoscalingEnabled) {
          // ── Static path: fixed instance count, no FSM ──────────────
          const staticInstances = config.instances ?? 2;
          const effectiveCap    = staticInstances * perInstRps;
          const dynamicLoad     = effectiveCap > 0 ? rpsIn / effectiveCap : 0;
          const { cpuPct, memPct } = computeResourcePcts(dynamicLoad);

          load      = dynamicLoad;
          failed    = dynamicLoad > 1.05;
          errorRate = computeErrorRate(dynamicLoad);
          latencyMs = baseLatency + Math.pow(Math.min(dynamicLoad, 2.0), 2) * 200 + ioWaitMs;
          rpsOut    = rpsIn * (1 - computeDropRate(dynamicLoad));

          detail = {
            kind: 'app_server', cpuPct, memPct,
            activeInstances: staticInstances,
            pendingInstances: 0, pendingCountdown: 0,
            warmReserve: 0, scalingEvent: null,
            scaleUpCooldown: 0, scaleDownCooldown: 0,
          };
        } else {
          // ── Autoscaling FSM path ───────────────────────────────────
          const minInst         = config.minInstances         ?? (config.instances ?? 2);
          const maxInst         = config.maxInstances         ?? (config.instances ?? 2) * 4;
          const warmPool        = warmPoolEnabled ? (config.warmPoolSize ?? 0) : 0;
          const scaleUpThr      = config.scaleUpCpuPct          ?? 75;
          const scaleDownThr    = config.scaleDownCpuPct        ?? 25;
          const scaleUpCDConf   = config.scaleUpCooldownTicks   ?? 4;
          const scaleDownCDConf = config.scaleDownCooldownTicks ?? 12;
          const coldTicks       = config.coldProvisionTicks     ?? 6;

          let activeInstances   = prevD?.activeInstances   ?? (config.instances ?? 2);
          let pendingInstances  = prevD?.pendingInstances  ?? 0;
          let pendingCountdown  = prevD?.pendingCountdown  ?? 0;
          let warmReserve       = warmPoolEnabled ? (prevD?.warmReserve ?? warmPool) : 0;
          let scaleUpCooldown   = prevD?.scaleUpCooldown   ?? 0;
          let scaleDownCooldown = prevD?.scaleDownCooldown ?? 0;

          // 1. Promote cold instances whose countdown has expired
          if (pendingCountdown > 0) pendingCountdown--;
          if (pendingCountdown === 0 && pendingInstances > 0) {
            activeInstances = Math.min(maxInst, activeInstances + pendingInstances);
            pendingInstances = 0;
          }

          // 2. Decrement cooldowns
          if (scaleUpCooldown   > 0) scaleUpCooldown--;
          if (scaleDownCooldown > 0) scaleDownCooldown--;

          // 3. Dynamic capacity — IO-scaled perInstRps means a slow DB forces
          //    cpuPct up even with more instances, correctly showing the DB bottleneck
          const effectiveCap = activeInstances * perInstRps;
          const dynamicLoad  = effectiveCap > 0 ? rpsIn / effectiveCap : 0;
          const { cpuPct, memPct } = computeResourcePcts(dynamicLoad);

          // 4. Scaling decision
          // Use load% (not cpuPct) as the trigger so io_bound and memory_bound
          // workloads scale correctly — cpuPct for io_bound only reaches ~50 at
          // full load, which would never cross the 75% threshold.
          const loadPct = dynamicLoad * 100;
          let scalingEvent: 'up-warm' | 'up-cold' | 'down' | null = null;
          const totalProvisioned = activeInstances + pendingInstances;

          if (loadPct > scaleUpThr && scaleUpCooldown === 0 && totalProvisioned < maxInst) {
            if (warmPoolEnabled && warmReserve > 0) {
              activeInstances++;
              warmReserve--;
              scalingEvent = 'up-warm';
            } else if (pendingInstances === 0) {
              pendingInstances = 1;
              pendingCountdown = coldTicks;
              scalingEvent = 'up-cold';
            }
            scaleUpCooldown = scaleUpCDConf;
          } else if (loadPct < scaleDownThr && scaleDownCooldown === 0 && activeInstances > minInst) {
            activeInstances--;
            if (warmPoolEnabled && warmPool > 0 && warmReserve < warmPool) warmReserve++;
            scalingEvent = 'down';
            scaleDownCooldown = scaleDownCDConf;
          }

          // 5. Override load / failed / latency / errorRate
          load      = dynamicLoad;
          failed    = dynamicLoad > 1.05;
          errorRate = computeErrorRate(dynamicLoad);
          latencyMs = baseLatency + Math.pow(Math.min(dynamicLoad, 2.0), 2) * 200 + ioWaitMs;
          rpsOut    = rpsIn * (1 - computeDropRate(dynamicLoad));

          detail = {
            kind: 'app_server', cpuPct, memPct,
            activeInstances, pendingInstances, pendingCountdown,
            warmReserve, scalingEvent,
            scaleUpCooldown, scaleDownCooldown,
          };
        }
        break;
      }

      case 'cache': {
        const memoryGb = config.memoryGb ?? 8;
        const baseHitRate = Math.min(0.85, (memoryGb / 64) * 0.85);
        // Memory fills under load → evictions → degraded hit rate
        const memoryUsedPct  = Math.min(100, load * 70 + 25);
        const evictionRate   = Math.max(0, (memoryUsedPct - 80) / 20); // 0→1 when mem 80→100 %
        const hitRate        = baseHitRate * (1 - evictionRate * 0.5);
        const dropRate       = computeDropRate(load);
        const readRpsOut  = readRpsIn  * (1 - hitRate) * (1 - dropRate);
        const writeRpsOut = writeRpsIn * (1 - dropRate);
        rpsOut = readRpsOut + writeRpsOut;
        readRatioOut = rpsOut > 0 ? readRpsOut / rpsOut : readRatio;
        detail = { kind: 'cache', hitRate, evictionRate, memoryUsedPct };
        break;
      }

      case 'database': {
        const dropRate = computeDropRate(load);
        rpsOut = rpsIn * (1 - dropRate);
        const shards  = config.shards       ?? 1;
        const replicas = config.readReplicas ?? 0;
        const poolSizePerNode  = 100; // connections per shard/replica
        const connectionPoolMax  = (shards + replicas) * poolSizePerNode;
        // avg 100 ms query → 0.1 connections consumed per rps
        const connectionPoolUsed = Math.min(connectionPoolMax, Math.round(rpsIn * 0.1));
        const queryQueueDepth    = Math.max(0, Math.round(rpsIn * 0.1 - connectionPoolMax));
        // Slow queries: lock contention grows after 60 % load
        const slowQueryRate = Math.min(0.4, Math.max(0, (load - 0.6) / 0.6) * 0.4);
        // Pool exhaustion spikes latency
        if (queryQueueDepth > 0) latencyMs += Math.min(500, queryQueueDepth * 5);
        detail = { kind: 'database', connectionPoolUsed, connectionPoolMax, queryQueueDepth, slowQueryRate };
        break;
      }

      case 'cloud_storage': {
        const dropRate = computeDropRate(load);
        rpsOut = rpsIn * 0.1 * (1 - dropRate); // ~10 % event notifications
        const throughputMbps = config.storageThroughputMbps ?? 1000;
        const objectSizeKb   = config.objectSizeKb ?? 512;
        const bwUsedMbps     = (rpsIn * objectSizeKb * 8) / 1000;
        const bandwidthUtilization = Math.min(100, (bwUsedMbps / throughputMbps) * 100);
        const throttledRequests    = Math.round(Math.max(0, rpsIn - capacity));
        detail = { kind: 'cloud_storage', throttledRequests, bandwidthUtilization };
        break;
      }

      case 'block_storage': {
        const iopsLimit = config.iops ?? 3000;
        const ioSizeKb  = config.objectSizeKb ?? 64;
        const dropRate  = computeDropRate(load);
        rpsOut = rpsIn * (1 - dropRate);

        // Stateful queue depth: accumulates when IOPS demand exceeds limit
        const prevQueueDepth = prevNodeMetrics?.detail?.kind === 'block_storage'
          ? prevNodeMetrics.detail.queueDepth : 0;
        const queueDelta = (rpsIn - iopsLimit) * 0.5;
        const queueDepth = Math.max(0, prevQueueDepth + queueDelta);

        // Queue depth increases effective latency (each pending IO adds wait time)
        if (queueDepth > 0) latencyMs += Math.min(1000, queueDepth * 0.5);

        const iopsUsed      = Math.min(iopsLimit, Math.round(rpsIn));
        const throughputMbps = (rpsIn * ioSizeKb) / (1000 / 8);
        detail = { kind: 'block_storage', iopsUsed, iopsLimit, queueDepth, throughputMbps };
        break;
      }

      case 'network_storage': {
        const throughputLimit = config.storageThroughputMbps ?? 500;
        const ioSizeKb        = config.objectSizeKb ?? 64;
        const connLimit       = config.connectionLimit ?? 100;
        const dropRate        = computeDropRate(load);
        rpsOut = rpsIn * (1 - dropRate);

        const bandwidthUsedMbps = (rpsIn * ioSizeKb * 8) / 1000;
        // Each sustained connection ≈ 10 concurrent requests
        const activeConnections = Math.min(connLimit, Math.ceil(rpsIn / 10));

        // Connection saturation adds latency (OS-level socket contention)
        if (activeConnections >= connLimit * 0.9) {
          latencyMs += 50 * (activeConnections / connLimit);
        }
        detail = { kind: 'network_storage', activeConnections, bandwidthUsedMbps, throughputLimitMbps: throughputLimit };
        break;
      }

      case 'pubsub': {
        const dropRate = computeDropRate(load);
        rpsOut = rpsIn * (1 - dropRate);
        // Subscriber lag: stateful — accumulates when producers outpace consumers
        const consumerThroughput = capacity;
        const prevLagMs = prevNodeMetrics?.detail?.kind === 'pubsub'
          ? prevNodeMetrics.detail.subscriberLagMs : 0;
        // Per 500 ms tick: lag grows/shrinks proportional to over/under-capacity ratio
        const lagDeltaMs = consumerThroughput > 0
          ? ((rpsIn - consumerThroughput) / consumerThroughput) * 500 : 0;
        const subscriberLagMs = Math.max(0, prevLagMs + lagDeltaMs);
        const unackedMessages  = Math.round(subscriberLagMs * consumerThroughput / 1000);
        detail = { kind: 'pubsub', subscriberLagMs, consumerThroughput, unackedMessages };
        break;
      }

      case 'cloud_function': {
        const maxConcurrency = config.maxConcurrency ?? 100;
        const baseExecMs     = config.avgExecutionMs ?? 200;
        const memMb          = config.functionMemoryMb ?? 256;
        const memFactor      = Math.sqrt(memMb / 256);
        const fnWorkload     = config.workloadType ?? 'io_bound';
        const fnIoWeight     = fnWorkload === 'cpu_bound' ? 0.1 : fnWorkload === 'memory_bound' ? 0.35 : 1.0;

        // IO wait inflates effective execution time; weight depends on workload type
        const ioWaitMs        = computeDownstreamIoWaitMs(node.id, adj, nodes, previousMetrics);
        const effectiveExecMs = baseExecMs + ioWaitMs * fnIoWeight;

        // Recalculate capacity and load with IO-inflated exec time
        const effectiveCap = Math.round(maxConcurrency * (1000 / effectiveExecMs) * memFactor);
        load      = effectiveCap > 0 ? rpsIn / effectiveCap : 0;
        failed    = load > 1.05;
        errorRate = computeErrorRate(load);
        latencyMs = effectiveExecMs + Math.pow(Math.min(load, 2.0), 2) * 200;

        const dropRate        = computeDropRate(load);
        rpsOut = rpsIn * (1 - dropRate);

        const concurrencyUsed = Math.min(maxConcurrency, rpsIn * effectiveExecMs / 1000);
        const prevConcurrency = prevNodeMetrics?.detail?.kind === 'cloud_function'
          ? prevNodeMetrics.detail.concurrencyUsed : 0;
        const coldStarts = Math.round(Math.max(0, concurrencyUsed - prevConcurrency) * 0.8);
        const throttledInvocations = Math.round(
          Math.max(0, rpsIn * effectiveExecMs / 1000 - maxConcurrency) * (1000 / effectiveExecMs)
        );
        if (coldStarts > 0) latencyMs += 400 * Math.min(1, coldStarts / 10);
        detail = { kind: 'cloud_function', coldStarts, throttledInvocations, concurrencyUsed };
        break;
      }

      case 'cron_job': {
        rpsOut = rpsIn; // emitted tasks pass through unchanged
        const tasksPerRun = config.tasksPerRun    ?? 100;
        const intervalMs  = (config.intervalMinutes ?? 5) * 60 * 1000;
        // ~10 ms per dispatched task (scheduling overhead)
        const lastRunDurationMs = tasksPerRun * 10;
        const overlapCount = lastRunDurationMs > intervalMs
          ? Math.ceil(lastRunDurationMs / intervalMs) : 0;
        detail = { kind: 'cron_job', overlapCount, lastRunDurationMs };
        break;
      }

      case 'worker_pool': {
        const workers        = config.workerCount    ?? 4;
        const threads        = config.threadCount    ?? 4;
        const baseTaskMs     = config.taskDurationMs ?? 500;
        const wpWorkload     = config.workloadType   ?? 'io_bound';
        const wpIoWeight     = wpWorkload === 'cpu_bound' ? 0.1 : wpWorkload === 'memory_bound' ? 0.35 : 1.0;

        // IO wait inflates effective task duration; weight depends on workload type
        const ioWaitMs        = computeDownstreamIoWaitMs(node.id, adj, nodes, previousMetrics);
        const effectiveTaskMs = baseTaskMs + ioWaitMs * wpIoWeight;

        // Recalculate capacity and load with IO-inflated task duration
        const effectiveCap = Math.round(workers * threads * (1000 / effectiveTaskMs));
        load      = effectiveCap > 0 ? rpsIn / effectiveCap : 0;
        failed    = load > 1.05;
        errorRate = computeErrorRate(load);
        latencyMs = effectiveTaskMs + Math.pow(Math.min(load, 2.0), 2) * 200;

        const dropRate = computeDropRate(load);
        rpsOut = rpsIn * (1 - dropRate);

        // Stateful queue depth — uses effective capacity so IO-slowed workers fill queue faster
        const prevQueueDepth    = prevNodeMetrics?.detail?.kind === 'worker_pool'
          ? prevNodeMetrics.detail.queueDepth : 0;
        const queueDelta        = (rpsIn - effectiveCap) * 0.5;
        const queueDepth        = Math.max(0, prevQueueDepth + queueDelta);
        const workerUtilization = Math.min(100, load * 100);
        const taskBacklogMs     = effectiveCap > 0 ? (queueDepth / effectiveCap) * 1000 : 0;
        if (queueDepth > 0) latencyMs += Math.min(5000, taskBacklogMs * 0.1);
        detail = { kind: 'worker_pool', queueDepth, workerUtilization, taskBacklogMs };
        break;
      }

      case 'rate_limiter': {
        const rpsLimit   = config.requestsPerSecond ?? 1000;
        const burst      = config.burstCapacity     ?? 200;
        const algo       = config.rateLimitAlgorithm ?? 'token_bucket';
        const maxQueueSz = config.maxQueueSize       ?? 500;
        const TICK_S     = 0.5; // seconds per simulation tick

        // Instantaneous pass-through ceiling — determines when excess starts queuing.
        // token/leaky bucket queue the excess; window algorithms reject immediately.
        let instantCap: number;
        switch (algo) {
          case 'token_bucket':   instantCap = rpsLimit + burst;           break;
          case 'leaky_bucket':   instantCap = rpsLimit;                   break;
          case 'fixed_window':   instantCap = Math.round(rpsLimit * 1.5); break;
          case 'sliding_window': instantCap = Math.round(rpsLimit * 1.2); break;
          case 'sliding_log':    instantCap = rpsLimit;                   break;
          default:               instantCap = rpsLimit;
        }

        const usesQueue = algo === 'token_bucket' || algo === 'leaky_bucket';
        const excessRps = Math.max(0, rpsIn - instantCap);

        // ---- Stateful queue (stored in requests, not RPS) ----
        const prevQueueDepth = prevNodeMetrics?.detail?.kind === 'rate_limiter'
          ? prevNodeMetrics.detail.queueDepth : 0;

        // Queue drains at rpsLimit per second; only queuing algorithms use it
        const drainRequests = usesQueue ? Math.min(prevQueueDepth, rpsLimit * TICK_S) : 0;
        const inRequests    = usesQueue ? excessRps * TICK_S : 0;
        const rawNewDepth   = prevQueueDepth + inRequests - drainRequests;
        const queueOverflow = Math.max(0, rawNewDepth - maxQueueSz);
        const queueDepth    = Math.max(0, rawNewDepth - queueOverflow);

        // Drops = queue overflow (queuing algos) or all excess (window algos — immediate 429)
        const droppedRps = usesQueue ? queueOverflow / TICK_S : excessRps;

        // Output is always hard-capped at rpsLimit regardless of algorithm.
        // instantCap only determines when queuing/dropping begins — not how much exits.
        rpsOut = Math.min(rpsIn - droppedRps, rpsLimit);

        const allowedRps   = rpsOut;
        const throttledRps = Math.max(0, rpsIn - rpsOut);
        const throttleRate = rpsIn > 0 ? throttledRps / rpsIn : 0;
        // load = queue fill fraction for queuing algos; RPS-vs-limit for window algos
        load   = usesQueue
          ? (maxQueueSz > 0 ? queueDepth / maxQueueSz : 0)
          : (instantCap > 0 ? Math.min(1, rpsIn / instantCap) : 0);
        failed    = usesQueue ? queueDepth >= maxQueueSz * 0.99 : load > 1.05;
        errorRate = throttleRate;

        // Latency: Little's Law — queue depth (requests) / drain rate (req/s)
        if (usesQueue && queueDepth > 0 && rpsLimit > 0) {
          latencyMs += Math.min(2000, (queueDepth / rpsLimit) * 1000);
        }
        if (algo === 'sliding_log') latencyMs += 2; // bookkeeping overhead

        detail = { kind: 'rate_limiter', allowedRps, throttledRps, throttleRate, queueDepth };
        break;
      }

      case 'service_mesh': {
        const mtls        = config.mtlsEnabled !== false; // default true
        const cbEnabled   = config.meshCircuitBreakerEnabled ?? false;
        const cbThreshold = (config.meshCircuitBreakerThreshold ?? 50) / 100;
        const obsLevel    = config.observabilityLevel ?? 'basic';
        const meshRetries = config.meshRetryCount ?? 1;

        const mtlsOverhead = mtls ? 1 : 0;
        const obsOverhead  = obsLevel === 'full' ? 1 : obsLevel === 'basic' ? 0.5 : 0;
        const proxyBase    = baseLatency + mtlsOverhead + obsOverhead;
        const queuePenalty = Math.pow(Math.min(load, 2.0), 2) * 200;

        // ── Observe downstream health (previous tick for stability) ──────────
        // The mesh is a synchronous pass-through: if a downstream node is slow or
        // failing, every caller waiting through the mesh sees that slowdown/error.
        const meshDownstreamIds = (adj.downstream.get(node.id) ?? []).filter(
          (tid) => !cyclingEdgeIds.has(adj.edgeKey.get(`${node.id}|${tid}`) ?? '')
        );
        let downstreamErrorRate = 0;
        let downstreamLatencyMs = 0;
        for (const tid of meshDownstreamIds) {
          const ds = previousMetrics[tid];
          if (ds) {
            // Worst-case downstream error rate: even one failing backend causes errors
            downstreamErrorRate = Math.max(downstreamErrorRate, ds.errorRate);
            // Worst-case downstream latency: slow backend stalls the proxy
            downstreamLatencyMs = Math.max(downstreamLatencyMs, ds.latencyMs);
          }
        }

        // Circuit breaker watches downstream error rate, not the mesh's own load.
        // This is the correct model: CB opens when services behind the mesh are failing.
        const circuitBroken = cbEnabled && downstreamErrorRate >= cbThreshold;

        // The mesh is communication infrastructure — the fabric itself never fails.
        // load reflects proxy throughput utilisation (very high capacity, never saturates).
        // failed is always false: only the services behind the mesh can fail.
        load   = Math.min(rpsIn / 50000, 0.95); // proxy headroom, same ceiling as LB
        failed = false;

        if (circuitBroken) {
          // Open circuit: intentional fast-fail — the mesh is healthy, acting correctly.
          // Callers see high error rate because the CB is protecting them from a bad service,
          // not because the mesh itself is broken.
          rpsOut    = rpsIn * 0.05; // 5 % passes for health probes
          errorRate = 0.95;
          latencyMs = proxyBase + 1; // fail-fast — no downstream wait
        } else {
          // Pass-through: forward traffic minus any proxy-level drops (negligible at normal load).
          rpsOut = rpsIn * (1 - computeDropRate(load));

          // Error rate reflects downstream failures flowing through the mesh.
          // The mesh itself contributes near-zero errors (computeErrorRate(load) ≈ 0).
          errorRate = downstreamErrorRate * 0.9;

          // Latency = proxy overhead + downstream wait.
          // The mesh is synchronous: it cannot return until the downstream responds.
          // A slow downstream makes every caller waiting through the mesh wait just as long.
          latencyMs = proxyBase + downstreamLatencyMs;

          if (meshRetries > 0 && downstreamErrorRate > 0) {
            // 1. Each retry adds a proxy round-trip worth of latency.
            latencyMs += downstreamErrorRate * meshRetries * baseLatency;

            // 2. Retries reduce caller-visible error rate: P(all n+1 attempts fail).
            errorRate = Math.pow(Math.min(downstreamErrorRate, 0.99), meshRetries + 1);

            // 3. Downstream sees amplified RPS from retried requests.
            const retryAmplification = 1 + downstreamErrorRate * meshRetries * 0.8;
            rpsOut = Math.min(rpsIn * 2, rpsOut * retryAmplification);
          }
        }

        const activeConnections = Math.round(rpsIn * (config.proxyOverheadMs ?? 2) / 1000);
        const mtlsHandshakeRate = mtls ? Math.round(rpsIn * 0.1) : 0;
        const retryRate = meshRetries > 0 ? Math.min(0.8, downstreamErrorRate * meshRetries) : 0;

        detail = { kind: 'service_mesh', activeConnections, mtlsHandshakeRate, circuitBroken, retryRate };
        break;
      }

      case 'global_accelerator': {
        // Anycast global routing layer — check downstream health for failover display.
        const gaDownstreamIds = (adj.downstream.get(node.id) ?? []).filter(
          (tid) => !cyclingEdgeIds.has(adj.edgeKey.get(`${node.id}|${tid}`) ?? '')
        );
        const failedDownstream = gaDownstreamIds.filter((id) => isDownstreamFailed(id));
        const activeRegions = gaDownstreamIds.length - failedDownstream.length;
        const failedRegions = failedDownstream.length;

        // Rerouted RPS: zone-weighted fraction that shifted away from failed endpoints.
        let reroutedRps = 0;
        if (failedRegions > 0 && gaDownstreamIds.length > 0) {
          let totalW = 0;
          let failedW = 0;
          for (const dsId of gaDownstreamIds) {
            const zw = getActiveZoneWeight(dsId);
            totalW += zw;
            if (isDownstreamFailed(dsId)) failedW += zw;
          }
          reroutedRps = totalW > 0 ? rpsIn * (failedW / totalW) : 0;
        }

        const dropRate = computeDropRate(load);
        rpsOut = rpsIn * (1 - dropRate);
        latencyMs = baseLatency + Math.pow(Math.min(load, 2.0), 2) * 50; // minimal queueing

        detail = { kind: 'global_accelerator', activeRegions, failedRegions, reroutedRps };
        break;
      }

      case 'region':
      case 'availability_zone': {
        // Structural container nodes — transparent pass-through with no simulation effect
        rpsOut = rpsIn;
        load = 0;
        failed = false;
        errorRate = 0;
        latencyMs = 0;
        break;
      }

      default: {
        const dropRate = computeDropRate(load);
        rpsOut = rpsIn * (1 - dropRate);
        break;
      }
    }

    const p99LatencyMs = latencyMs * 2.5;

    nodeMetrics[node.id] = {
      rpsIn,
      rpsOut,
      load,
      latencyMs,
      p99LatencyMs,
      errorRate,
      failed,
      readRatio,
      readRpsIn,
      writeRpsIn,
      ...(readLoad  !== undefined && { readLoad }),
      ...(writeLoad !== undefined && { writeLoad }),
      ...(detail    !== undefined && { detail }),
    };

    rpsOutMap.set(node.id, rpsOut);
    readRatioOutMap.set(node.id, readRatioOut);
  }

  // ---- 6. Edge metrics ----
  // Build zone/region membership maps for cross-zone latency penalties.
  // A node's region is inferred via its zone's regionId.
  const nodeZoneIdMap: Record<string, string> = {};
  const nodeRegionIdMap: Record<string, string> = {};
  for (const n of nodes) {
    const cfg = nodeConfigs[n.id] ?? {};
    if (cfg.zoneId) {
      nodeZoneIdMap[n.id] = cfg.zoneId;
      const zoneCfg = nodeConfigs[cfg.zoneId];
      if (zoneCfg?.regionId) nodeRegionIdMap[n.id] = zoneCfg.regionId;
    }
  }

  const edgeMetrics: Record<string, EdgeMetrics> = {};

  for (const edge of edges) {
    if (cyclingEdgeIds.has(edge.id)) continue;

    const sourceMetric = nodeMetrics[edge.source];
    if (!sourceMetric) continue;

    // Cross-AZ/cross-region latency penalty
    const srcZone = nodeZoneIdMap[edge.source];
    const tgtZone = nodeZoneIdMap[edge.target];
    const srcRegion = nodeRegionIdMap[edge.source];
    const tgtRegion = nodeRegionIdMap[edge.target];

    let crossLatencyMs = 0;
    if (srcRegion && tgtRegion && srcRegion !== tgtRegion) {
      crossLatencyMs = 75; // cross-region ~75 ms RTT overhead
    } else if (srcZone && tgtZone && srcZone !== tgtZone) {
      crossLatencyMs = 2;  // cross-AZ (same region) ~2 ms RTT overhead
    }

    edgeMetrics[edge.id] = {
      rps: sourceMetric.rpsOut,
      latencyMs: sourceMetric.latencyMs + crossLatencyMs,
      isBottleneck: sourceMetric.load > 0.9,
    };
  }

  return { nodeMetrics, edgeMetrics };
}

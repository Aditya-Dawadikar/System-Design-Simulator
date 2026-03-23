import type { Node, Edge } from 'reactflow';
import type { NodeConfig, EdgeConfig, NodeMetrics, EdgeMetrics, ComponentType } from '@/types';

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
  app_server: 40, // overridden by avgLatencyMs config
  cache: 1,
  database: 10,
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
      const shards = config.shards ?? 1;
      const rpsPerShard = config.rpsPerShard ?? 800;
      const readReplicas = config.readReplicas ?? 0;
      return shards * rpsPerShard + readReplicas * rpsPerShard * 0.7;
    }

    default:
      return 1000;
  }
}

function computeBaseLatency(type: ComponentType, config: NodeConfig): number {
  if (type === 'app_server') return config.avgLatencyMs ?? BASE_LATENCY.app_server;
  return BASE_LATENCY[type] ?? 10;
}

function computeErrorRate(load: number): number {
  if (load < 0.9) return 0;
  if (load >= 1.2) return 1.0;
  // linear ramp: 0 at 0.9 → 1.0 at 1.2
  return (load - 0.9) / (1.2 - 0.9);
}

function computeDropRate(load: number): number {
  return Math.max(0, (load - 1.0) * 0.8);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function runSimulationTick(
  topology: Topology,
  incomingRps: number
): {
  nodeMetrics: Record<string, NodeMetrics>;
  edgeMetrics: Record<string, EdgeMetrics>;
} {
  const { nodes, edges, nodeConfigs } = topology;

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

  // ---- 4. Track LoadBalancer → downstream distribution ----
  // For each LB node, we record how many downstream nodes it has so we can
  // distribute evenly.  We pre-compute this once.
  const lbDownstreamCount = new Map<string, number>();
  for (const node of nodes) {
    if (getNodeType(node) === 'load_balancer') {
      const ds = (adj.downstream.get(node.id) ?? []).filter(
        (tid) => !cyclingEdgeIds.has(adj.edgeKey.get(`${node.id}|${tid}`) ?? '')
      );
      lbDownstreamCount.set(node.id, ds.length);
    }
  }

  // ---- 5. BFS traversal in topological order ----
  const nodeMetrics: Record<string, NodeMetrics> = {};

  for (const node of order) {
    const type = getNodeType(node);
    const config = nodeConfigs[node.id] ?? {};

    // Determine rpsIn
    let rpsIn: number;

    if (sourceIdSet.has(node.id)) {
      // Source nodes receive the full incoming RPS
      rpsIn = incomingRps;
    } else {
      // Sum contributions from all upstream nodes
      // If an upstream node is a LoadBalancer, it divides its rpsOut evenly
      // among all its downstream neighbours.
      const upstreamIds = (adj.upstream.get(node.id) ?? []).filter(
        (uid) => !cyclingEdgeIds.has(adj.edgeKey.get(`${uid}|${node.id}`) ?? '')
      );

      if (upstreamIds.length === 0) {
        // Disconnected node — idle
        nodeMetrics[node.id] = {
          rpsIn: 0,
          rpsOut: 0,
          load: 0,
          latencyMs: 0,
          p99LatencyMs: 0,
          errorRate: 0,
          failed: false,
        };
        rpsOutMap.set(node.id, 0);
        continue;
      }

      rpsIn = 0;
      for (const uid of upstreamIds) {
        const upstreamOut = rpsOutMap.get(uid) ?? 0;
        const upstreamType = getNodeType(nodes.find((n) => n.id === uid)!);

        if (upstreamType === 'load_balancer') {
          const count = lbDownstreamCount.get(uid) ?? 1;
          rpsIn += upstreamOut / Math.max(count, 1);
        } else {
          // Multiple upstream sources → weight evenly by number of upstreams
          // (simple equal-weight distribution when no LB is present)
          rpsIn += upstreamOut / upstreamIds.length;
        }
      }
    }

    // ---- Capacity & load ----
    const capacity = computeCapacity(type, config);
    const load = capacity > 0 ? rpsIn / capacity : 0;
    const failed = load > 1.05;

    // ---- Latency ----
    const baseLatency = computeBaseLatency(type, config);
    // Queueing delay grows as load² — capped at a reasonable ceiling
    const queueingFactor = Math.pow(Math.min(load, 2.0), 2) * 200;
    const latencyMs = baseLatency + queueingFactor;
    const p99LatencyMs = latencyMs * 2.5;

    // ---- Error rate ----
    const errorRate = computeErrorRate(load);

    // ---- rpsOut — apply component-specific rules ----
    let rpsOut: number;

    switch (type) {
      case 'cdn': {
        // CDN absorbs a portion of requests via caching; only uncacheable
        // traffic propagates downstream.
        const cacheablePct = config.cacheablePct ?? 60;
        const propagationRatio = 1 - cacheablePct / 100;
        // Still apply drop rate if overloaded
        const dropRate = computeDropRate(load);
        rpsOut = rpsIn * propagationRatio * (1 - dropRate);
        break;
      }

      case 'cache': {
        // Cache hits are served locally; only misses propagate downstream.
        const memoryGb = config.memoryGb ?? 8;
        const hitRate = Math.min(0.85, (memoryGb / 64) * 0.85);
        const dropRate = computeDropRate(load);
        rpsOut = rpsIn * (1 - hitRate) * (1 - dropRate);
        break;
      }

      default: {
        const dropRate = computeDropRate(load);
        rpsOut = rpsIn * (1 - dropRate);
        break;
      }
    }

    nodeMetrics[node.id] = {
      rpsIn,
      rpsOut,
      load,
      latencyMs,
      p99LatencyMs,
      errorRate,
      failed,
    };

    rpsOutMap.set(node.id, rpsOut);
  }

  // ---- 6. Edge metrics ----
  const edgeMetrics: Record<string, EdgeMetrics> = {};

  for (const edge of edges) {
    if (cyclingEdgeIds.has(edge.id)) continue;

    const sourceMetric = nodeMetrics[edge.source];
    if (!sourceMetric) continue;

    edgeMetrics[edge.id] = {
      rps: sourceMetric.rpsOut,
      latencyMs: sourceMetric.latencyMs,
      isBottleneck: sourceMetric.load > 0.9,
    };
  }

  return { nodeMetrics, edgeMetrics };
}

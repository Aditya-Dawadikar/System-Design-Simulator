import { describe, expect, it } from 'vitest';
import { runSimulationTick } from '@/simulation/SimulationEngine';
import type { Node, Edge } from 'reactflow';
import type { NodeConfig, EdgeConfig } from '@/types';

function buildTopology(
  nodes: Node[],
  edges: Edge[],
  nodeConfigs: Record<string, NodeConfig> = {},
  edgeConfigs: Record<string, EdgeConfig> = {}
) {
  // Keep topology construction centralized so future tests can reuse
  // one fixture shape and only vary the behavior under test.
  return { nodes, edges, nodeConfigs, edgeConfigs };
}

describe('simulation-engine feature', () => {
  it('computes p99 as latency * 2.5 for app server nodes', () => {
    // Minimal graph (source -> compute) keeps this test focused on latency
    // derivation instead of routing or failure side effects.
    const nodes: Node[] = [
      { id: 'tg1', type: 'traffic_generator', position: { x: 0, y: 0 }, data: { label: 'Traffic' } },
      { id: 'app1', type: 'app_server', position: { x: 180, y: 0 }, data: { label: 'App' } },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'tg1', target: 'app1', type: 'wire' },
    ];

    const nodeConfigs: Record<string, NodeConfig> = {
      // Use steady traffic and explicit app capacity to make expectations
      // deterministic and resilient to future default-value changes.
      tg1: { generatorRps: 1000, generatorPattern: 'steady' },
      app1: { instances: 2, rpsPerInstance: 500, avgLatencyMs: 40 },
    };

    // First tick with empty previousMetrics/nodeHistory isolates pure
    // per-tick math and avoids stateful carry-over behavior.
    const result = runSimulationTick(
      buildTopology(nodes, edges, nodeConfigs),
      1000,
      0,
      {},
      {}
    );

    const appMetrics = result.nodeMetrics.app1;
    expect(appMetrics).toBeDefined();
    // This is a core engine contract: p99 is always computed as 2.5x mean latency.
    expect(appMetrics.p99LatencyMs).toBeCloseTo(appMetrics.latencyMs * 2.5, 8);
  });
});

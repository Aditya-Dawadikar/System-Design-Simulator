import { describe, expect, it } from 'vitest';
import { runSimulationTick } from '@/simulation/SimulationEngine';
import { buildTopology, edge, expectClose, node } from '../fixtures/simulationHarness';
import type { NodeConfig } from '@/types';

describe('simulation-engine feature', () => {
  it('computes p99 as latency * 2.5 for app server nodes', () => {
    // Minimal graph (source -> compute) keeps this test focused on latency
    // derivation instead of routing or failure side effects.
    const nodes = [
      node('tg1', 'traffic_generator', { x: 0, y: 0 }, 'Traffic'),
      node('app1', 'app_server', { x: 180, y: 0 }, 'App'),
    ];

    const edges = [
      edge('e1', 'tg1', 'app1'),
    ];

    const nodeConfigs = {
      // Use steady traffic and explicit app capacity to make expectations
      // deterministic and resilient to future default-value changes.
      tg1: { generatorRps: 1000, generatorPattern: 'steady' },
      app1: { instances: 2, rpsPerInstance: 500, avgLatencyMs: 40 },
    } satisfies Record<string, NodeConfig>;

    // First tick with empty previousMetrics/nodeHistory isolates pure
    // per-tick math and avoids stateful carry-over behavior.
    const result = runSimulationTick(
      buildTopology({ nodes, edges, nodeConfigs }),
      1000,
      0,
      {},
      {}
    );

    const appMetrics = result.nodeMetrics.app1;
    expect(appMetrics).toBeDefined();
    // This is a core engine contract: p99 is always computed as 2.5x mean latency.
    expectClose(appMetrics.p99LatencyMs, appMetrics.latencyMs * 2.5, 8);
  });
});

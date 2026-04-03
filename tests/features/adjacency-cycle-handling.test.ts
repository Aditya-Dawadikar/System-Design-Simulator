import { describe, expect, it, vi } from 'vitest';
import { runSimulationTick } from '@/simulation/SimulationEngine';
import {
  buildTopology,
  edge,
  expectClose,
  node,
} from '../fixtures/simulationHarness';
import type { NodeConfig } from '@/types';

describe('core-pipeline: adjacency and cycle handling', () => {
  it('builds upstream/downstream relationships for valid edges', () => {
    // A simple chain verifies adjacency-driven propagation:
    // tg -> app -> db
    const nodes = [
      node('tg', 'traffic_generator'),
      node('app', 'app_server'),
      node('db', 'database'),
    ];

    const edges = [
      edge('e_tg_app', 'tg', 'app'),
      edge('e_app_db', 'app', 'db'),
    ];

    const nodeConfigs = {
      tg: { generatorRps: 600, generatorPattern: 'steady' },
      app: { instances: 2, rpsPerInstance: 600, avgLatencyMs: 30 },
      db: { shards: 2, rpsPerShard: 600 },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(buildTopology({ nodes, edges, nodeConfigs }), 600, 0, {}, {});

    expect(result.nodeMetrics.app.rpsIn).toBeGreaterThan(0);
    expect(result.nodeMetrics.db.rpsIn).toBeGreaterThan(0);
    // If adjacency is correct, downstream db input equals app output.
    expectClose(result.nodeMetrics.db.rpsIn, result.nodeMetrics.app.rpsOut, 8);
  });

  it('ignores edges that reference missing source or target nodes', () => {
    // The invalid edges should be ignored and produce identical results to the
    // baseline topology that only includes the valid edge.
    const nodes = [
      node('tg', 'traffic_generator'),
      node('app', 'app_server'),
    ];

    const baselineEdges = [edge('e_valid', 'tg', 'app')];
    const edgesWithInvalid = [
      edge('e_valid', 'tg', 'app'),
      edge('e_missing_source', 'ghost_source', 'app'),
      edge('e_missing_target', 'tg', 'ghost_target'),
    ];

    const nodeConfigs = {
      tg: { generatorRps: 500, generatorPattern: 'steady' },
      app: { instances: 2, rpsPerInstance: 600 },
    } satisfies Record<string, NodeConfig>;

    const baseline = runSimulationTick(
      buildTopology({ nodes, edges: baselineEdges, nodeConfigs }),
      500,
      0,
      {},
      {}
    );

    const withInvalid = runSimulationTick(
      buildTopology({ nodes, edges: edgesWithInvalid, nodeConfigs }),
      500,
      0,
      {},
      {}
    );

    expectClose(withInvalid.nodeMetrics.app.rpsIn, baseline.nodeMetrics.app.rpsIn, 8);
    expectClose(withInvalid.nodeMetrics.app.rpsOut, baseline.nodeMetrics.app.rpsOut, 8);
  });

  it('detects cycle edges and excludes them from traversal effects', () => {
    // Back-edge db -> app introduces a cycle and should be skipped.
    // Expected behavior: app should still only receive traffic from tg.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const nodes = [
      node('tg', 'traffic_generator'),
      node('app', 'app_server'),
      node('db', 'database'),
    ];

    const acyclicEdges = [
      edge('e_tg_app', 'tg', 'app'),
      edge('e_app_db', 'app', 'db'),
    ];

    const cyclicEdges = [
      edge('e_tg_app', 'tg', 'app'),
      edge('e_app_db', 'app', 'db'),
      edge('e_db_app_cycle', 'db', 'app'),
    ];

    const nodeConfigs = {
      tg: { generatorRps: 700, generatorPattern: 'steady' },
      app: { instances: 2, rpsPerInstance: 700 },
      db: { shards: 2, rpsPerShard: 700 },
    } satisfies Record<string, NodeConfig>;

    const acyclic = runSimulationTick(
      buildTopology({ nodes, edges: acyclicEdges, nodeConfigs }),
      700,
      0,
      {},
      {}
    );

    const cyclic = runSimulationTick(
      buildTopology({ nodes, edges: cyclicEdges, nodeConfigs }),
      700,
      0,
      {},
      {}
    );

    // Cycle edge should not change effective propagation.
    expectClose(cyclic.nodeMetrics.app.rpsIn, acyclic.nodeMetrics.app.rpsIn, 8);
    expectClose(cyclic.nodeMetrics.db.rpsIn, acyclic.nodeMetrics.db.rpsIn, 8);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

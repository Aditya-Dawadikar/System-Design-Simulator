import { describe, expect, it } from 'vitest';
import { runSimulationTick } from '@/simulation/SimulationEngine';
import { buildTopology, edge, expectClose, node } from '../fixtures/simulationHarness';
import type { NodeConfig } from '@/types';

describe('core-pipeline: topological ordering and source detection', () => {
  it('produces stable DAG results independent of node declaration order', () => {
    // Graph:
    //        -> app_a ->
    // tg ---           -> app_merge
    //        -> app_b ->
    //
    // If topological processing is stable, changing the node array order should
    // not change computed metrics for any node.
    const edges = [
      edge('e_tg_a', 'tg', 'app_a'),
      edge('e_tg_b', 'tg', 'app_b'),
      edge('e_a_merge', 'app_a', 'app_merge'),
      edge('e_b_merge', 'app_b', 'app_merge'),
    ];

    const nodeConfigs = {
      tg: { generatorRps: 1000, generatorPattern: 'steady' },
      app_a: { instances: 2, rpsPerInstance: 1000, avgLatencyMs: 20 },
      app_b: { instances: 2, rpsPerInstance: 1000, avgLatencyMs: 20 },
      app_merge: { instances: 2, rpsPerInstance: 2000, avgLatencyMs: 25 },
    } satisfies Record<string, NodeConfig>;

    const canonical = runSimulationTick(
      buildTopology({
        nodes: [
          node('tg', 'traffic_generator'),
          node('app_a', 'app_server'),
          node('app_b', 'app_server'),
          node('app_merge', 'app_server'),
        ],
        edges,
        nodeConfigs,
      }),
      1000,
      0,
      {},
      {}
    );

    const reordered = runSimulationTick(
      buildTopology({
        // Intentionally shuffled declaration order.
        nodes: [
          node('app_merge', 'app_server'),
          node('app_b', 'app_server'),
          node('tg', 'traffic_generator'),
          node('app_a', 'app_server'),
        ],
        edges,
        nodeConfigs,
      }),
      1000,
      0,
      {},
      {}
    );

    for (const id of ['tg', 'app_a', 'app_b', 'app_merge'] as const) {
      expectClose(reordered.nodeMetrics[id].rpsIn, canonical.nodeMetrics[id].rpsIn, 8);
      expectClose(reordered.nodeMetrics[id].rpsOut, canonical.nodeMetrics[id].rpsOut, 8);
      expectClose(reordered.nodeMetrics[id].latencyMs, canonical.nodeMetrics[id].latencyMs, 8);
      expectClose(reordered.nodeMetrics[id].errorRate, canonical.nodeMetrics[id].errorRate, 8);
    }
  });

  it('treats in-degree-zero non-generator nodes as source nodes', () => {
    // source_app and isolated_app both have no upstream edges, so both should
    // receive incomingRps directly. downstream_app should only receive traffic
    // from source_app via edge propagation.
    const nodes = [
      node('source_app', 'app_server'),
      node('downstream_app', 'app_server'),
      node('isolated_app', 'app_server'),
    ];

    const edges = [
      edge('e_source_downstream', 'source_app', 'downstream_app'),
    ];

    const nodeConfigs = {
      source_app: { instances: 2, rpsPerInstance: 1000, avgLatencyMs: 20 },
      downstream_app: { instances: 2, rpsPerInstance: 1000, avgLatencyMs: 20 },
      isolated_app: { instances: 2, rpsPerInstance: 1000, avgLatencyMs: 20 },
    } satisfies Record<string, NodeConfig>;

    const incomingRps = 400;
    const result = runSimulationTick(
      buildTopology({ nodes, edges, nodeConfigs }),
      incomingRps,
      0,
      {},
      {}
    );

    expectClose(result.nodeMetrics.source_app.rpsIn, incomingRps, 8);
    expectClose(result.nodeMetrics.isolated_app.rpsIn, incomingRps, 8);
    expectClose(result.nodeMetrics.downstream_app.rpsIn, result.nodeMetrics.source_app.rpsOut, 8);

    // downstream_app must not be treated as a source because it has an upstream edge.
    expect(result.nodeMetrics.downstream_app.rpsIn).toBeLessThanOrEqual(incomingRps);
  });
});

import { describe, expect, it } from 'vitest';
import { runSimulationTick } from '@/simulation/SimulationEngine';
import { buildTopology, edge, expectClose, node } from '../fixtures/simulationHarness';
import type { NodeConfig } from '@/types';

describe('core-pipeline: route resolution order', () => {
  it('applies service mesh route overrides in pre-resolution step', () => {
    const nodes = [
      node('tg', 'traffic_generator'),
      node('mesh', 'service_mesh'),
      node('app_a', 'app_server'),
      node('app_b', 'app_server'),
    ];

    const edges = [
      edge('e_tg_mesh', 'tg', 'mesh'),
      edge('e_mesh_a', 'mesh', 'app_a'),
      edge('e_mesh_b', 'mesh', 'app_b'),
    ];

    const nodeConfigs = {
      tg: { generatorRps: 1000, generatorPattern: 'steady' },
      mesh: {
        meshRoutes: [
          { id: 'r1', sourceNodeId: 'mesh', destNodeId: 'app_a', weightPct: 70 },
          { id: 'r2', sourceNodeId: 'mesh', destNodeId: 'app_b', weightPct: 30 },
        ],
      },
      app_a: { instances: 2, rpsPerInstance: 1000 },
      app_b: { instances: 2, rpsPerInstance: 1000 },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(buildTopology({ nodes, edges, nodeConfigs }), 1000, 0, {}, {});

    const total = result.nodeMetrics.app_a.rpsIn + result.nodeMetrics.app_b.rpsIn;
    expect(total).toBeGreaterThan(0);
    expectClose(result.nodeMetrics.app_a.rpsIn / total, 0.7, 2);
    expectClose(result.nodeMetrics.app_b.rpsIn / total, 0.3, 2);
  });

  it('applies API gateway route overrides after mesh resolution without clobbering mesh hops', () => {
    // Gateway routes choose which downstream branch receives traffic,
    // then mesh routes split traffic inside the selected mesh branch.
    const nodes = [
      node('tg', 'traffic_generator'),
      node('gw', 'api_gateway'),
      node('mesh', 'service_mesh'),
      node('bypass', 'app_server'),
      node('app_a', 'app_server'),
      node('app_b', 'app_server'),
    ];

    const edges = [
      edge('e_tg_gw', 'tg', 'gw'),
      edge('e_gw_mesh', 'gw', 'mesh'),
      edge('e_gw_bypass', 'gw', 'bypass'),
      edge('e_mesh_a', 'mesh', 'app_a'),
      edge('e_mesh_b', 'mesh', 'app_b'),
    ];

    const nodeConfigs = {
      tg: { generatorRps: 1000, generatorPattern: 'steady' },
      gw: {
        gatewayRoutes: [
          { id: 'g1', path: '/all', destNodeId: 'mesh', weightPct: 100 },
          { id: 'g2', path: '/none', destNodeId: 'bypass', weightPct: 0 },
        ],
      },
      mesh: {
        meshRoutes: [
          { id: 'm1', sourceNodeId: 'mesh', destNodeId: 'app_a', weightPct: 25 },
          { id: 'm2', sourceNodeId: 'mesh', destNodeId: 'app_b', weightPct: 75 },
        ],
      },
      bypass: { instances: 2, rpsPerInstance: 1000 },
      app_a: { instances: 2, rpsPerInstance: 1000 },
      app_b: { instances: 2, rpsPerInstance: 1000 },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(buildTopology({ nodes, edges, nodeConfigs }), 1000, 0, {}, {});

    const downstreamTotal = result.nodeMetrics.app_a.rpsIn + result.nodeMetrics.app_b.rpsIn;
    expectClose(result.nodeMetrics.bypass.rpsIn, 0, 8);
    expect(downstreamTotal).toBeGreaterThan(0);
    expectClose(result.nodeMetrics.app_a.rpsIn / downstreamTotal, 0.25, 2);
    expectClose(result.nodeMetrics.app_b.rpsIn / downstreamTotal, 0.75, 2);
  });

  it('allows health-aware redistribution to overwrite prior splitPct on load balancer edges', () => {
    const nodes = [
      node('region', 'region'),
      node('az_ok', 'availability_zone'),
      node('az_failed', 'availability_zone'),
      node('tg', 'traffic_generator'),
      node('lb', 'load_balancer'),
      node('app_ok', 'app_server'),
      node('app_failed', 'app_server'),
    ];

    const edges = [
      edge('e_tg_lb', 'tg', 'lb'),
      edge('e_lb_ok', 'lb', 'app_ok'),
      edge('e_lb_failed', 'lb', 'app_failed'),
    ];

    const nodeConfigs = {
      region: { regionName: 'us-east-1' },
      az_ok: { zoneName: 'us-east-1a', regionId: 'region' },
      az_failed: { zoneName: 'us-east-1b', regionId: 'region', zoneFailed: true },
      tg: { generatorRps: 1000, generatorPattern: 'steady' },
      lb: { regionId: 'region', healthChecks: true },
      app_ok: { zoneId: 'az_ok', instances: 2, rpsPerInstance: 1000 },
      app_failed: { zoneId: 'az_failed', instances: 2, rpsPerInstance: 1000 },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(
      buildTopology({
        nodes,
        edges,
        nodeConfigs,
        edgeConfigs: {
          // Prior explicit split should be overridden by health-aware redistribution.
          e_lb_ok: {
            protocol: 'REST', timeoutMs: 5000, retryCount: 2, circuitBreaker: false,
            circuitBreakerThreshold: 50, bandwidthMbps: 0, splitPct: 20,
          },
          e_lb_failed: {
            protocol: 'REST', timeoutMs: 5000, retryCount: 2, circuitBreaker: false,
            circuitBreakerThreshold: 50, bandwidthMbps: 0, splitPct: 80,
          },
        },
      }),
      1000,
      0,
      {},
      {}
    );

    expectClose(result.nodeMetrics.app_failed.rpsIn, 0, 8);
    expectClose(result.nodeMetrics.app_ok.rpsIn, result.nodeMetrics.lb.rpsOut, 8);
  });

  it('deduplicates duplicate service mesh routes by destination using max weight', () => {
    const nodes = [
      node('tg', 'traffic_generator'),
      node('mesh', 'service_mesh'),
      node('app_a', 'app_server'),
      node('app_b', 'app_server'),
    ];

    const edges = [
      edge('e_tg_mesh', 'tg', 'mesh'),
      edge('e_mesh_a', 'mesh', 'app_a'),
      edge('e_mesh_b', 'mesh', 'app_b'),
    ];

    const nodeConfigs = {
      tg: { generatorRps: 1000, generatorPattern: 'steady' },
      mesh: {
        meshRoutes: [
          { id: 'd1', sourceNodeId: 'mesh', destNodeId: 'app_a', weightPct: 10 },
          { id: 'd2', sourceNodeId: 'mesh', destNodeId: 'app_a', weightPct: 70 },
          { id: 'd3', sourceNodeId: 'mesh', destNodeId: 'app_b', weightPct: 30 },
        ],
      },
      app_a: { instances: 2, rpsPerInstance: 1000 },
      app_b: { instances: 2, rpsPerInstance: 1000 },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(buildTopology({ nodes, edges, nodeConfigs }), 1000, 0, {}, {});

    const total = result.nodeMetrics.app_a.rpsIn + result.nodeMetrics.app_b.rpsIn;
    expect(total).toBeGreaterThan(0);
    // Max-weight dedupe should yield 70:30, not (10+70):30.
    expectClose(result.nodeMetrics.app_a.rpsIn / total, 0.7, 2);
    expectClose(result.nodeMetrics.app_b.rpsIn / total, 0.3, 2);
  });

  it('deduplicates duplicate API gateway routes by destination using max weight', () => {
    const nodes = [
      node('tg', 'traffic_generator'),
      node('gw', 'api_gateway'),
      node('svc_a', 'app_server'),
      node('svc_b', 'app_server'),
    ];

    const edges = [
      edge('e_tg_gw', 'tg', 'gw'),
      edge('e_gw_a', 'gw', 'svc_a'),
      edge('e_gw_b', 'gw', 'svc_b'),
    ];

    const nodeConfigs = {
      tg: { generatorRps: 1000, generatorPattern: 'steady' },
      gw: {
        gatewayRoutes: [
          { id: 'r1', path: '/a-low', destNodeId: 'svc_a', weightPct: 5 },
          { id: 'r2', path: '/a-high', destNodeId: 'svc_a', weightPct: 75 },
          { id: 'r3', path: '/b', destNodeId: 'svc_b', weightPct: 25 },
        ],
      },
      svc_a: { instances: 2, rpsPerInstance: 1000 },
      svc_b: { instances: 2, rpsPerInstance: 1000 },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(buildTopology({ nodes, edges, nodeConfigs }), 1000, 0, {}, {});

    const total = result.nodeMetrics.svc_a.rpsIn + result.nodeMetrics.svc_b.rpsIn;
    expect(total).toBeGreaterThan(0);
    expectClose(result.nodeMetrics.svc_a.rpsIn / total, 0.75, 2);
    expectClose(result.nodeMetrics.svc_b.rpsIn / total, 0.25, 2);
  });
});

import { describe, expect, it } from 'vitest';
import { runSimulationTick } from '@/simulation/SimulationEngine';
import { buildTopology, edge, node } from '../fixtures/simulationHarness';
import type { NodeConfig } from '@/types';

describe('core-pipeline: effective region failure precomputation', () => {
  it('marks a region as failed when regionFailed is true', () => {
    const nodes = [
      node('region_1', 'region'),
      node('tg', 'traffic_generator'),
      node('lb', 'load_balancer'),
    ];

    const edges = [edge('e_tg_lb', 'tg', 'lb')];

    const nodeConfigs = {
      region_1: { regionName: 'us-east-1', regionFailed: true },
      tg: { generatorRps: 1000, generatorPattern: 'steady' },
      lb: { regionId: 'region_1', healthChecks: true },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(buildTopology({ nodes, edges, nodeConfigs }), 1000, 0, {}, {});

    // Regional resource should be force-failed by effective region failure.
    expect(result.nodeMetrics.lb.failed).toBe(true);
    expect(result.nodeMetrics.lb.errorRate).toBe(1);
    expect(result.nodeMetrics.lb.rpsOut).toBe(0);
  });

  it('auto-fails region when all availability zones in that region are failed', () => {
    const nodes = [
      node('region_1', 'region'),
      node('az_a', 'availability_zone'),
      node('az_b', 'availability_zone'),
      node('tg', 'traffic_generator'),
      node('lb', 'load_balancer'),
    ];

    const edges = [edge('e_tg_lb', 'tg', 'lb')];

    const nodeConfigs = {
      region_1: { regionName: 'us-east-1' },
      az_a: { regionId: 'region_1', zoneFailed: true },
      az_b: { regionId: 'region_1', zoneFailed: true },
      tg: { generatorRps: 900, generatorPattern: 'steady' },
      lb: { regionId: 'region_1', healthChecks: true },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(buildTopology({ nodes, edges, nodeConfigs }), 900, 0, {}, {});

    // Region should be effectively failed even without explicit regionFailed.
    expect(result.nodeMetrics.lb.failed).toBe(true);
    expect(result.nodeMetrics.lb.errorRate).toBe(1);
    expect(result.nodeMetrics.lb.rpsOut).toBe(0);
  });

  it('keeps region healthy when at least one AZ is healthy', () => {
    const nodes = [
      node('region_1', 'region'),
      node('az_failed', 'availability_zone'),
      node('az_healthy', 'availability_zone'),
      node('tg', 'traffic_generator'),
      node('lb', 'load_balancer'),
      node('app_failed', 'app_server'),
      node('app_healthy', 'app_server'),
    ];

    const edges = [
      edge('e_tg_lb', 'tg', 'lb'),
      edge('e_lb_failed', 'lb', 'app_failed'),
      edge('e_lb_healthy', 'lb', 'app_healthy'),
    ];

    const nodeConfigs = {
      region_1: { regionName: 'us-east-1' },
      az_failed: { regionId: 'region_1', zoneFailed: true },
      az_healthy: { regionId: 'region_1', zoneFailed: false },
      tg: { generatorRps: 600, generatorPattern: 'steady' },
      lb: { regionId: 'region_1', healthChecks: true },
      app_failed: { zoneId: 'az_failed', instances: 1, rpsPerInstance: 700 },
      app_healthy: { zoneId: 'az_healthy', instances: 2, rpsPerInstance: 700 },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(buildTopology({ nodes, edges, nodeConfigs }), 600, 0, {}, {});

    // Region should not be globally failed; healthy AZ resources should continue serving.
    expect(result.nodeMetrics.lb.failed).toBe(false);
    expect(result.nodeMetrics.app_healthy.failed).toBe(false);
    expect(result.nodeMetrics.app_healthy.rpsIn).toBeGreaterThan(0);

    // Failed AZ resource is still force-failed independently.
    expect(result.nodeMetrics.app_failed.failed).toBe(true);
    expect(result.nodeMetrics.app_failed.rpsOut).toBe(0);
  });
});

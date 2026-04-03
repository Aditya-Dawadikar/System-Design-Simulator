import { describe, expect, it } from 'vitest';
import { runSimulationTick } from '@/simulation/SimulationEngine';
import { buildTopology, edge, expectClose, node } from '../fixtures/simulationHarness';
import type { EdgeConfig, NodeConfig } from '@/types';

describe('core-pipeline: health-aware redistribution', () => {
  it('load balancer redistributes equally across healthy targets', () => {
    const nodes = [
      node('region_1', 'region'),
      node('az_a', 'availability_zone'),
      node('az_b_failed', 'availability_zone'),
      node('az_c', 'availability_zone'),
      node('tg', 'traffic_generator'),
      node('lb', 'load_balancer'),
      node('app_a', 'app_server'),
      node('app_b_failed', 'app_server'),
      node('app_c', 'app_server'),
    ];

    const edges = [
      edge('e_tg_lb', 'tg', 'lb'),
      edge('e_lb_a', 'lb', 'app_a'),
      edge('e_lb_b', 'lb', 'app_b_failed'),
      edge('e_lb_c', 'lb', 'app_c'),
    ];

    const nodeConfigs = {
      region_1: { regionName: 'us-east-1' },
      az_a: { regionId: 'region_1' },
      az_b_failed: { regionId: 'region_1', zoneFailed: true },
      az_c: { regionId: 'region_1' },
      tg: { generatorRps: 1000, generatorPattern: 'steady' },
      lb: { regionId: 'region_1', healthChecks: true },
      app_a: { zoneId: 'az_a', instances: 2, rpsPerInstance: 1000 },
      app_b_failed: { zoneId: 'az_b_failed', instances: 2, rpsPerInstance: 1000 },
      app_c: { zoneId: 'az_c', instances: 2, rpsPerInstance: 1000 },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(buildTopology({ nodes, edges, nodeConfigs }), 1000, 0, {}, {});

    const healthyTotal = result.nodeMetrics.app_a.rpsIn + result.nodeMetrics.app_c.rpsIn;
    expect(healthyTotal).toBeGreaterThan(0);
    expectClose(result.nodeMetrics.app_a.rpsIn / healthyTotal, 0.5, 2);
    expectClose(result.nodeMetrics.app_c.rpsIn / healthyTotal, 0.5, 2);
  });

  it('load balancer sets failed targets to zero share', () => {
    const nodes = [
      node('region_1', 'region'),
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
      region_1: { regionName: 'us-east-1' },
      az_ok: { regionId: 'region_1' },
      az_failed: { regionId: 'region_1', zoneFailed: true },
      tg: { generatorRps: 800, generatorPattern: 'steady' },
      lb: { regionId: 'region_1', healthChecks: true },
      app_ok: { zoneId: 'az_ok', instances: 2, rpsPerInstance: 1000 },
      app_failed: { zoneId: 'az_failed', instances: 2, rpsPerInstance: 1000 },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(buildTopology({ nodes, edges, nodeConfigs }), 800, 0, {}, {});

    expectClose(result.nodeMetrics.app_failed.rpsIn, 0, 8);
    expectClose(result.nodeMetrics.app_ok.rpsIn, result.nodeMetrics.lb.rpsOut, 8);
  });

  it('global accelerator weights downstream by active zone counts', () => {
    const nodes = [
      node('region_us', 'region'),
      node('region_eu', 'region'),
      node('az_us_a', 'availability_zone'),
      node('az_us_b', 'availability_zone'),
      node('az_eu_a', 'availability_zone'),
      node('az_eu_b_failed', 'availability_zone'),
      node('tg', 'traffic_generator'),
      node('ga', 'global_accelerator'),
      node('lb_us', 'load_balancer'),
      node('lb_eu', 'load_balancer'),
    ];

    const edges = [
      edge('e_tg_ga', 'tg', 'ga'),
      edge('e_ga_us', 'ga', 'lb_us'),
      edge('e_ga_eu', 'ga', 'lb_eu'),
    ];

    const nodeConfigs = {
      region_us: { regionName: 'us-east-1' },
      region_eu: { regionName: 'eu-west-1' },
      az_us_a: { regionId: 'region_us' },
      az_us_b: { regionId: 'region_us' },
      az_eu_a: { regionId: 'region_eu' },
      az_eu_b_failed: { regionId: 'region_eu', zoneFailed: true },
      tg: { generatorRps: 1200, generatorPattern: 'steady' },
      ga: { failoverEnabled: true },
      lb_us: { regionId: 'region_us', healthChecks: true },
      lb_eu: { regionId: 'region_eu', healthChecks: true },
    } satisfies Record<string, NodeConfig>;

    const result = runSimulationTick(buildTopology({ nodes, edges, nodeConfigs }), 1200, 0, {}, {});

    const ratio = result.nodeMetrics.lb_us.rpsIn / result.nodeMetrics.lb_eu.rpsIn;
    // region_us has 2 healthy zones, region_eu has 1 healthy zone => expected 2:1 routing.
    expectClose(ratio, 2, 1);
  });

  it('global accelerator keeps existing split when all downstream targets are failed', () => {
    const nodes = [
      node('region_a', 'region'),
      node('region_b', 'region'),
      node('tg', 'traffic_generator'),
      node('ga', 'global_accelerator'),
      node('lb_a', 'load_balancer'),
      node('lb_b', 'load_balancer'),
    ];

    const edges = [
      edge('e_tg_ga', 'tg', 'ga'),
      edge('e_ga_a', 'ga', 'lb_a'),
      edge('e_ga_b', 'ga', 'lb_b'),
    ];

    const nodeConfigs = {
      region_a: { regionName: 'us-east-1', regionFailed: true },
      region_b: { regionName: 'eu-west-1', regionFailed: true },
      tg: { generatorRps: 1000, generatorPattern: 'steady' },
      ga: { failoverEnabled: true },
      lb_a: { regionId: 'region_a' },
      lb_b: { regionId: 'region_b' },
    } satisfies Record<string, NodeConfig>;

    const edgeConfigs = {
      e_ga_a: {
        protocol: 'REST',
        timeoutMs: 5000,
        retryCount: 2,
        circuitBreaker: false,
        circuitBreakerThreshold: 50,
        bandwidthMbps: 0,
        splitPct: 80,
      },
      e_ga_b: {
        protocol: 'REST',
        timeoutMs: 5000,
        retryCount: 2,
        circuitBreaker: false,
        circuitBreakerThreshold: 50,
        bandwidthMbps: 0,
        splitPct: 20,
      },
    } satisfies Record<string, EdgeConfig>;

    const result = runSimulationTick(
      buildTopology({ nodes, edges, nodeConfigs, edgeConfigs }),
      1000,
      0,
      {},
      {}
    );

    const total = result.nodeMetrics.lb_a.rpsIn + result.nodeMetrics.lb_b.rpsIn;
    expect(total).toBeGreaterThan(0);
    // Since all targets are failed, GA health-aware redistribution should skip override
    // and preserve configured split (80/20).
    expectClose(result.nodeMetrics.lb_a.rpsIn / total, 0.8, 2);
    expectClose(result.nodeMetrics.lb_b.rpsIn / total, 0.2, 2);
  });
});

import { expect } from 'vitest';
import type { Edge, Node, XYPosition } from 'reactflow';
import type { EdgeConfig, NodeConfig, NodeMetrics } from '@/types';

interface Topology {
  nodes: Node[];
  edges: Edge[];
  nodeConfigs: Record<string, NodeConfig>;
  edgeConfigs: Record<string, EdgeConfig>;
}

interface FixtureResult {
  topology: Topology;
  ids: Record<string, string>;
}

const DEFAULT_POSITION: XYPosition = { x: 0, y: 0 };

export function node(
  id: string,
  type: Node['type'],
  position: XYPosition = DEFAULT_POSITION,
  label?: string
): Node {
  return {
    id,
    type,
    position,
    data: { label: label ?? id },
  };
}

export function edge(
  id: string,
  source: string,
  target: string,
  type: Edge['type'] = 'wire'
): Edge {
  return { id, source, target, type };
}

export function buildTopology(input: Partial<Topology> = {}): Topology {
  return {
    nodes: input.nodes ?? [],
    edges: input.edges ?? [],
    nodeConfigs: input.nodeConfigs ?? {},
    edgeConfigs: input.edgeConfigs ?? {},
  };
}

export function metric(overrides: Partial<NodeMetrics> = {}): NodeMetrics {
  return {
    rpsIn: 0,
    rpsOut: 0,
    load: 0,
    latencyMs: 0,
    p99LatencyMs: 0,
    errorRate: 0,
    failed: false,
    readRatio: 0.5,
    readRpsIn: 0,
    writeRpsIn: 0,
    badRatio: 0,
    badRpsIn: 0,
    ...overrides,
  };
}

export function previousMetrics(metrics: Record<string, Partial<NodeMetrics>>): Record<string, NodeMetrics> {
  const result: Record<string, NodeMetrics> = {};
  for (const [id, value] of Object.entries(metrics)) {
    result[id] = metric(value);
  }
  return result;
}

export function nodeHistory(historyByNode: Record<string, number[]>): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const [id, values] of Object.entries(historyByNode)) {
    result[id] = [...values];
  }
  return result;
}

export function expectClose(actual: number, expected: number, digits = 8): void {
  expect(actual).toBeCloseTo(expected, digits);
}

export function expectRatio(actual: number): void {
  expect(actual).toBeGreaterThanOrEqual(0);
  expect(actual).toBeLessThanOrEqual(1);
}

export function fixtureMultiAz(): FixtureResult {
  const ids = {
    region: 'region_1',
    azA: 'az_a',
    azB: 'az_b',
    tg: 'tg_1',
    lb: 'lb_1',
    appA: 'app_a',
    appB: 'app_b',
  };

  const topology = buildTopology({
    nodes: [
      node(ids.region, 'region'),
      node(ids.azA, 'availability_zone'),
      node(ids.azB, 'availability_zone'),
      node(ids.tg, 'traffic_generator'),
      node(ids.lb, 'load_balancer'),
      node(ids.appA, 'app_server'),
      node(ids.appB, 'app_server'),
    ],
    edges: [
      edge('e_tg_lb', ids.tg, ids.lb),
      edge('e_lb_a', ids.lb, ids.appA),
      edge('e_lb_b', ids.lb, ids.appB),
    ],
    nodeConfigs: {
      [ids.region]: { regionName: 'us-east-1' },
      [ids.azA]: { zoneName: 'us-east-1a', regionId: ids.region },
      [ids.azB]: { zoneName: 'us-east-1b', regionId: ids.region },
      [ids.tg]: { generatorRps: 1200, generatorPattern: 'steady' },
      [ids.lb]: { regionId: ids.region, healthChecks: true },
      [ids.appA]: { zoneId: ids.azA, instances: 1, rpsPerInstance: 600 },
      [ids.appB]: { zoneId: ids.azB, instances: 1, rpsPerInstance: 600 },
    },
  });

  return { topology, ids };
}

export function fixtureMultiRegion(): FixtureResult {
  const ids = {
    regionUs: 'region_us',
    regionEu: 'region_eu',
    azUsA: 'az_us_a',
    azUsB: 'az_us_b',
    azEuA: 'az_eu_a',
    azEuB: 'az_eu_b',
    tg: 'tg_global',
    ga: 'ga_1',
    lbUs: 'lb_us',
    lbEu: 'lb_eu',
    appUs: 'app_us',
    appEu: 'app_eu',
  };

  const topology = buildTopology({
    nodes: [
      node(ids.regionUs, 'region'),
      node(ids.regionEu, 'region'),
      node(ids.azUsA, 'availability_zone'),
      node(ids.azUsB, 'availability_zone'),
      node(ids.azEuA, 'availability_zone'),
      node(ids.azEuB, 'availability_zone'),
      node(ids.tg, 'traffic_generator'),
      node(ids.ga, 'global_accelerator'),
      node(ids.lbUs, 'load_balancer'),
      node(ids.lbEu, 'load_balancer'),
      node(ids.appUs, 'app_server'),
      node(ids.appEu, 'app_server'),
    ],
    edges: [
      edge('e_tg_ga', ids.tg, ids.ga),
      edge('e_ga_us', ids.ga, ids.lbUs),
      edge('e_ga_eu', ids.ga, ids.lbEu),
      edge('e_lb_us_app', ids.lbUs, ids.appUs),
      edge('e_lb_eu_app', ids.lbEu, ids.appEu),
    ],
    nodeConfigs: {
      [ids.regionUs]: { regionName: 'us-east-1' },
      [ids.regionEu]: { regionName: 'eu-west-1' },
      [ids.azUsA]: { zoneName: 'us-east-1a', regionId: ids.regionUs },
      [ids.azUsB]: { zoneName: 'us-east-1b', regionId: ids.regionUs },
      [ids.azEuA]: { zoneName: 'eu-west-1a', regionId: ids.regionEu },
      [ids.azEuB]: { zoneName: 'eu-west-1b', regionId: ids.regionEu },
      [ids.tg]: { generatorRps: 2000, generatorPattern: 'steady' },
      [ids.ga]: { failoverEnabled: true, routingPolicy: 'latency' },
      [ids.lbUs]: { regionId: ids.regionUs, healthChecks: true },
      [ids.lbEu]: { regionId: ids.regionEu, healthChecks: true },
      [ids.appUs]: { zoneId: ids.azUsA, instances: 2, rpsPerInstance: 600 },
      [ids.appEu]: { zoneId: ids.azEuA, instances: 2, rpsPerInstance: 600 },
    },
  });

  return { topology, ids };
}

export function fixtureReadWriteSplit(): FixtureResult {
  const ids = {
    tg: 'tg_rw',
    app: 'app_rw',
    dbRead: 'db_read',
    dbWrite: 'db_write',
  };

  const topology = buildTopology({
    nodes: [
      node(ids.tg, 'traffic_generator'),
      node(ids.app, 'app_server'),
      node(ids.dbRead, 'database'),
      node(ids.dbWrite, 'database'),
    ],
    edges: [
      edge('e_tg_app', ids.tg, ids.app),
      edge('e_app_read', ids.app, ids.dbRead),
      edge('e_app_write', ids.app, ids.dbWrite),
    ],
    nodeConfigs: {
      [ids.tg]: {
        generatorRps: 1000,
        generatorPattern: 'steady',
        readRatioPct: 70,
      },
      [ids.app]: {
        instances: 2,
        rpsPerInstance: 600,
      },
      [ids.dbRead]: {
        dbRole: 'replica',
        shards: 1,
        rpsPerShard: 900,
      },
      [ids.dbWrite]: {
        dbRole: 'primary',
        shards: 1,
        rpsPerShard: 900,
      },
    },
    edgeConfigs: {
      e_app_read: {
        protocol: 'REST',
        timeoutMs: 5000,
        retryCount: 2,
        circuitBreaker: false,
        circuitBreakerThreshold: 50,
        bandwidthMbps: 0,
        splitPct: 50,
        readSplitPct: 80,
        writeSplitPct: 20,
      },
      e_app_write: {
        protocol: 'REST',
        timeoutMs: 5000,
        retryCount: 2,
        circuitBreaker: false,
        circuitBreakerThreshold: 50,
        bandwidthMbps: 0,
        splitPct: 50,
        readSplitPct: 20,
        writeSplitPct: 80,
      },
    },
  });

  return { topology, ids };
}

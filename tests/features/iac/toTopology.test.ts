import { describe, expect, it } from 'vitest';
import { toTopology } from '@/iac/toTopology';
import type { IacDocument } from '@/iac/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(overrides: Partial<IacDocument> = {}): IacDocument {
  return { version: 1, name: 'test', resources: [], ...overrides };
}

// ---------------------------------------------------------------------------
// Node / edge counts
// ---------------------------------------------------------------------------

describe('toTopology — node and edge counts', () => {
  it('produces zero nodes and edges for an empty document', () => {
    const { nodes, edges } = toTopology(makeDoc());
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('creates one region node and one zone node from regions[]', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
    });
    const { nodes } = toTopology(doc);
    expect(nodes.filter((n) => n.type === 'region')).toHaveLength(1);
    expect(nodes.filter((n) => n.type === 'availability_zone')).toHaveLength(1);
  });

  it('creates two region nodes and four zone nodes for two regions with two zones each', () => {
    const doc = makeDoc({
      regions: [
        { id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }, { id: 'z2', label: 'z2' }] },
        { id: 'r2', label: 'r2', zones: [{ id: 'z3', label: 'z3' }, { id: 'z4', label: 'z4' }] },
      ],
    });
    const { nodes } = toTopology(doc);
    expect(nodes.filter((n) => n.type === 'region')).toHaveLength(2);
    expect(nodes.filter((n) => n.type === 'availability_zone')).toHaveLength(4);
  });

  it('creates resource nodes for each resource in resources[]', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [
        { id: 'tgen', type: 'traffic_generator' },
        { id: 'cdn', type: 'cdn' },
        { id: 'lb', type: 'load_balancer', placement: { region: 'r1' } },
        { id: 'app', type: 'app_server', placement: { zone: 'z1' } },
        { id: 'db', type: 'database', placement: { zone: 'z1' } },
      ],
    });
    const { nodes } = toTopology(doc);
    // 1 region + 1 zone + 5 resources = 7
    expect(nodes).toHaveLength(7);
  });

  it('creates one edge per connection', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [
        { id: 'a', type: 'traffic_generator' },
        { id: 'b', type: 'app_server', placement: { zone: 'z1' } },
        { id: 'c', type: 'database', placement: { zone: 'z1' } },
      ],
      connections: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ],
    });
    const { edges } = toTopology(doc);
    expect(edges).toHaveLength(2);
  });

  it('does not create resource nodes for container types (region, availability_zone) in resources[]', () => {
    const doc = makeDoc({
      resources: [
        { id: 'r1', type: 'region' },
        { id: 'z1', type: 'availability_zone' },
        { id: 'tgen', type: 'traffic_generator' },
      ],
    });
    const { nodes } = toTopology(doc);
    // Container types in resources[] are skipped
    expect(nodes.filter((n) => n.id === 'tgen')).toHaveLength(1);
    expect(nodes.filter((n) => n.id === 'r1' || n.id === 'z1')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// NodeConfig mapping
// ---------------------------------------------------------------------------

describe('toTopology — nodeConfig mapping', () => {
  it('sets nodeConfig.label from the resource label field', () => {
    const doc = makeDoc({
      resources: [{ id: 'tgen', type: 'traffic_generator', label: 'My Generator' }],
    });
    const { nodeConfigs } = toTopology(doc);
    expect(nodeConfigs['tgen'].label).toBe('My Generator');
  });

  it('maps spec fields directly to nodeConfig', () => {
    const doc = makeDoc({
      resources: [
        {
          id: 'cdn1',
          type: 'cdn',
          spec: { pops: 5, cacheablePct: 75, bandwidthGbps: 200 },
        },
      ],
    });
    const { nodeConfigs } = toTopology(doc);
    expect(nodeConfigs['cdn1'].pops).toBe(5);
    expect(nodeConfigs['cdn1'].cacheablePct).toBe(75);
    expect(nodeConfigs['cdn1'].bandwidthGbps).toBe(200);
  });

  it('maps deploy fields to nodeConfig for app_server', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [
        {
          id: 'app1',
          type: 'app_server',
          placement: { zone: 'z1' },
          deploy: {
            instances: 4,
            cpuCores: 8,
            ramGb: 16,
            rpsPerInstance: 600,
            workloadType: 'cpu_bound',
          },
        },
      ],
    });
    const { nodeConfigs } = toTopology(doc);
    const cfg = nodeConfigs['app1'];
    expect(cfg.instances).toBe(4);
    expect(cfg.cpuCores).toBe(8);
    expect(cfg.ramGb).toBe(16);
    expect(cfg.rpsPerInstance).toBe(600);
    expect(cfg.workloadType).toBe('cpu_bound');
  });

  it('flattens deploy.autoscaling into nodeConfig fields', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [
        {
          id: 'app1',
          type: 'app_server',
          placement: { zone: 'z1' },
          deploy: {
            instances: 2,
            autoscaling: {
              enabled: true,
              strategy: 'target_tracking',
              minInstances: 2,
              maxInstances: 10,
              targetMetric: 'load',
              targetValue: 70,
            },
          },
        },
      ],
    });
    const { nodeConfigs } = toTopology(doc);
    const cfg = nodeConfigs['app1'];
    expect(cfg.autoscalingEnabled).toBe(true);
    expect(cfg.autoscalingStrategy).toBe('target_tracking');
    expect(cfg.minInstances).toBe(2);
    expect(cfg.maxInstances).toBe(10);
    expect(cfg.targetMetric).toBe('load');
    expect(cfg.targetValue).toBe(70);
  });

  it('sets nodeConfig.zoneId from placement.zone', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [
        { id: 'app', type: 'app_server', placement: { zone: 'z1' } },
      ],
    });
    const { nodeConfigs } = toTopology(doc);
    expect(nodeConfigs['app'].zoneId).toBe('z1');
  });

  it('sets nodeConfig.regionId from placement.region', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1' }],
      resources: [
        { id: 'lb', type: 'load_balancer', placement: { region: 'r1' } },
      ],
    });
    const { nodeConfigs } = toTopology(doc);
    expect(nodeConfigs['lb'].regionId).toBe('r1');
  });

  it('sets regionId for zone nodes', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
    });
    const { nodeConfigs } = toTopology(doc);
    expect(nodeConfigs['z1'].regionId).toBe('r1');
  });

  it('sets zoneId on app_server nodeConfig from zone placement', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [
        { id: 'app', type: 'app_server', placement: { zone: 'z1' } },
      ],
    });
    const { nodeConfigs } = toTopology(doc);
    // regionId is resolved from zone → region mapping
    expect(nodeConfigs['app'].regionId).toBe('r1');
    expect(nodeConfigs['app'].zoneId).toBe('z1');
  });

  it('maps database spec fields correctly', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [
        {
          id: 'db',
          type: 'database',
          placement: { zone: 'z1' },
          spec: {
            engine: 'PostgreSQL',
            shards: 2,
            storageGb: 500,
            maxConnections: 400,
            dbRole: 'primary',
          },
        },
      ],
    });
    const { nodeConfigs } = toTopology(doc);
    expect(nodeConfigs['db'].engine).toBe('PostgreSQL');
    expect(nodeConfigs['db'].shards).toBe(2);
    expect(nodeConfigs['db'].storageGb).toBe(500);
    expect(nodeConfigs['db'].maxConnections).toBe(400);
    expect(nodeConfigs['db'].dbRole).toBe('primary');
  });

  it('applies ComponentDefinition defaults for fields not set in spec', () => {
    const doc = makeDoc({
      resources: [{ id: 'cdn1', type: 'cdn' }],
    });
    const { nodeConfigs } = toTopology(doc);
    // Default pops=2 from COMPONENT_DEFINITIONS
    expect(nodeConfigs['cdn1'].pops).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// EdgeConfig mapping
// ---------------------------------------------------------------------------

describe('toTopology — edgeConfig mapping', () => {
  it('creates an edgeConfig for every connection', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [
        { id: 'a', type: 'traffic_generator' },
        { id: 'b', type: 'app_server', placement: { zone: 'z1' } },
      ],
      connections: [{ from: 'a', to: 'b' }],
    });
    const { edges, edgeConfigs } = toTopology(doc);
    expect(edges).toHaveLength(1);
    expect(edgeConfigs[edges[0].id]).toBeDefined();
  });

  it('maps protocol from connection to edgeConfig', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [
        { id: 'a', type: 'traffic_generator' },
        { id: 'b', type: 'app_server', placement: { zone: 'z1' } },
      ],
      connections: [{ from: 'a', to: 'b', protocol: 'gRPC', timeoutMs: 2000, splitPct: 60 }],
    });
    const { edges, edgeConfigs } = toTopology(doc);
    const cfg = edgeConfigs[edges[0].id];
    expect(cfg.protocol).toBe('gRPC');
    expect(cfg.timeoutMs).toBe(2000);
    expect(cfg.splitPct).toBe(60);
  });

  it('uses DEFAULT_EDGE_CONFIG values for fields not in connection', () => {
    const doc = makeDoc({
      resources: [
        { id: 'a', type: 'traffic_generator' },
        { id: 'b', type: 'cdn' },
      ],
      connections: [{ from: 'a', to: 'b' }],
    });
    const { edges, edgeConfigs } = toTopology(doc);
    const cfg = edgeConfigs[edges[0].id];
    expect(cfg.protocol).toBe('REST');    // DEFAULT_EDGE_CONFIG.protocol
    expect(cfg.retryCount).toBe(2);       // DEFAULT_EDGE_CONFIG.retryCount
    expect(cfg.circuitBreaker).toBe(false); // DEFAULT_EDGE_CONFIG.circuitBreaker
  });

  it('generates unique edge IDs for duplicate from→to pairs', () => {
    const doc = makeDoc({
      resources: [
        { id: 'a', type: 'traffic_generator' },
        { id: 'b', type: 'cdn' },
      ],
      connections: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' },
      ],
    });
    const { edges } = toTopology(doc);
    const ids = edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });
});

// ---------------------------------------------------------------------------
// Node positions (layout sanity checks)
// ---------------------------------------------------------------------------

describe('toTopology — node positions', () => {
  it('assigns distinct x positions to global resources', () => {
    const doc = makeDoc({
      resources: [
        { id: 'tgen', type: 'traffic_generator' },
        { id: 'cdn', type: 'cdn' },
        { id: 'ga', type: 'global_accelerator' },
      ],
    });
    const { nodes } = toTopology(doc);
    const xs = nodes.map((n) => n.position.x);
    expect(new Set(xs).size).toBe(3); // all different
  });

  it('positions region nodes below global resources', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1' }],
      resources: [{ id: 'tgen', type: 'traffic_generator' }],
    });
    const { nodes } = toTopology(doc);
    const tgenY = nodes.find((n) => n.id === 'tgen')!.position.y;
    const regionY = nodes.find((n) => n.id === 'r1')!.position.y;
    expect(regionY).toBeGreaterThan(tgenY);
  });

  it('positions zone nodes below the region node', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
    });
    const { nodes } = toTopology(doc);
    const regionY = nodes.find((n) => n.id === 'r1')!.position.y;
    const zoneY = nodes.find((n) => n.id === 'z1')!.position.y;
    expect(zoneY).toBeGreaterThan(regionY);
  });

  it('positions zonal resources inside their zone (below zone top)', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [{ id: 'app', type: 'app_server', placement: { zone: 'z1' } }],
    });
    const { nodes } = toTopology(doc);
    const zoneY = nodes.find((n) => n.id === 'z1')!.position.y;
    const appY = nodes.find((n) => n.id === 'app')!.position.y;
    expect(appY).toBeGreaterThan(zoneY);
  });

  it('positions two regions side by side (different x positions)', () => {
    const doc = makeDoc({
      regions: [
        { id: 'r1', label: 'r1' },
        { id: 'r2', label: 'r2' },
      ],
    });
    const { nodes } = toTopology(doc);
    const r1x = nodes.find((n) => n.id === 'r1')!.position.x;
    const r2x = nodes.find((n) => n.id === 'r2')!.position.x;
    expect(r1x).not.toBe(r2x);
  });
});

// ---------------------------------------------------------------------------
// Example YAML files round-trip parse + convert
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { parseDocument } from '@/iac/parser';

const EXAMPLES_DIR = path.resolve(__dirname, '../../../src/iac/examples');

describe('toTopology — example YAML files', () => {
  it('converts three-tier.yaml to a valid topology', () => {
    const text = fs.readFileSync(path.join(EXAMPLES_DIR, 'three-tier.yaml'), 'utf-8');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const topo = toTopology(parsed.document);
    // At minimum: 1 region + 1 zone + 6 resources
    expect(topo.nodes.length).toBeGreaterThanOrEqual(6);
    // All resource IDs from YAML must exist as node IDs
    for (const res of parsed.document.resources) {
      expect(topo.nodes.some((n) => n.id === res.id)).toBe(true);
    }
    // Connections become edges
    expect(topo.edges.length).toBe(parsed.document.connections?.length ?? 0);
  });

  it('converts multi-az.yaml to a valid topology with correct placement', () => {
    const text = fs.readFileSync(path.join(EXAMPLES_DIR, 'multi-az.yaml'), 'utf-8');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const topo = toTopology(parsed.document);
    // Two regions declared
    expect(topo.nodes.filter((n) => n.type === 'region')).toHaveLength(2);
    // Four zones total
    expect(topo.nodes.filter((n) => n.type === 'availability_zone')).toHaveLength(4);
    // app-use1a should have zoneId = 'use1a'
    expect(topo.nodeConfigs['app-use1a']?.zoneId).toBe('use1a');
    // autoscaling should be set on app-use1a
    expect(topo.nodeConfigs['app-use1a']?.autoscalingEnabled).toBe(true);
    expect(topo.nodeConfigs['app-use1a']?.autoscalingStrategy).toBe('target_tracking');
    // db replica should have primaryNodeId set
    expect(topo.nodeConfigs['db-replica-use1']?.dbRole).toBe('replica');
    expect(topo.nodeConfigs['db-replica-use1']?.primaryNodeId).toBe('db-primary-use1');
  });

  it('converts event-driven.yaml to a valid topology', () => {
    const text = fs.readFileSync(path.join(EXAMPLES_DIR, 'event-driven.yaml'), 'utf-8');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const topo = toTopology(parsed.document);
    expect(topo.nodes.length).toBeGreaterThan(0);
    // Pub/Sub node should exist
    expect(topo.nodes.some((n) => n.type === 'pubsub')).toBe(true);
    // Worker pool nodes should exist
    expect(topo.nodes.filter((n) => n.type === 'worker_pool').length).toBeGreaterThanOrEqual(2);
  });
});

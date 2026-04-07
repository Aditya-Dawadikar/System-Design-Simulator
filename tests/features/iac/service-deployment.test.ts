/**
 * tests/features/iac/service-deployment.test.ts
 *
 * Tests for the Service + Deployment abstraction introduced in Phase 2.
 *
 * Covers:
 *   1. toTopology — service expansion (node IDs, serviceGroups, configs, edges)
 *   2. toTopology — database primary/replica pattern
 *   3. fromTopology — service reconstruction (services[], deployments[])
 *   4. Config propagation logic (pure simulation of store behaviour)
 *   5. Validation — service and deployment rules
 *   6. multi-service.yaml end-to-end roundtrip
 */

import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { toTopology } from '@/iac/toTopology';
import { fromTopology, toYaml } from '@/iac/fromTopology';
import { validateDocument, hasErrors } from '@/iac/validate';
import { parseDocument } from '@/iac/parser';
import { SERVICE_DEPLOYMENT_ACTIVE_ACTIVE_STARTER } from '@/iac/starters';
import { ARCHITECTURE_LIBRARY } from '@/templates/architectures';
import type { IacDocument } from '@/iac/schema';
import type { NodeConfig, ServiceGroup } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(overrides: Partial<IacDocument> = {}): IacDocument {
  return { version: 1, name: 'test', resources: [], ...overrides };
}

const EXAMPLES_DIR = path.resolve(__dirname, '../../../src/iac/examples');

function loadExample(name: string): string {
  return fs.readFileSync(path.join(EXAMPLES_DIR, name), 'utf-8');
}

/** Minimal two-zone, two-service document for reuse across tests. */
function twoZoneDoc(): IacDocument {
  return makeDoc({
    regions: [
      {
        id: 'r1',
        label: 'us-east-1',
        zones: [
          { id: 'z1', label: 'us-east-1a' },
          { id: 'z2', label: 'us-east-1b' },
        ],
      },
    ],
    services: [
      {
        id: 'api',
        type: 'app_server',
        label: 'API Server',
        deploy: { instances: 3, cpuCores: 4, ramGb: 8, rpsPerInstance: 600 },
        dependencies: [{ service: 'db' }],
      },
      {
        id: 'db',
        type: 'database',
        spec: { engine: 'PostgreSQL', shards: 1, rpsPerShard: 1000 },
      },
    ],
    deployments: [
      { service: 'api', zones: ['z1', 'z2'] },
      { service: 'db',  zones: ['z1'], replicas: [{ zone: 'z2' }] },
    ],
  });
}

// ---------------------------------------------------------------------------
// 1. toTopology — service expansion
// ---------------------------------------------------------------------------

describe('toTopology — service expansion: node IDs', () => {
  it('creates nodes named {serviceId}-{zoneId} for zonal deployments', () => {
    const { nodes } = toTopology(twoZoneDoc());
    expect(nodes.some((n) => n.id === 'api-z1')).toBe(true);
    expect(nodes.some((n) => n.id === 'api-z2')).toBe(true);
  });

  it('creates nodes named {serviceId}-{regionId} for regional deployments', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'us-east-1' }],
      services: [
        { id: 'lb', type: 'load_balancer', label: 'Public LB' },
      ],
      deployments: [{ service: 'lb', regions: ['r1'] }],
    });
    const { nodes } = toTopology(doc);
    expect(nodes.some((n) => n.id === 'lb-r1')).toBe(true);
  });

  it('does not create resource nodes for service-managed components', () => {
    const { nodes } = toTopology(twoZoneDoc());
    // No node with plain ID "api" or "db" — only the zoned variants
    expect(nodes.some((n) => n.id === 'api')).toBe(false);
    expect(nodes.some((n) => n.id === 'db')).toBe(false);
  });

  it('coexists correctly with classic resource nodes', () => {
    const doc = twoZoneDoc();
    doc.resources = [{ id: 'tgen', type: 'traffic_generator' }];
    const { nodes } = toTopology(doc);
    expect(nodes.some((n) => n.id === 'tgen')).toBe(true);
    expect(nodes.some((n) => n.id === 'api-z1')).toBe(true);
  });

  it('total node count is regions + zones + service-replicas', () => {
    const { nodes } = toTopology(twoZoneDoc());
    // 1 region + 2 zones + 2 api replicas + 2 db replicas (1 primary + 1 replica) = 7
    expect(nodes).toHaveLength(7);
  });
});

describe('toTopology — service expansion: serviceGroups', () => {
  it('populates serviceGroups with an entry per deployed service', () => {
    const { serviceGroups } = toTopology(twoZoneDoc());
    expect(serviceGroups).toHaveProperty('api');
    expect(serviceGroups).toHaveProperty('db');
  });

  it('serviceGroup.nodeIds lists all replica node IDs for a service', () => {
    const { serviceGroups } = toTopology(twoZoneDoc());
    expect(serviceGroups['api'].nodeIds.sort()).toEqual(['api-z1', 'api-z2'].sort());
  });

  it('db serviceGroup includes both primary and replica node IDs', () => {
    const { serviceGroups } = toTopology(twoZoneDoc());
    expect(serviceGroups['db'].nodeIds.sort()).toEqual(['db-z1', 'db-z2'].sort());
  });

  it('serviceGroup.type matches the service type', () => {
    const { serviceGroups } = toTopology(twoZoneDoc());
    expect(serviceGroups['api'].type).toBe('app_server');
    expect(serviceGroups['db'].type).toBe('database');
  });

  it('serviceGroup.label matches the service label', () => {
    const { serviceGroups } = toTopology(twoZoneDoc());
    expect(serviceGroups['api'].label).toBe('API Server');
  });

  it('serviceGroup.healingEnabled is set when healing.enabled is true', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [
        {
          id: 'api',
          type: 'app_server',
          healing: { enabled: true, restartPolicy: 'always' },
        },
      ],
      deployments: [{ service: 'api', zones: ['z1'] }],
    });
    const { serviceGroups } = toTopology(doc);
    expect(serviceGroups['api'].healingEnabled).toBe(true);
  });
});

describe('toTopology — service expansion: nodeConfig', () => {
  it('applies deploy fields to every replica nodeConfig', () => {
    const { nodeConfigs } = toTopology(twoZoneDoc());
    expect(nodeConfigs['api-z1'].instances).toBe(3);
    expect(nodeConfigs['api-z1'].cpuCores).toBe(4);
    expect(nodeConfigs['api-z2'].instances).toBe(3);
    expect(nodeConfigs['api-z2'].cpuCores).toBe(4);
  });

  it('applies spec fields to every replica nodeConfig', () => {
    const { nodeConfigs } = toTopology(twoZoneDoc());
    expect(nodeConfigs['db-z1'].engine).toBe('PostgreSQL');
    expect(nodeConfigs['db-z1'].shards).toBe(1);
  });

  it('flattens autoscaling into nodeConfig fields for all replicas', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }, { id: 'z2', label: 'z2' }] }],
      services: [
        {
          id: 'api',
          type: 'app_server',
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
      deployments: [{ service: 'api', zones: ['z1', 'z2'] }],
    });
    const { nodeConfigs } = toTopology(doc);
    for (const id of ['api-z1', 'api-z2']) {
      expect(nodeConfigs[id].autoscalingEnabled).toBe(true);
      expect(nodeConfigs[id].autoscalingStrategy).toBe('target_tracking');
      expect(nodeConfigs[id].minInstances).toBe(2);
      expect(nodeConfigs[id].maxInstances).toBe(10);
      expect(nodeConfigs[id].targetMetric).toBe('load');
      expect(nodeConfigs[id].targetValue).toBe(70);
    }
  });

  it('sets zoneId on each replica nodeConfig', () => {
    const { nodeConfigs } = toTopology(twoZoneDoc());
    expect(nodeConfigs['api-z1'].zoneId).toBe('z1');
    expect(nodeConfigs['api-z2'].zoneId).toBe('z2');
  });

  it('sets regionId on each replica nodeConfig (derived from zone)', () => {
    const { nodeConfigs } = toTopology(twoZoneDoc());
    expect(nodeConfigs['api-z1'].regionId).toBe('r1');
  });

  it('sets regionId on regional service replicas', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1' }],
      services: [{ id: 'lb', type: 'load_balancer' }],
      deployments: [{ service: 'lb', regions: ['r1'] }],
    });
    const { nodeConfigs } = toTopology(doc);
    expect(nodeConfigs['lb-r1'].regionId).toBe('r1');
  });

  it('sets healingEnabled on replica nodeConfigs when healing is configured', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [
        { id: 'api', type: 'app_server', healing: { enabled: true } },
      ],
      deployments: [{ service: 'api', zones: ['z1'] }],
    });
    const { nodeConfigs } = toTopology(doc);
    expect(nodeConfigs['api-z1'].healingEnabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. toTopology — database primary/replica pattern
// ---------------------------------------------------------------------------

describe('toTopology — database primary/replica pattern', () => {
  it('first zone in deployment.zones gets dbRole: primary', () => {
    const { nodeConfigs } = toTopology(twoZoneDoc());
    expect(nodeConfigs['db-z1'].dbRole).toBe('primary');
  });

  it('nodes in deployment.replicas[] get dbRole: replica', () => {
    const { nodeConfigs } = toTopology(twoZoneDoc());
    expect(nodeConfigs['db-z2'].dbRole).toBe('replica');
  });

  it('replica nodeConfig has primaryNodeId pointing to the primary node', () => {
    const { nodeConfigs } = toTopology(twoZoneDoc());
    expect(nodeConfigs['db-z2'].primaryNodeId).toBe('db-z1');
  });

  it('non-database services do not get dbRole set', () => {
    const { nodeConfigs } = toTopology(twoZoneDoc());
    expect(nodeConfigs['api-z1'].dbRole).toBeUndefined();
    expect(nodeConfigs['api-z2'].dbRole).toBeUndefined();
  });

  it('primary and replica nodes are both included in serviceGroups.db.nodeIds', () => {
    const { serviceGroups } = toTopology(twoZoneDoc());
    const ids = serviceGroups['db'].nodeIds.sort();
    expect(ids).toEqual(['db-z1', 'db-z2'].sort());
  });

  it('multiple replicas each point to the same primary', () => {
    const doc = makeDoc({
      regions: [
        {
          id: 'r1',
          label: 'r1',
          zones: [
            { id: 'z1', label: 'z1' },
            { id: 'z2', label: 'z2' },
            { id: 'z3', label: 'z3' },
          ],
        },
      ],
      services: [{ id: 'db', type: 'database' }],
      deployments: [
        { service: 'db', zones: ['z1'], replicas: [{ zone: 'z2' }, { zone: 'z3' }] },
      ],
    });
    const { nodeConfigs } = toTopology(doc);
    expect(nodeConfigs['db-z1'].dbRole).toBe('primary');
    expect(nodeConfigs['db-z2'].primaryNodeId).toBe('db-z1');
    expect(nodeConfigs['db-z3'].primaryNodeId).toBe('db-z1');
  });
});

// ---------------------------------------------------------------------------
// 3. toTopology — dependency edges
// ---------------------------------------------------------------------------

describe('toTopology — dependency edges', () => {
  it('creates edges between every pair of api and db replica nodes', () => {
    const { edges } = toTopology(twoZoneDoc());
    // api has 2 replicas (z1, z2), db has 2 (z1, z2) → up to 4 edges
    const depEdges = edges.filter(
      (e) => e.source.startsWith('api-') && e.target.startsWith('db-'),
    );
    expect(depEdges).toHaveLength(4);
  });

  it('does not create a reverse dependency edge (dep is one-way)', () => {
    const { edges } = toTopology(twoZoneDoc());
    const reverseEdges = edges.filter(
      (e) => e.source.startsWith('db-') && e.target.startsWith('api-'),
    );
    expect(reverseEdges).toHaveLength(0);
  });

  it('dependency edge uses the specified protocol', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [
        { id: 'api', type: 'app_server', dependencies: [{ service: 'cache', protocol: 'TCP' }] },
        { id: 'cache', type: 'cache' },
      ],
      deployments: [
        { service: 'api',   zones: ['z1'] },
        { service: 'cache', zones: ['z1'] },
      ],
    });
    const { edges, edgeConfigs } = toTopology(doc);
    const dep = edges.find((e) => e.source === 'api-z1' && e.target === 'cache-z1');
    expect(dep).toBeDefined();
    expect(edgeConfigs[dep!.id].protocol).toBe('TCP');
  });

  it('dependency splitPct is applied to each dep edge config', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [
        {
          id: 'api',
          type: 'app_server',
          dependencies: [{ service: 'db', readSplitPct: 80, writeSplitPct: 20 }],
        },
        { id: 'db', type: 'database' },
      ],
      deployments: [
        { service: 'api', zones: ['z1'] },
        { service: 'db',  zones: ['z1'] },
      ],
    });
    const { edges, edgeConfigs } = toTopology(doc);
    const dep = edges.find((e) => e.source === 'api-z1' && e.target === 'db-z1');
    expect(dep).toBeDefined();
    expect(edgeConfigs[dep!.id].readSplitPct).toBe(80);
    expect(edgeConfigs[dep!.id].writeSplitPct).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// 4. fromTopology — service reconstruction
// ---------------------------------------------------------------------------

describe('fromTopology — service reconstruction from serviceGroups', () => {
  it('exports services[] when serviceGroups is non-empty', () => {
    const topo = toTopology(twoZoneDoc());
    const doc = fromTopology(topo);
    expect(doc.services).toBeDefined();
    expect(doc.services!.length).toBe(2);
  });

  it('exports deployments[] when serviceGroups is non-empty', () => {
    const topo = toTopology(twoZoneDoc());
    const doc = fromTopology(topo);
    expect(doc.deployments).toBeDefined();
    expect(doc.deployments!.length).toBe(2);
  });

  it('reconstructed service IDs match original service IDs', () => {
    const topo = toTopology(twoZoneDoc());
    const doc = fromTopology(topo);
    const ids = doc.services!.map((s) => s.id).sort();
    expect(ids).toEqual(['api', 'db'].sort());
  });

  it('service node IDs are excluded from resources[]', () => {
    const topo = toTopology(twoZoneDoc());
    const doc = fromTopology(topo);
    const resourceIds = doc.resources.map((r) => r.id);
    expect(resourceIds).not.toContain('api-z1');
    expect(resourceIds).not.toContain('api-z2');
    expect(resourceIds).not.toContain('db-z1');
    expect(resourceIds).not.toContain('db-z2');
  });

  it('reconstructs service type correctly', () => {
    const topo = toTopology(twoZoneDoc());
    const doc = fromTopology(topo);
    const api = doc.services!.find((s) => s.id === 'api');
    expect(api?.type).toBe('app_server');
  });

  it('reconstructs service deploy fields that differ from defaults (instances, rpsPerInstance)', () => {
    // instances=3 (default 1), rpsPerInstance=600 (default 500) → both emitted
    // cpuCores=4, ramGb=8 are component defaults → omitted in clean export (expected)
    const topo = toTopology(twoZoneDoc());
    const doc = fromTopology(topo);
    const api = doc.services!.find((s) => s.id === 'api');
    expect(api?.deploy?.instances).toBe(3);
    expect(api?.deploy?.rpsPerInstance).toBe(600);
  });

  it('reconstructs service spec fields that differ from defaults', () => {
    // Use non-default engine ('MySQL' vs default 'PostgreSQL') and shards (3 vs default 1)
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [
        { id: 'db', type: 'database', spec: { engine: 'MySQL', shards: 3, rpsPerShard: 1000 } },
      ],
      deployments: [{ service: 'db', zones: ['z1'] }],
    });
    const topo = toTopology(doc);
    const exported = fromTopology(topo);
    const db = exported.services!.find((s) => s.id === 'db');
    expect(db?.spec?.engine).toBe('MySQL');
    expect(db?.spec?.shards).toBe(3);
  });

  it('reconstructs dependency from inter-service edges', () => {
    const topo = toTopology(twoZoneDoc());
    const doc = fromTopology(topo);
    const api = doc.services!.find((s) => s.id === 'api');
    expect(api?.dependencies).toBeDefined();
    expect(api?.dependencies!.some((d) => d.service === 'db')).toBe(true);
  });

  it('does NOT create a reverse dependency for db→api', () => {
    const topo = toTopology(twoZoneDoc());
    const doc = fromTopology(topo);
    const db = doc.services!.find((s) => s.id === 'db');
    expect(db?.dependencies ?? []).toHaveLength(0);
  });

  it('reconstructs deployment.zones from zonal node placements', () => {
    const topo = toTopology(twoZoneDoc());
    const doc = fromTopology(topo);
    const apiDep = doc.deployments!.find((d) => d.service === 'api');
    expect(apiDep?.zones?.sort()).toEqual(['z1', 'z2'].sort());
  });

  it('reconstructs database primary zone in deployment.zones and replicas in deployment.replicas', () => {
    const topo = toTopology(twoZoneDoc());
    const doc = fromTopology(topo);
    const dbDep = doc.deployments!.find((d) => d.service === 'db');
    // Primary zone (z1) goes in zones[]
    expect(dbDep?.zones).toEqual(['z1']);
    // Replica zone (z2) goes in replicas[]
    expect(dbDep?.replicas).toEqual([{ zone: 'z2' }]);
  });

  it('reconstructs regional deployments in deployment.regions', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1' }],
      services: [{ id: 'lb', type: 'load_balancer' }],
      deployments: [{ service: 'lb', regions: ['r1'] }],
    });
    const topo = toTopology(doc);
    const exported = fromTopology(topo);
    const lbDep = exported.deployments!.find((d) => d.service === 'lb');
    expect(lbDep?.regions).toEqual(['r1']);
    expect(lbDep?.zones ?? []).toHaveLength(0);
  });

  it('reconstructs healing policy when healingEnabled is set', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [
        { id: 'api', type: 'app_server', healing: { enabled: true } },
      ],
      deployments: [{ service: 'api', zones: ['z1'] }],
    });
    const topo = toTopology(doc);
    const exported = fromTopology(topo);
    const api = exported.services!.find((s) => s.id === 'api');
    expect(api?.healing?.enabled).toBe(true);
  });

  it('inter-service edges are excluded from connections[]', () => {
    const topo = toTopology(twoZoneDoc());
    const exported = fromTopology(topo);
    // No connection should reference service replica node IDs
    const connIds = [
      ...(exported.connections ?? []).map((c) => c.from),
      ...(exported.connections ?? []).map((c) => c.to),
    ];
    for (const id of ['api-z1', 'api-z2', 'db-z1', 'db-z2']) {
      expect(connIds).not.toContain(id);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Config propagation — pure logic (mirrors store behaviour)
// ---------------------------------------------------------------------------

/**
 * Simulates what architectureStore.updateNodeConfig does:
 * applies the config patch to the target node, then propagates
 * non-placement fields to all siblings in the same service group.
 */
const PROPAGATION_SKIP = new Set(['zoneId', 'regionId', 'dbRole', 'primaryNodeId']);

function applyWithPropagation(
  nodeConfigs: Record<string, NodeConfig>,
  serviceGroups: Record<string, ServiceGroup>,
  targetId: string,
  patch: Partial<NodeConfig>,
): Record<string, NodeConfig> {
  const updated = {
    ...nodeConfigs,
    [targetId]: { ...nodeConfigs[targetId], ...patch },
  };

  const group = Object.values(serviceGroups).find((g) => g.nodeIds.includes(targetId));
  if (group) {
    const propagated: Partial<NodeConfig> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (!PROPAGATION_SKIP.has(key)) {
        (propagated as Record<string, unknown>)[key] = value;
      }
    }
    if (Object.keys(propagated).length > 0) {
      for (const siblingId of group.nodeIds) {
        if (siblingId !== targetId) {
          updated[siblingId] = { ...(updated[siblingId] ?? nodeConfigs[siblingId]), ...propagated };
        }
      }
    }
  }
  return updated;
}

describe('config propagation — service group siblings', () => {
  it('propagates instances change to all replicas', () => {
    const { nodeConfigs, serviceGroups } = toTopology(twoZoneDoc());
    const updated = applyWithPropagation(nodeConfigs, serviceGroups, 'api-z1', { instances: 8 });
    expect(updated['api-z1'].instances).toBe(8);
    expect(updated['api-z2'].instances).toBe(8);
  });

  it('does NOT propagate zoneId to siblings', () => {
    const { nodeConfigs, serviceGroups } = toTopology(twoZoneDoc());
    const updated = applyWithPropagation(nodeConfigs, serviceGroups, 'api-z1', { zoneId: 'z99' });
    // Only the target changes
    expect(updated['api-z1'].zoneId).toBe('z99');
    expect(updated['api-z2'].zoneId).toBe('z2'); // unchanged
  });

  it('does NOT propagate regionId to siblings', () => {
    const { nodeConfigs, serviceGroups } = toTopology(twoZoneDoc());
    const updated = applyWithPropagation(nodeConfigs, serviceGroups, 'api-z1', { regionId: 'r99' });
    expect(updated['api-z1'].regionId).toBe('r99');
    expect(updated['api-z2'].regionId).toBe('r1'); // unchanged
  });

  it('does NOT propagate dbRole to siblings', () => {
    const { nodeConfigs, serviceGroups } = toTopology(twoZoneDoc());
    const updated = applyWithPropagation(nodeConfigs, serviceGroups, 'db-z1', { dbRole: 'replica' });
    expect(updated['db-z1'].dbRole).toBe('replica');
    expect(updated['db-z2'].dbRole).toBe('replica'); // db-z2 was already replica, not changed by propagation
  });

  it('does NOT propagate primaryNodeId to siblings', () => {
    const { nodeConfigs, serviceGroups } = toTopology(twoZoneDoc());
    const newPrimary = 'db-z99';
    const updated = applyWithPropagation(nodeConfigs, serviceGroups, 'db-z2', { primaryNodeId: newPrimary });
    expect(updated['db-z2'].primaryNodeId).toBe(newPrimary);
    expect(updated['db-z1'].primaryNodeId).toBeUndefined(); // primary has no primaryNodeId
  });

  it('propagates autoscaling fields to all replicas', () => {
    const { nodeConfigs, serviceGroups } = toTopology(twoZoneDoc());
    const updated = applyWithPropagation(nodeConfigs, serviceGroups, 'api-z1', {
      autoscalingEnabled: true,
      autoscalingStrategy: 'threshold',
      maxInstances: 20,
    });
    for (const id of ['api-z1', 'api-z2']) {
      expect(updated[id].autoscalingEnabled).toBe(true);
      expect(updated[id].autoscalingStrategy).toBe('threshold');
      expect(updated[id].maxInstances).toBe(20);
    }
  });

  it('propagates label change to all replicas', () => {
    const { nodeConfigs, serviceGroups } = toTopology(twoZoneDoc());
    const updated = applyWithPropagation(nodeConfigs, serviceGroups, 'api-z1', { label: 'New Name' });
    expect(updated['api-z1'].label).toBe('New Name');
    expect(updated['api-z2'].label).toBe('New Name');
  });

  it('does not propagate to nodes outside the service group', () => {
    const { nodeConfigs, serviceGroups } = toTopology(twoZoneDoc());
    const updated = applyWithPropagation(nodeConfigs, serviceGroups, 'api-z1', { instances: 99 });
    // db nodes should not be affected
    expect(updated['db-z1'].instances).toBe(nodeConfigs['db-z1'].instances);
    expect(updated['db-z2'].instances).toBe(nodeConfigs['db-z2'].instances);
  });

  it('non-service-group nodes are not affected when a service node changes', () => {
    const doc = twoZoneDoc();
    doc.resources = [{ id: 'tgen', type: 'traffic_generator', spec: { generatorRps: 1000 } }];
    const { nodeConfigs, serviceGroups } = toTopology(doc);
    const updated = applyWithPropagation(nodeConfigs, serviceGroups, 'api-z1', { instances: 5 });
    expect(updated['tgen'].generatorRps).toBe(nodeConfigs['tgen'].generatorRps);
  });
});

// ---------------------------------------------------------------------------
// 6. Validation — service and deployment rules
// ---------------------------------------------------------------------------

describe('validateDocument — service rules', () => {
  it('returns no errors for a valid service + deployment document', () => {
    const issues = validateDocument(twoZoneDoc());
    expect(hasErrors(issues)).toBe(false);
  });

  it('errors on duplicate service IDs', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [
        { id: 'api', type: 'app_server' },
        { id: 'api', type: 'cache' }, // duplicate
      ],
      deployments: [{ service: 'api', zones: ['z1'] }],
    });
    const issues = validateDocument(doc);
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('Duplicate service id'))).toBe(true);
  });

  it('errors when service has a self-referencing dependency', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [
        { id: 'api', type: 'app_server', dependencies: [{ service: 'api' }] },
      ],
      deployments: [{ service: 'api', zones: ['z1'] }],
    });
    const issues = validateDocument(doc);
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('self-referencing'))).toBe(true);
  });

  it('errors when service dependency references unknown service', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [
        { id: 'api', type: 'app_server', dependencies: [{ service: 'nonexistent' }] },
      ],
      deployments: [{ service: 'api', zones: ['z1'] }],
    });
    const issues = validateDocument(doc);
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('unknown service'))).toBe(true);
  });

  it('errors when a container type is used as a service', () => {
    const doc = makeDoc({
      services: [{ id: 'reg', type: 'region' }],
      deployments: [],
    });
    const issues = validateDocument(doc);
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('container type'))).toBe(true);
  });

  it('warns when a service has no matching deployment', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [
        { id: 'api', type: 'app_server' },
        { id: 'orphan', type: 'cache' }, // no deployment
      ],
      deployments: [{ service: 'api', zones: ['z1'] }],
    });
    const issues = validateDocument(doc);
    const warnings = issues.filter((i) => i.severity === 'warning');
    expect(warnings.some((w) => w.message.includes('orphan'))).toBe(true);
  });
});

describe('validateDocument — deployment rules', () => {
  it('errors when deployment references an unknown service', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [],
      deployments: [{ service: 'ghost', zones: ['z1'] }],
    });
    const issues = validateDocument(doc);
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('"ghost"'))).toBe(true);
  });

  it('errors when deployment zone is not declared in regions[]', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [{ id: 'api', type: 'app_server' }],
      deployments: [{ service: 'api', zones: ['undeclared-zone'] }],
    });
    const issues = validateDocument(doc);
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('"undeclared-zone"'))).toBe(true);
  });

  it('errors when deployment region is not declared in regions[]', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1' }],
      services: [{ id: 'lb', type: 'load_balancer' }],
      deployments: [{ service: 'lb', regions: ['ghost-region'] }],
    });
    const issues = validateDocument(doc);
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('"ghost-region"'))).toBe(true);
  });

  it('errors when deployment has neither zones nor regions', () => {
    const doc = makeDoc({
      services: [{ id: 'api', type: 'app_server' }],
      deployments: [{ service: 'api' }],
    });
    const issues = validateDocument(doc);
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('no zones or regions'))).toBe(true);
  });

  it('errors when a zonal service is deployed to regions', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1' }],
      services: [{ id: 'app', type: 'app_server' }], // app_server is zonal
      deployments: [{ service: 'app', regions: ['r1'] }],
    });
    const issues = validateDocument(doc);
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('zonal') && i.message.includes('regions'))).toBe(true);
  });

  it('errors when a regional service is deployed to zones', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      services: [{ id: 'lb', type: 'load_balancer' }], // load_balancer is regional
      deployments: [{ service: 'lb', zones: ['z1'] }],
    });
    const issues = validateDocument(doc);
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('regional') && i.message.includes('zones'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Full roundtrip — multi-service.yaml
// ---------------------------------------------------------------------------

describe('embedded service/deployment active-active starter', () => {
  it('parses and validates without errors', () => {
    const parsed = parseDocument(SERVICE_DEPLOYMENT_ACTIVE_ACTIVE_STARTER);
    expect(parsed.ok, !parsed.ok ? parsed.issues.map((i) => i.message).join(', ') : '').toBe(true);
    if (!parsed.ok) return;

    const issues = validateDocument(parsed.document);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors, errors.map((e) => e.message).join('\n')).toHaveLength(0);
  });

  it('is exposed in the architecture library', () => {
    const entry = ARCHITECTURE_LIBRARY.find((item) => item.id === 'service-deployment-active-active');
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('IaC Examples');
    expect(entry?.template.nodes.length).toBeGreaterThan(0);
  });
});

describe('multi-service.yaml — end-to-end', () => {
  it('parses without errors', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok, !parsed.ok ? parsed.issues.map((i) => i.message).join(', ') : '').toBe(true);
  });

  it('validates without errors', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const issues = validateDocument(parsed.document);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors, errors.map((e) => e.message).join('\n')).toHaveLength(0);
  });

  it('declares 5 services', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.services).toHaveLength(5);
  });

  it('creates correct service group IDs after toTopology', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { serviceGroups } = toTopology(parsed.document);
    const groupIds = Object.keys(serviceGroups).sort();
    expect(groupIds).toEqual(['api', 'checkout-db', 'order-queue', 'order-worker', 'session-cache'].sort());
  });

  it('api service has 3 replica nodes (one per AZ)', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { serviceGroups } = toTopology(parsed.document);
    expect(serviceGroups['api'].nodeIds).toHaveLength(3);
  });

  it('checkout-db service has 3 nodes: 1 primary + 2 replicas', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { nodeConfigs, serviceGroups } = toTopology(parsed.document);
    const dbNodes = serviceGroups['checkout-db'].nodeIds;
    expect(dbNodes).toHaveLength(3);
    const primaries = dbNodes.filter((id) => nodeConfigs[id].dbRole === 'primary');
    const replicas  = dbNodes.filter((id) => nodeConfigs[id].dbRole === 'replica');
    expect(primaries).toHaveLength(1);
    expect(replicas).toHaveLength(2);
  });

  it('order-queue is deployed regionally (not per-zone)', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { nodeConfigs, serviceGroups } = toTopology(parsed.document);
    const queueNodes = serviceGroups['order-queue'].nodeIds;
    expect(queueNodes).toHaveLength(1);
    // Has regionId, not zoneId
    expect(nodeConfigs[queueNodes[0]].regionId).toBeDefined();
    expect(nodeConfigs[queueNodes[0]].zoneId).toBeUndefined();
  });

  it('api service has autoscaling configured on every replica', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { nodeConfigs, serviceGroups } = toTopology(parsed.document);
    for (const id of serviceGroups['api'].nodeIds) {
      expect(nodeConfigs[id].autoscalingEnabled).toBe(true);
      expect(nodeConfigs[id].autoscalingStrategy).toBe('target_tracking');
    }
  });

  it('fromTopology reconstructs services[] after toTopology', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo);
    expect(exported.services).toBeDefined();
    expect(exported.services!.length).toBe(5);
  });

  it('fromTopology reconstructs deployments[] after toTopology', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo);
    expect(exported.deployments).toBeDefined();
    expect(exported.deployments!.length).toBe(5);
  });

  it('exported YAML re-parses without errors', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo);
    const yamlOut = toYaml(exported);

    const reParsed = parseDocument(yamlOut);
    expect(reParsed.ok, !reParsed.ok ? reParsed.issues.map((i) => i.message).join(', ') : '').toBe(true);
    if (!reParsed.ok) return;
    const reIssues = validateDocument(reParsed.document);
    expect(hasErrors(reIssues)).toBe(false);
  });

  it('double-roundtrip produces identical service + deployment counts', () => {
    const text = loadExample('multi-service.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // First roundtrip
    const topo1 = toTopology(parsed.document);
    const doc1  = fromTopology(topo1);
    const yaml1 = toYaml(doc1);

    // Second roundtrip
    const parsed2 = parseDocument(yaml1);
    expect(parsed2.ok).toBe(true);
    if (!parsed2.ok) return;
    const topo2 = toTopology(parsed2.document);
    const doc2  = fromTopology(topo2);

    expect(doc2.services?.length).toBe(doc1.services?.length);
    expect(doc2.deployments?.length).toBe(doc1.deployments?.length);
    expect(topo2.nodes.length).toBe(topo1.nodes.length);
    expect(Object.keys(topo2.serviceGroups).sort()).toEqual(Object.keys(topo1.serviceGroups).sort());
  });
});

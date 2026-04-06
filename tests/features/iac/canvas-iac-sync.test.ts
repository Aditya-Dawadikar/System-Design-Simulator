/**
 * tests/features/iac/canvas-iac-sync.test.ts
 *
 * Unit tests for the two-way canvas ↔ IaC YAML synchronisation behaviour.
 *
 * Covers:
 *  1. fromTopology includeDefaults flag — field inclusion/exclusion logic
 *  2. Fresh-start / empty canvas — empty topology produces empty resources
 *  3. Complete node state — auto-generated YAML captures default-valued fields
 *  4. Two-way roundtrip — IaC → Canvas → IaC round-trip stability and validity
 *  5. Architecture scoping / isolation — different topologies produce distinct YAML
 */

import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseDocument } from '@/iac/parser';
import { validateDocument, hasErrors } from '@/iac/validate';
import { toTopology } from '@/iac/toTopology';
import { fromTopology, toYaml, type TopologyInput } from '@/iac/fromTopology';
import type { IacDocument } from '@/iac/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXAMPLES_DIR = path.resolve(__dirname, '../../../src/iac/examples');

function loadExample(name: string): string {
  return fs.readFileSync(path.join(EXAMPLES_DIR, name), 'utf-8');
}

/** Minimal valid IacDocument for constructing test topologies inline. */
function doc(overrides: Partial<IacDocument> = {}): IacDocument {
  return { version: 1, name: 'test', resources: [], ...overrides };
}

/** Build a TopologyInput via the full parse → toTopology pipeline. */
function buildTopology(d: IacDocument): TopologyInput {
  return toTopology(d);
}

/** Load an example YAML file and convert it to a TopologyInput. */
function exampleTopology(file: string): TopologyInput {
  const text = loadExample(file);
  const parsed = parseDocument(text);
  if (!parsed.ok) throw new Error(`Failed to parse ${file}: ${parsed.issues.map((i) => i.message).join(', ')}`);
  return toTopology(parsed.document);
}

// ===========================================================================
// 1. fromTopology — includeDefaults flag
// ===========================================================================

describe('canvas-iac-sync — fromTopology includeDefaults flag', () => {
  // ── CDN (global, no placement) ───────────────────────────────────────────

  function cdnTopology() {
    return buildTopology(doc({ resources: [{ id: 'cdn1', type: 'cdn' }] }));
  }

  it('omits default-valued spec fields when includeDefaults is omitted (default false)', () => {
    const exported = fromTopology(cdnTopology());
    const cdn = exported.resources.find((r) => r.id === 'cdn1');
    expect(cdn).toBeDefined();
    // CDN component defaults: pops=2, cacheablePct=60, bandwidthGbps=100
    // None were changed, so spec should be absent entirely
    expect(cdn?.spec).toBeUndefined();
  });

  it('includes default-valued spec fields when includeDefaults is true', () => {
    const exported = fromTopology(cdnTopology(), { includeDefaults: true });
    const cdn = exported.resources.find((r) => r.id === 'cdn1');
    expect(cdn).toBeDefined();
    expect(cdn?.spec?.pops).toBe(2);
    expect(cdn?.spec?.cacheablePct).toBe(60);
    expect(cdn?.spec?.bandwidthGbps).toBe(100);
  });

  it('omits label when it equals the component default and includeDefaults is false', () => {
    // The CDN default label is 'CDN Edge'; it was never customised here
    const exported = fromTopology(cdnTopology());
    const cdn = exported.resources.find((r) => r.id === 'cdn1');
    expect(cdn?.label).toBeUndefined();
  });

  it('always emits label when includeDefaults is true', () => {
    const exported = fromTopology(cdnTopology(), { includeDefaults: true });
    const cdn = exported.resources.find((r) => r.id === 'cdn1');
    expect(cdn?.label).toBe('CDN Edge');
  });

  // ── app_server (zonal, uses deploy block) ────────────────────────────────

  function appServerTopology() {
    return buildTopology(
      doc({
        regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
        resources: [{ id: 'app1', type: 'app_server', placement: { zone: 'z1' } }],
      }),
    );
  }

  it('app_server: omits default deploy fields when includeDefaults is false', () => {
    const exported = fromTopology(appServerTopology());
    const app = exported.resources.find((r) => r.id === 'app1');
    expect(app).toBeDefined();
    // All deploy fields are at their component defaults; deploy block should be absent
    expect(app?.deploy?.instances).toBeUndefined();
    expect(app?.deploy?.cpuCores).toBeUndefined();
    expect(app?.deploy?.ramGb).toBeUndefined();
    expect(app?.deploy?.rpsPerInstance).toBeUndefined();
    expect(app?.deploy?.avgLatencyMs).toBeUndefined();
  });

  it('app_server: includes all five default deploy fields when includeDefaults is true', () => {
    const exported = fromTopology(appServerTopology(), { includeDefaults: true });
    const app = exported.resources.find((r) => r.id === 'app1');
    expect(app).toBeDefined();
    expect(app?.deploy?.instances).toBe(1);
    expect(app?.deploy?.cpuCores).toBe(4);
    expect(app?.deploy?.ramGb).toBe(8);
    expect(app?.deploy?.rpsPerInstance).toBe(500);
    expect(app?.deploy?.avgLatencyMs).toBe(40);
  });

  it('never includes undefined values even when includeDefaults is true', () => {
    // workloadType is absent from the app_server component defaults → undefined in nodeConfig.
    // It must not appear in the exported YAML even with includeDefaults.
    const exported = fromTopology(appServerTopology(), { includeDefaults: true });
    const app = exported.resources.find((r) => r.id === 'app1');
    expect(app?.deploy?.workloadType).toBeUndefined();
  });

  it('non-default spec values are exported regardless of includeDefaults', () => {
    // pops=8 is not the default (2); it must appear in both modes
    const topo = buildTopology(
      doc({ resources: [{ id: 'cdn1', type: 'cdn', spec: { pops: 8 } }] }),
    );
    const withoutFlag = fromTopology(topo);
    const withFlag    = fromTopology(topo, { includeDefaults: true });
    expect(withoutFlag.resources.find((r) => r.id === 'cdn1')?.spec?.pops).toBe(8);
    expect(withFlag.resources.find((r) => r.id === 'cdn1')?.spec?.pops).toBe(8);
  });

  it('customised label is exported regardless of includeDefaults', () => {
    const topo = buildTopology(
      doc({ resources: [{ id: 'cdn1', type: 'cdn', label: 'My CDN' }] }),
    );
    expect(fromTopology(topo).resources[0].label).toBe('My CDN');
    expect(fromTopology(topo, { includeDefaults: true }).resources[0].label).toBe('My CDN');
  });
});

// ===========================================================================
// 2. Fresh start / empty canvas
// ===========================================================================

describe('canvas-iac-sync — empty topology (fresh start)', () => {
  const EMPTY: TopologyInput = { nodes: [], edges: [], nodeConfigs: {}, edgeConfigs: {} };

  it('fromTopology on empty input returns an empty resources list', () => {
    const exported = fromTopology(EMPTY);
    expect(exported.resources).toHaveLength(0);
  });

  it('fromTopology on empty input produces no regions or connections', () => {
    const exported = fromTopology(EMPTY);
    expect(exported.regions).toBeUndefined();
    expect(exported.connections).toBeUndefined();
  });

  it('empty topology serializes to valid YAML containing the version header', () => {
    const yaml = toYaml(fromTopology(EMPTY));
    expect(yaml).toBeTruthy();
    expect(yaml).toContain('version: 1');
    expect(yaml).toContain('resources:');
  });

  it('empty topology YAML re-parses to a document with no errors', () => {
    const yaml = toYaml(fromTopology(EMPTY));
    const parsed = parseDocument(yaml);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const issues = validateDocument(parsed.document);
    expect(hasErrors(issues)).toBe(false);
  });

  it('empty topology YAML has no resource entries', () => {
    const yaml = toYaml(fromTopology(EMPTY));
    const parsed = parseDocument(yaml);
    if (!parsed.ok) return;
    expect(parsed.document.resources).toHaveLength(0);
  });

  it('fromTopology with includeDefaults on empty input still produces no resources', () => {
    const exported = fromTopology(EMPTY, { includeDefaults: true });
    expect(exported.resources).toHaveLength(0);
  });
});

// ===========================================================================
// 3. Complete node state in auto-generated YAML (includeDefaults: true)
// ===========================================================================

describe('canvas-iac-sync — complete node state in auto-generated YAML', () => {
  // Shared multi-component topology
  const TOPOLOGY = buildTopology(
    doc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [
        { id: 'cdn1',  type: 'cdn' },
        { id: 'lb1',   type: 'load_balancer', placement: { region: 'r1' } },
        { id: 'app1',  type: 'app_server',    placement: { zone: 'z1' } },
        { id: 'cache1',type: 'cache',         placement: { zone: 'z1' } },
        { id: 'db1',   type: 'database',      placement: { zone: 'z1' } },
      ],
      connections: [
        { from: 'cdn1',   to: 'lb1' },
        { from: 'lb1',    to: 'app1' },
        { from: 'app1',   to: 'cache1' },
        { from: 'app1',   to: 'db1' },
      ],
    }),
  );

  function autoGenerated() {
    return fromTopology(TOPOLOGY, { includeDefaults: true });
  }

  it('CDN: all three default spec fields present (pops, cacheablePct, bandwidthGbps)', () => {
    const cdn = autoGenerated().resources.find((r) => r.id === 'cdn1');
    expect(cdn?.spec?.pops).toBe(2);
    expect(cdn?.spec?.cacheablePct).toBe(60);
    expect(cdn?.spec?.bandwidthGbps).toBe(100);
  });

  it('load_balancer: all three default spec fields present (algorithm, healthChecks, maxConnections)', () => {
    const lb = autoGenerated().resources.find((r) => r.id === 'lb1');
    expect(lb?.spec?.algorithm).toBe('round_robin');
    expect(lb?.spec?.healthChecks).toBe(true);
    expect(lb?.spec?.maxConnections).toBe(100000);
  });

  it('app_server: all five default deploy fields present', () => {
    const app = autoGenerated().resources.find((r) => r.id === 'app1');
    expect(app?.deploy?.instances).toBe(1);
    expect(app?.deploy?.cpuCores).toBe(4);
    expect(app?.deploy?.ramGb).toBe(8);
    expect(app?.deploy?.rpsPerInstance).toBe(500);
    expect(app?.deploy?.avgLatencyMs).toBe(40);
  });

  it('cache: all four default spec fields present (memoryGb, ttlSeconds, evictionPolicy, clusterMode)', () => {
    const cache = autoGenerated().resources.find((r) => r.id === 'cache1');
    expect(cache?.spec?.memoryGb).toBe(8);
    expect(cache?.spec?.ttlSeconds).toBe(60);
    expect(cache?.spec?.evictionPolicy).toBe('lru');
    expect(cache?.spec?.clusterMode).toBe(false);
  });

  it('database: key default spec fields present (engine, shards, rpsPerShard, maxConnections)', () => {
    const db = autoGenerated().resources.find((r) => r.id === 'db1');
    expect(db?.spec?.engine).toBe('PostgreSQL');
    expect(db?.spec?.shards).toBe(1);
    expect(db?.spec?.rpsPerShard).toBe(800);
    expect(db?.spec?.maxConnections).toBe(200);
  });

  it('placement: zonal resource exports placement.zone', () => {
    const app = autoGenerated().resources.find((r) => r.id === 'app1');
    expect(app?.placement?.zone).toBe('z1');
  });

  it('placement: regional resource exports placement.region', () => {
    const lb = autoGenerated().resources.find((r) => r.id === 'lb1');
    expect(lb?.placement?.region).toBe('r1');
  });

  it('placement: global resource has no placement', () => {
    const cdn = autoGenerated().resources.find((r) => r.id === 'cdn1');
    expect(cdn?.placement).toBeUndefined();
  });

  it('connections are all present in auto-generated document', () => {
    const exported = autoGenerated();
    expect(exported.connections).toHaveLength(4);
    const pairs = (exported.connections ?? []).map((c) => `${c.from}→${c.to}`);
    expect(pairs).toContain('cdn1→lb1');
    expect(pairs).toContain('lb1→app1');
    expect(pairs).toContain('app1→cache1');
    expect(pairs).toContain('app1→db1');
  });

  it('all five resources plus region/zone nodes appear in output', () => {
    const exported = autoGenerated();
    const resourceIds = exported.resources.map((r) => r.id);
    expect(resourceIds).toContain('cdn1');
    expect(resourceIds).toContain('lb1');
    expect(resourceIds).toContain('app1');
    expect(resourceIds).toContain('cache1');
    expect(resourceIds).toContain('db1');
    // region and zone go into regions[], not resources[]
    const regionIds = (exported.regions ?? []).map((r) => r.id);
    expect(regionIds).toContain('r1');
    const zoneIds = (exported.regions ?? []).flatMap((r) => r.zones ?? []).map((z) => z.id);
    expect(zoneIds).toContain('z1');
  });

  it('auto-generated YAML passes re-parse and validation', () => {
    const yaml = toYaml(autoGenerated());
    const parsed = parseDocument(yaml);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const issues = validateDocument(parsed.document);
    expect(hasErrors(issues)).toBe(false);
  });
});

// ===========================================================================
// 4. Two-way roundtrip — IaC → Canvas → IaC
// ===========================================================================

describe('canvas-iac-sync — IaC → Canvas → IaC roundtrip', () => {
  // Helper: full pipeline including auto-generated YAML re-import
  function roundtrip(exampleFile: string) {
    const topo1   = exampleTopology(exampleFile);
    const yaml2   = toYaml(fromTopology(topo1, { name: exampleFile, includeDefaults: true }));
    const parsed2 = parseDocument(yaml2);
    if (!parsed2.ok) throw new Error(`Round-tripped YAML failed to parse: ${parsed2.issues.map((i) => i.message).join(', ')}`);
    const topo2 = toTopology(parsed2.document);
    return { topo1, yaml2, parsed2, topo2 };
  }

  // ── three-tier.yaml ───────────────────────────────────────────────────────

  it('three-tier: auto-generated YAML passes validation', () => {
    const { yaml2 } = roundtrip('three-tier.yaml');
    const parsed = parseDocument(yaml2);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(hasErrors(validateDocument(parsed.document))).toBe(false);
  });

  it('three-tier: all original resource IDs survive the roundtrip', () => {
    const { topo1, topo2 } = roundtrip('three-tier.yaml');
    const ids1 = topo1.nodes.map((n) => n.id).sort();
    const ids2 = topo2.nodes.map((n) => n.id).sort();
    expect(ids2).toEqual(ids1);
  });

  it('three-tier: edge count is preserved after roundtrip', () => {
    const { topo1, topo2 } = roundtrip('three-tier.yaml');
    expect(topo2.edges).toHaveLength(topo1.edges.length);
  });

  it('three-tier: nodeConfig keys are preserved after roundtrip', () => {
    const { topo1, topo2 } = roundtrip('three-tier.yaml');
    // Every node that existed in topo1 must have a nodeConfig in topo2
    for (const node of topo1.nodes) {
      expect(topo2.nodeConfigs[node.id]).toBeDefined();
    }
  });

  // ── multi-az.yaml ─────────────────────────────────────────────────────────

  it('multi-az: auto-generated YAML passes validation', () => {
    const { yaml2 } = roundtrip('multi-az.yaml');
    const parsed = parseDocument(yaml2);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(hasErrors(validateDocument(parsed.document))).toBe(false);
  });

  it('multi-az: two regions and four zones survive the roundtrip', () => {
    const { topo2 } = roundtrip('multi-az.yaml');
    expect(topo2.nodes.filter((n) => n.type === 'region')).toHaveLength(2);
    expect(topo2.nodes.filter((n) => n.type === 'availability_zone')).toHaveLength(4);
  });

  it('multi-az: autoscaling config survives the roundtrip', () => {
    const { topo2 } = roundtrip('multi-az.yaml');
    // app-use1a had target_tracking autoscaling in the original
    const cfg = topo2.nodeConfigs['app-use1a'];
    expect(cfg?.autoscalingEnabled).toBe(true);
    expect(cfg?.autoscalingStrategy).toBe('target_tracking');
  });

  it('multi-az: db replica role survives the roundtrip', () => {
    const { topo2 } = roundtrip('multi-az.yaml');
    const cfg = topo2.nodeConfigs['db-replica-use1'];
    expect(cfg?.dbRole).toBe('replica');
    expect(cfg?.primaryNodeId).toBe('db-primary-use1');
  });

  // ── event-driven.yaml ─────────────────────────────────────────────────────

  it('event-driven: auto-generated YAML passes validation', () => {
    const { yaml2 } = roundtrip('event-driven.yaml');
    const parsed = parseDocument(yaml2);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(hasErrors(validateDocument(parsed.document))).toBe(false);
  });

  it('event-driven: all original resource IDs survive the roundtrip', () => {
    const { topo1, topo2 } = roundtrip('event-driven.yaml');
    const ids1 = topo1.nodes.map((n) => n.id).sort();
    const ids2 = topo2.nodes.map((n) => n.id).sort();
    expect(ids2).toEqual(ids1);
  });

  // ── double roundtrip (IaC → Canvas → IaC → Canvas) ───────────────────────

  it('double roundtrip: second round produces the same node IDs as the first', () => {
    const topo1  = exampleTopology('three-tier.yaml');
    const yaml2  = toYaml(fromTopology(topo1, { includeDefaults: true }));
    const parsed2 = parseDocument(yaml2);
    if (!parsed2.ok) throw new Error('Round 1 YAML invalid');
    const topo2  = toTopology(parsed2.document);
    const yaml3  = toYaml(fromTopology(topo2, { includeDefaults: true }));
    const parsed3 = parseDocument(yaml3);
    if (!parsed3.ok) throw new Error('Round 2 YAML invalid');
    const topo3  = toTopology(parsed3.document);

    const ids2 = topo2.nodes.map((n) => n.id).sort();
    const ids3 = topo3.nodes.map((n) => n.id).sort();
    expect(ids3).toEqual(ids2);
  });

  it('double roundtrip: second round YAML passes validation', () => {
    const topo1  = exampleTopology('three-tier.yaml');
    const yaml2  = toYaml(fromTopology(topo1, { includeDefaults: true }));
    const parsed2 = parseDocument(yaml2);
    if (!parsed2.ok) throw new Error('Round 1 YAML invalid');
    const topo2  = toTopology(parsed2.document);
    const yaml3  = toYaml(fromTopology(topo2, { includeDefaults: true }));
    const parsed3 = parseDocument(yaml3);
    expect(parsed3.ok).toBe(true);
    if (!parsed3.ok) return;
    expect(hasErrors(validateDocument(parsed3.document))).toBe(false);
  });

  // ── IaC → Canvas apply flow (no includeDefaults, as user would export) ────

  it('user-export (includeDefaults false) YAML also passes validation after roundtrip', () => {
    const topo1   = exampleTopology('three-tier.yaml');
    const yaml2   = toYaml(fromTopology(topo1, { includeDefaults: false }));
    const parsed2 = parseDocument(yaml2);
    expect(parsed2.ok).toBe(true);
    if (!parsed2.ok) return;
    expect(hasErrors(validateDocument(parsed2.document))).toBe(false);
  });
});

// ===========================================================================
// 5. Architecture scoping / isolation
// ===========================================================================

describe('canvas-iac-sync — architecture scoping and isolation', () => {
  it('different architectures produce distinct YAML documents', () => {
    const yamlA = toYaml(fromTopology(exampleTopology('three-tier.yaml'), { includeDefaults: true }));
    const yamlB = toYaml(fromTopology(exampleTopology('event-driven.yaml'), { includeDefaults: true }));
    expect(yamlA).not.toBe(yamlB);
  });

  it('three-tier topology contains CDN, LB, and DB; event-driven does not', () => {
    const docA = fromTopology(exampleTopology('three-tier.yaml'), { includeDefaults: true });
    const types = docA.resources.map((r) => r.type);
    expect(types).toContain('cdn');
    expect(types).toContain('load_balancer');
    expect(types).toContain('database');
    // event-driven defines pubsub; three-tier should not
    expect(types).not.toContain('pubsub');
  });

  it('event-driven topology contains pubsub and worker_pool; three-tier has neither', () => {
    const docB = fromTopology(exampleTopology('event-driven.yaml'), { includeDefaults: true });
    const typesB = docB.resources.map((r) => r.type);
    expect(typesB).toContain('pubsub');
    expect(typesB.filter((t) => t === 'worker_pool').length).toBeGreaterThanOrEqual(1);

    // three-tier has no pubsub or worker_pool
    const docA = fromTopology(exampleTopology('three-tier.yaml'), { includeDefaults: true });
    const typesA = docA.resources.map((r) => r.type);
    expect(typesA).not.toContain('pubsub');
    expect(typesA).not.toContain('worker_pool');
  });

  it('clearing the canvas (replacing with empty topology) produces empty resources', () => {
    // Simulate: load an architecture, then clear the canvas
    const loaded = exampleTopology('three-tier.yaml');
    expect(fromTopology(loaded).resources.length).toBeGreaterThan(0);

    // Canvas cleared
    const cleared: TopologyInput = { nodes: [], edges: [], nodeConfigs: {}, edgeConfigs: {} };
    expect(fromTopology(cleared).resources).toHaveLength(0);
  });

  it('loading architecture B after A: YAML reflects only B', () => {
    // Architecture A: three-tier — has CDN but no global_accelerator
    const docA = fromTopology(exampleTopology('three-tier.yaml'), { includeDefaults: true });
    expect(docA.resources.some((r) => r.type === 'cdn')).toBe(true);
    expect(docA.resources.some((r) => r.type === 'global_accelerator')).toBe(false);

    // Architecture B: multi-az — has global_accelerator but no CDN
    const docB = fromTopology(exampleTopology('multi-az.yaml'), { includeDefaults: true });
    expect(docB.resources.some((r) => r.type === 'global_accelerator')).toBe(true);
    expect(docB.resources.some((r) => r.type === 'cdn')).toBe(false);
  });

  it('multi-az has global_accelerator; three-tier has CDN — their unique resources differ', () => {
    const docThree = fromTopology(exampleTopology('three-tier.yaml'), { includeDefaults: true });
    const docMulti = fromTopology(exampleTopology('multi-az.yaml'), { includeDefaults: true });

    const threeTypes = new Set(docThree.resources.map((r) => r.type));
    const multiTypes = new Set(docMulti.resources.map((r) => r.type));

    // multi-az has global_accelerator; three-tier does not
    expect(multiTypes.has('global_accelerator')).toBe(true);
    expect(threeTypes.has('global_accelerator')).toBe(false);

    // three-tier has CDN; multi-az does not
    expect(threeTypes.has('cdn')).toBe(true);
    expect(multiTypes.has('cdn')).toBe(false);
  });

  it('each architecture independently produces a YAML that re-imports without errors', () => {
    for (const file of ['three-tier.yaml', 'multi-az.yaml', 'event-driven.yaml']) {
      const topo   = exampleTopology(file);
      const yaml   = toYaml(fromTopology(topo, { includeDefaults: true }));
      const parsed = parseDocument(yaml);
      expect(parsed.ok, `${file}: round-tripped YAML failed to parse`).toBe(true);
      if (!parsed.ok) continue;
      const issues = validateDocument(parsed.document);
      const errors = issues.filter((i) => i.severity === 'error');
      expect(errors, `${file}: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
    }
  });
});

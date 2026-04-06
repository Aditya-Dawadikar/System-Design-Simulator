import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseDocument } from '@/iac/parser';
import { validateDocument, hasErrors } from '@/iac/validate';
import { toTopology } from '@/iac/toTopology';
import { fromTopology, toYaml } from '@/iac/fromTopology';

const EXAMPLES_DIR = path.resolve(__dirname, '../../../src/iac/examples');

function loadExample(name: string): string {
  return fs.readFileSync(path.join(EXAMPLES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// Example file validation — all examples must be error-free
// ---------------------------------------------------------------------------

describe('roundtrip — example YAML files are valid', () => {
  for (const file of ['three-tier.yaml', 'multi-az.yaml', 'event-driven.yaml']) {
    it(`${file} parses and validates without errors`, () => {
      const text = loadExample(file);
      const parsed = parseDocument(text);
      expect(parsed.ok, `Parse failed: ${!parsed.ok ? parsed.issues.map((i) => i.message).join(', ') : ''}`).toBe(true);
      if (!parsed.ok) return;

      const issues = validateDocument(parsed.document);
      const errors = issues.filter((i) => i.severity === 'error');
      expect(errors, errors.map((e) => e.message).join('\n')).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Full roundtrip: YAML → parse → toTopology → fromTopology → validate
// ---------------------------------------------------------------------------

describe('roundtrip — YAML → topology → YAML', () => {
  it('three-tier.yaml: resource IDs survive roundtrip', () => {
    const text = loadExample('three-tier.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const originalIds = parsed.document.resources.map((r) => r.id);
    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo, { name: parsed.document.name });

    // All original resource IDs must appear in the exported document
    for (const id of originalIds) {
      const found =
        exported.resources.some((r) => r.id === id) ||
        (exported.regions ?? []).some((r) => r.id === id) ||
        (exported.regions ?? []).flatMap((r) => r.zones ?? []).some((z) => z.id === id);
      expect(found, `ID "${id}" missing from exported document`).toBe(true);
    }
  });

  it('three-tier.yaml: exported document passes validation', () => {
    const text = loadExample('three-tier.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo, { name: parsed.document.name });

    const issues = validateDocument(exported);
    expect(hasErrors(issues)).toBe(false);
  });

  it('multi-az.yaml: exported document has two regions and four zones', () => {
    const text = loadExample('multi-az.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo, { name: parsed.document.name });

    expect(exported.regions).toHaveLength(2);
    const allZones = (exported.regions ?? []).flatMap((r) => r.zones ?? []);
    expect(allZones).toHaveLength(4);
  });

  it('multi-az.yaml: exported document passes validation', () => {
    const text = loadExample('multi-az.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo, { name: parsed.document.name });

    const issues = validateDocument(exported);
    expect(hasErrors(issues)).toBe(false);
  });

  it('multi-az.yaml: autoscaling fields survive roundtrip', () => {
    const text = loadExample('multi-az.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo, { name: parsed.document.name });

    // app-use1a had target_tracking autoscaling
    const appResource = exported.resources.find((r) => r.id === 'app-use1a');
    expect(appResource).toBeDefined();
    expect(appResource?.deploy?.autoscaling?.enabled).toBe(true);
    expect(appResource?.deploy?.autoscaling?.strategy).toBe('target_tracking');
  });

  it('event-driven.yaml: exported document passes validation', () => {
    const text = loadExample('event-driven.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo, { name: parsed.document.name });

    const issues = validateDocument(exported);
    expect(hasErrors(issues)).toBe(false);
  });

  it('event-driven.yaml: connections survive roundtrip', () => {
    const text = loadExample('event-driven.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const originalConnCount = parsed.document.connections?.length ?? 0;
    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo, { name: parsed.document.name });

    expect(exported.connections?.length ?? 0).toBe(originalConnCount);
  });
});

// ---------------------------------------------------------------------------
// toYaml serialization
// ---------------------------------------------------------------------------

describe('toYaml', () => {
  it('produces a non-empty YAML string', () => {
    const text = loadExample('three-tier.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo, { name: 'test' });
    const yamlOut = toYaml(exported);

    expect(yamlOut).toBeTruthy();
    expect(yamlOut).toContain('version: 1');
    expect(yamlOut).toContain('name:');
    expect(yamlOut).toContain('resources:');
  });

  it('produced YAML re-parses successfully', () => {
    const text = loadExample('multi-az.yaml');
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const topo = toTopology(parsed.document);
    const exported = fromTopology(topo, { name: parsed.document.name });
    const yamlOut = toYaml(exported);

    // The YAML output must itself be parseable and valid
    const reParsed = parseDocument(yamlOut);
    expect(reParsed.ok).toBe(true);
    if (!reParsed.ok) return;

    const reIssues = validateDocument(reParsed.document);
    expect(hasErrors(reIssues)).toBe(false);
  });
});

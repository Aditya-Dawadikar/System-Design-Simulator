import { describe, expect, it } from 'vitest';
import { validateDocument, hasErrors } from '@/iac/validate';
import type { IacDocument } from '@/iac/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(overrides: Partial<IacDocument> = {}): IacDocument {
  return {
    version: 1,
    name: 'test',
    resources: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('validateDocument — valid documents', () => {
  it('returns no issues for an empty resources list', () => {
    const issues = validateDocument(makeDoc());
    expect(issues).toHaveLength(0);
  });

  it('returns no issues for a global resource with no placement', () => {
    const doc = makeDoc({
      resources: [{ id: 'tgen', type: 'traffic_generator' }],
    });
    expect(validateDocument(doc)).toHaveLength(0);
  });

  it('returns no issues for a regional resource with matching placement.region', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'us-east-1' }],
      resources: [{ id: 'lb', type: 'load_balancer', placement: { region: 'r1' } }],
    });
    expect(validateDocument(doc)).toHaveLength(0);
  });

  it('returns no issues for a zonal resource with matching placement.zone', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'us-east-1', zones: [{ id: 'z1', label: 'us-east-1a' }] }],
      resources: [{ id: 'app', type: 'app_server', placement: { zone: 'z1' } }],
    });
    expect(validateDocument(doc)).toHaveLength(0);
  });

  it('accepts a full multi-resource document without errors', () => {
    const doc = makeDoc({
      regions: [
        {
          id: 'us-east-1',
          label: 'us-east-1',
          zones: [
            { id: 'use1a', label: 'us-east-1a' },
            { id: 'use1b', label: 'us-east-1b' },
          ],
        },
      ],
      resources: [
        { id: 'tgen', type: 'traffic_generator' },
        { id: 'cdn', type: 'cdn' },
        { id: 'lb', type: 'load_balancer', placement: { region: 'us-east-1' } },
        { id: 'app-a', type: 'app_server', placement: { zone: 'use1a' } },
        { id: 'app-b', type: 'app_server', placement: { zone: 'use1b' } },
        { id: 'db', type: 'database', placement: { zone: 'use1a' } },
      ],
      connections: [
        { from: 'tgen', to: 'cdn' },
        { from: 'cdn', to: 'lb' },
        { from: 'lb', to: 'app-a', splitPct: 50 },
        { from: 'lb', to: 'app-b', splitPct: 50 },
        { from: 'app-a', to: 'db' },
        { from: 'app-b', to: 'db' },
      ],
    });
    const issues = validateDocument(doc);
    expect(hasErrors(issues)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Duplicate IDs
// ---------------------------------------------------------------------------

describe('validateDocument — duplicate IDs', () => {
  it('errors on duplicate resource IDs', () => {
    const doc = makeDoc({
      resources: [
        { id: 'app', type: 'traffic_generator' },
        { id: 'app', type: 'cdn' },
      ],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('Duplicate resource id'))).toBe(true);
  });

  it('errors when a resource ID collides with a region ID', () => {
    const doc = makeDoc({
      regions: [{ id: 'us-east-1', label: 'us-east-1' }],
      resources: [
        { id: 'us-east-1', type: 'cdn' },  // same id as region
      ],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('"us-east-1"'))).toBe(true);
  });

  it('errors when a resource ID collides with a zone ID', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [{ id: 'z1', type: 'cdn' }],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('errors on duplicate region IDs', () => {
    const doc = makeDoc({
      regions: [
        { id: 'r1', label: 'r1' },
        { id: 'r1', label: 'r1-copy' },
      ],
      resources: [],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('Duplicate region id'))).toBe(true);
  });

  it('errors on duplicate zone IDs within a region', () => {
    const doc = makeDoc({
      regions: [
        {
          id: 'r1',
          label: 'r1',
          zones: [
            { id: 'z1', label: 'z1' },
            { id: 'z1', label: 'z1-copy' },
          ],
        },
      ],
      resources: [],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('Duplicate zone id'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Placement validation
// ---------------------------------------------------------------------------

describe('validateDocument — placement rules', () => {
  it('errors when a zonal resource has no placement', () => {
    const doc = makeDoc({
      resources: [{ id: 'app', type: 'app_server' }],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('zonal') && i.message.includes('"app"'))).toBe(true);
  });

  it('errors when a zonal resource references a non-existent zone', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [{ id: 'app', type: 'app_server', placement: { zone: 'z_nonexistent' } }],
    });
    const issues = validateDocument(doc);
    expect(
      issues.some((i) => i.severity === 'error' && i.message.includes('"z_nonexistent"')),
    ).toBe(true);
  });

  it('errors when a regional resource has no placement', () => {
    const doc = makeDoc({
      resources: [{ id: 'lb', type: 'load_balancer' }],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('regional') && i.message.includes('"lb"'))).toBe(true);
  });

  it('errors when a regional resource references a non-existent region', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1' }],
      resources: [{ id: 'lb', type: 'load_balancer', placement: { region: 'r_nonexistent' } }],
    });
    const issues = validateDocument(doc);
    expect(
      issues.some((i) => i.severity === 'error' && i.message.includes('"r_nonexistent"')),
    ).toBe(true);
  });

  it('errors when a global resource has placement.zone', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [{ id: 'cdn', type: 'cdn', placement: { zone: 'z1' } }],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('global') && i.message.includes('placement.zone'))).toBe(true);
  });

  it('errors when a global resource has placement.region', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1' }],
      resources: [{ id: 'cdn', type: 'cdn', placement: { region: 'r1' } }],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('global') && i.message.includes('placement.region'))).toBe(true);
  });

  it('errors when a regional resource has placement.zone', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [{ id: 'lb', type: 'load_balancer', placement: { region: 'r1', zone: 'z1' } }],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('regional') && i.message.includes('placement.zone'))).toBe(true);
  });

  it('warns when a zonal resource redundantly sets placement.region', () => {
    const doc = makeDoc({
      regions: [{ id: 'r1', label: 'r1', zones: [{ id: 'z1', label: 'z1' }] }],
      resources: [{ id: 'app', type: 'app_server', placement: { zone: 'z1', region: 'r1' } }],
    });
    const issues = validateDocument(doc);
    // Should warn but not error
    expect(issues.some((i) => i.severity === 'warning' && i.message.includes('redundant'))).toBe(true);
    expect(hasErrors(issues)).toBe(false);
  });

  it('warns when a container type appears in resources[]', () => {
    const doc = makeDoc({
      resources: [{ id: 'r1', type: 'region' }],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'warning' && i.message.includes('infrastructure container'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Connection validation
// ---------------------------------------------------------------------------

describe('validateDocument — connection rules', () => {
  it('errors on self-referencing connection', () => {
    const doc = makeDoc({
      resources: [{ id: 'app', type: 'traffic_generator' }],
      connections: [{ from: 'app', to: 'app' }],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('self-referencing'))).toBe(true);
  });

  it('errors when connection.from references an unknown resource', () => {
    const doc = makeDoc({
      resources: [{ id: 'app', type: 'traffic_generator' }],
      connections: [{ from: 'nonexistent', to: 'app' }],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('"nonexistent"'))).toBe(true);
  });

  it('errors when connection.to references an unknown resource', () => {
    const doc = makeDoc({
      resources: [{ id: 'app', type: 'traffic_generator' }],
      connections: [{ from: 'app', to: 'ghost' }],
    });
    const issues = validateDocument(doc);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('"ghost"'))).toBe(true);
  });

  it('returns no errors for valid connections', () => {
    const doc = makeDoc({
      resources: [
        { id: 'tgen', type: 'traffic_generator' },
        { id: 'cdn', type: 'cdn' },
      ],
      connections: [{ from: 'tgen', to: 'cdn', protocol: 'REST' }],
    });
    expect(hasErrors(validateDocument(doc))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasErrors helper
// ---------------------------------------------------------------------------

describe('hasErrors', () => {
  it('returns false for empty issues', () => {
    expect(hasErrors([])).toBe(false);
  });

  it('returns false for warnings only', () => {
    expect(hasErrors([{ severity: 'warning', message: 'w' }])).toBe(false);
  });

  it('returns true when at least one error exists', () => {
    expect(hasErrors([{ severity: 'warning', message: 'w' }, { severity: 'error', message: 'e' }])).toBe(true);
  });
});

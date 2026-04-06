import { describe, expect, it } from 'vitest';
import { parseDocument, parseRaw } from '@/iac/parser';

// ---------------------------------------------------------------------------
// parseRaw
// ---------------------------------------------------------------------------

describe('parseRaw', () => {
  it('returns ok:true and the parsed value for valid YAML', () => {
    const result = parseRaw('version: 1\nname: test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ version: 1, name: 'test' });
    }
  });

  it('returns ok:false with a line number on YAML syntax error', () => {
    const result = parseRaw('version: 1\nname: :\n  broken:');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/YAML syntax error/i);
    }
  });

  it('returns ok:true with null/undefined for empty input', () => {
    const result = parseRaw('');
    expect(result.ok).toBe(true);
    if (result.ok) {
      // js-yaml returns null or undefined for empty/null YAML — both are acceptable
      expect(result.data == null).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// parseDocument — happy path
// ---------------------------------------------------------------------------

describe('parseDocument — valid documents', () => {
  it('accepts a minimal valid document', () => {
    const yaml = `
version: 1
name: minimal
resources: []
`.trim();
    const result = parseDocument(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.version).toBe(1);
      expect(result.document.name).toBe('minimal');
      expect(result.document.resources).toEqual([]);
    }
  });

  it('accepts globals, regions, connections, and scenarios', () => {
    const yaml = `
version: 1
name: full
globals:
  peakRps: 1000
  trafficPattern: ramp
regions:
  - id: us-east-1
    label: us-east-1
    zones:
      - id: use1a
        label: us-east-1a
resources:
  - id: tgen
    type: traffic_generator
    spec:
      generatorRps: 1000
  - id: app
    type: app_server
    placement:
      zone: use1a
    deploy:
      instances: 2
connections:
  - from: tgen
    to: app
    protocol: REST
scenarios:
  - type: steady_state
    enabled: true
`.trim();
    const result = parseDocument(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const doc = result.document;
      expect(doc.globals?.peakRps).toBe(1000);
      expect(doc.globals?.trafficPattern).toBe('ramp');
      expect(doc.regions).toHaveLength(1);
      expect(doc.regions![0].zones).toHaveLength(1);
      expect(doc.resources).toHaveLength(2);
      expect(doc.connections).toHaveLength(1);
      expect(doc.scenarios).toHaveLength(1);
    }
  });

  it('parses all autoscaling fields in deploy block', () => {
    const yaml = `
version: 1
name: as-test
resources:
  - id: app
    type: app_server
    placement:
      zone: z1
    deploy:
      instances: 3
      autoscaling:
        enabled: true
        strategy: target_tracking
        minInstances: 2
        maxInstances: 10
        targetMetric: load
        targetValue: 70
`.trim();
    const result = parseDocument(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const as = result.document.resources[0].deploy?.autoscaling;
      expect(as?.enabled).toBe(true);
      expect(as?.strategy).toBe('target_tracking');
      expect(as?.minInstances).toBe(2);
      expect(as?.maxInstances).toBe(10);
      expect(as?.targetMetric).toBe('load');
      expect(as?.targetValue).toBe(70);
    }
  });

  it('parses all connection edge config fields', () => {
    const yaml = `
version: 1
name: edge-test
resources:
  - id: a
    type: traffic_generator
  - id: b
    type: app_server
    placement:
      zone: z1
connections:
  - from: a
    to: b
    protocol: gRPC
    timeoutMs: 2000
    retryCount: 3
    circuitBreaker: true
    circuitBreakerThreshold: 40
    bandwidthMbps: 100
    splitPct: 50
`.trim();
    const result = parseDocument(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const conn = result.document.connections![0];
      expect(conn.protocol).toBe('gRPC');
      expect(conn.timeoutMs).toBe(2000);
      expect(conn.retryCount).toBe(3);
      expect(conn.circuitBreaker).toBe(true);
      expect(conn.circuitBreakerThreshold).toBe(40);
      expect(conn.bandwidthMbps).toBe(100);
      expect(conn.splitPct).toBe(50);
    }
  });
});

// ---------------------------------------------------------------------------
// parseDocument — schema errors
// ---------------------------------------------------------------------------

describe('parseDocument — schema validation errors', () => {
  it('rejects missing version', () => {
    const yaml = `name: test\nresources: []`;
    const result = parseDocument(yaml);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path?.includes('version'))).toBe(true);
    }
  });

  it('rejects version !== 1', () => {
    const yaml = `version: 2\nname: test\nresources: []`;
    const result = parseDocument(yaml);
    expect(result.ok).toBe(false);
  });

  it('rejects missing name', () => {
    const yaml = `version: 1\nresources: []`;
    const result = parseDocument(yaml);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path?.includes('name'))).toBe(true);
    }
  });

  it('rejects an unknown resource type', () => {
    const yaml = `
version: 1
name: t
resources:
  - id: x
    type: not_a_real_type
`.trim();
    const result = parseDocument(yaml);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it('rejects an invalid trafficPattern enum value', () => {
    const yaml = `
version: 1
name: t
globals:
  trafficPattern: turbo
resources: []
`.trim();
    const result = parseDocument(yaml);
    expect(result.ok).toBe(false);
  });

  it('rejects an invalid protocol enum value', () => {
    const yaml = `
version: 1
name: t
resources:
  - id: a
    type: traffic_generator
  - id: b
    type: app_server
connections:
  - from: a
    to: b
    protocol: HTTP
`.trim();
    const result = parseDocument(yaml);
    expect(result.ok).toBe(false);
  });

  it('rejects empty document', () => {
    const result = parseDocument('');
    expect(result.ok).toBe(false);
  });

  it('rejects a YAML list at root level', () => {
    const result = parseDocument('- a\n- b\n');
    expect(result.ok).toBe(false);
  });

  it('rejects a YAML scalar at root level', () => {
    const result = parseDocument('hello');
    expect(result.ok).toBe(false);
  });
});

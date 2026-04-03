'use client';

import { useArchitectureStore } from '@/store/architectureStore';

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: '4px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px',
  padding: '5px 8px',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2338505f'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  paddingRight: '24px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '9px',
  color: 'var(--text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  display: 'block',
  marginBottom: '5px',
};

const fieldStyle: React.CSSProperties = { marginBottom: '14px' };

const hintStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '9px',
  color: 'var(--text-dim)',
  marginTop: '5px',
  lineHeight: 1.5,
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

function nanoid6(): string {
  return Math.random().toString(36).slice(2, 8);
}

interface ServiceMeshFieldsProps {
  nodeId: string;
}

export default function ServiceMeshFields({ nodeId }: ServiceMeshFieldsProps) {
  const config           = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);
  const edges            = useArchitectureStore((s) => s.edges);
  const nodeConfigs      = useArchitectureStore((s) => s.nodeConfigs);

  const mtlsEnabled = config.mtlsEnabled !== false;
  const cbEnabled   = config.meshCircuitBreakerEnabled ?? false;
  const routes      = config.meshRoutes ?? [];

  // Collect IDs of all nodes connected to this service mesh node
  const connectedNodeIds = Array.from(
    new Set(
      edges
        .filter((e) => e.source === nodeId || e.target === nodeId)
        .map((e) => (e.source === nodeId ? e.target : e.source))
    )
  );

  // Build service options: { id, label }
  const serviceOptions = connectedNodeIds.map((id) => ({
    id,
    label: nodeConfigs[id]?.label ?? id,
  }));

  // Detect duplicate (source, dest) pairs — keep only max-weight one as "effective"
  const effectiveRouteIds = new Set<string>();
  const pairMaxWeight = new Map<string, { id: string; weight: number }>();
  for (const r of routes) {
    const key = `${r.sourceNodeId}→${r.destNodeId}`;
    const cur = pairMaxWeight.get(key);
    if (!cur || r.weightPct > cur.weight) {
      pairMaxWeight.set(key, { id: r.id, weight: r.weightPct });
    }
  }
  pairMaxWeight.forEach((v) => effectiveRouteIds.add(v.id));

  const totalWeight = routes
    .filter((r) => effectiveRouteIds.has(r.id))
    .reduce((s, r) => s + r.weightPct, 0);

  function updateRoutes(next: typeof routes) {
    updateNodeConfig(nodeId, { meshRoutes: next });
  }

  function addRoute() {
    const src = connectedNodeIds[0] ?? '';
    const dst = connectedNodeIds[1] ?? connectedNodeIds[0] ?? '';
    updateRoutes([...routes, { id: nanoid6(), sourceNodeId: src, destNodeId: dst, weightPct: 50 }]);
  }

  function removeRoute(id: string) {
    updateRoutes(routes.filter((r) => r.id !== id));
  }

  function patchRoute(id: string, patch: Partial<{ sourceNodeId: string; destNodeId: string; weightPct: number }>) {
    updateRoutes(routes.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      {/* mTLS */}
      <div style={fieldStyle}>
        <div style={toggleRowStyle}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Mutual TLS (mTLS)</label>
          <input
            type="checkbox"
            checked={mtlsEnabled}
            onChange={(e) => updateNodeConfig(nodeId, { mtlsEnabled: e.target.checked })}
            style={{ cursor: 'pointer', accentColor: '#22d3ee' }}
          />
        </div>
        <div style={hintStyle}>Encrypts and authenticates all service-to-service traffic. Adds ~1 ms per hop.</div>
      </div>

      {/* Proxy overhead */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Proxy Overhead (ms)</label>
        <input
          type="number"
          min={0}
          max={50}
          step={0.5}
          value={config.proxyOverheadMs ?? 2}
          onChange={(e) => updateNodeConfig(nodeId, { proxyOverheadMs: Number(e.target.value) })}
          style={inputStyle}
        />
        <div style={hintStyle}>Latency added by the sidecar proxy per request hop (Envoy default ≈ 2 ms).</div>
      </div>

      {/* Observability */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Observability Level</label>
        <select
          value={config.observabilityLevel ?? 'basic'}
          onChange={(e) =>
            updateNodeConfig(nodeId, { observabilityLevel: e.target.value as 'none' | 'basic' | 'full' })
          }
          style={selectStyle}
        >
          <option value="none">None — no telemetry (+0 ms)</option>
          <option value="basic">Basic — metrics only (+0.5 ms)</option>
          <option value="full">Full — metrics + traces + logs (+1 ms)</option>
        </select>
      </div>

      {/* Retry count */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Mesh Retry Count</label>
        <input
          type="number"
          min={0}
          max={5}
          value={config.meshRetryCount ?? 1}
          onChange={(e) => updateNodeConfig(nodeId, { meshRetryCount: Number(e.target.value) })}
          style={inputStyle}
        />
        <div style={hintStyle}>
          Retries reduce caller-visible error rate but add latency and amplify downstream load.
          Each retry adds ~1 proxy round-trip per failed request.
        </div>
      </div>

      {/* Circuit breaker */}
      <div style={fieldStyle}>
        <div style={toggleRowStyle}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Circuit Breaker</label>
          <input
            type="checkbox"
            checked={cbEnabled}
            onChange={(e) => updateNodeConfig(nodeId, { meshCircuitBreakerEnabled: e.target.checked })}
            style={{ cursor: 'pointer', accentColor: '#22d3ee' }}
          />
        </div>
        <div style={hintStyle}>Opens the circuit when error rate exceeds the threshold, fast-failing traffic.</div>
      </div>

      {cbEnabled && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Circuit Breaker Threshold (%)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={config.meshCircuitBreakerThreshold ?? 50}
            onChange={(e) => updateNodeConfig(nodeId, { meshCircuitBreakerThreshold: Number(e.target.value) })}
            style={inputStyle}
          />
          <div style={hintStyle}>Error rate % at which the circuit breaker opens. Lower = more sensitive.</div>
        </div>
      )}

      {/* Routing table */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px',
              fontWeight: 700,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Routing Table
          </span>
          <button
            onClick={addRoute}
            disabled={connectedNodeIds.length < 1}
            title={connectedNodeIds.length < 1 ? 'Connect services to this mesh node first' : 'Add route rule'}
            style={{
              background: connectedNodeIds.length < 1
                ? 'color-mix(in srgb, #22d3ee 5%, transparent)'
                : 'color-mix(in srgb, #22d3ee 12%, transparent)',
              border: '1px solid color-mix(in srgb, #22d3ee 30%, transparent)',
              color: connectedNodeIds.length < 1 ? 'color-mix(in srgb, #22d3ee 40%, transparent)' : '#22d3ee',
              borderRadius: 4,
              padding: '2px 8px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              cursor: connectedNodeIds.length < 1 ? 'not-allowed' : 'pointer',
              letterSpacing: '0.06em',
            }}
          >
            + ADD
          </button>
        </div>

        {/* Connected services summary */}
        {connectedNodeIds.length === 0 ? (
          <div style={hintStyle}>
            No services connected. Wire microservices to this mesh node to configure routing rules.
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 600 }}>
              CONNECTED SERVICES ({connectedNodeIds.length})
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
              }}
            >
              {serviceOptions.map((svc) => (
                <span
                  key={svc.id}
                  style={{
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#22d3ee',
                    background: 'color-mix(in srgb, #22d3ee 10%, transparent)',
                    border: '1px solid color-mix(in srgb, #22d3ee 25%, transparent)',
                    borderRadius: 3,
                    padding: '2px 6px',
                  }}
                >
                  {svc.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {routes.length === 0 && connectedNodeIds.length > 0 && (
          <div style={hintStyle}>
            No routes defined. Traffic splits equally across all outgoing edges.
            Add rules to control per-service traffic weight.
          </div>
        )}

        {/* Column headers */}
        {routes.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 14px 1fr 48px 18px',
              gap: 4,
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>FROM</span>
            <span />
            <span style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>TO</span>
            <span style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', textAlign: 'right' }}>WEIGHT</span>
            <span />
          </div>
        )}

        {routes.map((route) => {
          const isEffective = effectiveRouteIds.has(route.id);
          const isShadowed = !isEffective;

          const effectiveWeight = totalWeight > 0
            ? Math.round((route.weightPct / totalWeight) * 100)
            : route.weightPct;

          return (
            <div
              key={route.id}
              style={{
                marginBottom: 6,
                opacity: isShadowed ? 0.45 : 1,
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 14px 1fr 48px 18px',
                  gap: 4,
                  alignItems: 'center',
                }}
              >
                {/* From dropdown */}
                <select
                  value={route.sourceNodeId}
                  onChange={(e) => patchRoute(route.id, { sourceNodeId: e.target.value })}
                  style={{ ...selectStyle, padding: '4px 20px 4px 6px', backgroundPosition: 'right 4px center' }}
                >
                  <option value="">— any —</option>
                  {serviceOptions.map((svc) => (
                    <option key={svc.id} value={svc.id}>{svc.label}</option>
                  ))}
                </select>

                {/* Arrow */}
                <span style={{ color: 'var(--text-dim)', fontSize: 9, textAlign: 'center', userSelect: 'none' }}>→</span>

                {/* To dropdown */}
                <select
                  value={route.destNodeId}
                  onChange={(e) => patchRoute(route.id, { destNodeId: e.target.value })}
                  style={{ ...selectStyle, padding: '4px 20px 4px 6px', backgroundPosition: 'right 4px center' }}
                >
                  <option value="">— any —</option>
                  {serviceOptions.map((svc) => (
                    <option key={svc.id} value={svc.id}>{svc.label}</option>
                  ))}
                </select>

                {/* Weight input */}
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={route.weightPct}
                  onChange={(e) => patchRoute(route.id, { weightPct: Math.max(0, Number(e.target.value)) })}
                  style={{ ...inputStyle, padding: '4px 6px', textAlign: 'right' }}
                />

                {/* Remove */}
                <button
                  onClick={() => removeRoute(route.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-red)',
                    cursor: 'pointer',
                    fontSize: 13,
                    lineHeight: 1,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>

              {/* Status row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 3,
                  paddingLeft: 2,
                }}
              >
                {isShadowed ? (
                  <span
                    style={{
                      fontSize: 8,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'var(--accent-orange)',
                      background: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--accent-orange) 25%, transparent)',
                      borderRadius: 3,
                      padding: '1px 5px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    SHADOWED — higher-weight rule wins
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 8,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#22d3ee',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {isEffective && totalWeight > 0
                      ? `${effectiveWeight}% of traffic`
                      : 'effective'}
                  </span>
                )}
                {isShadowed && (
                  <span style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                    wt {route.weightPct}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {routes.length > 0 && (
          <div style={hintStyle}>
            Effective weights normalized to 100%. Duplicate source→dest pairs: only the highest weight is applied — others are shadowed.
            {totalWeight > 0 && ` Total weight: ${totalWeight}.`}
          </div>
        )}
      </div>
    </div>
  );
}

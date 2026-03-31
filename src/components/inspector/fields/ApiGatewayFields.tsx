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

const GATEWAY_COLOR = '#3b82f6';

function nanoid6(): string {
  return Math.random().toString(36).slice(2, 8);
}

interface ApiGatewayFieldsProps {
  nodeId: string;
}

export default function ApiGatewayFields({ nodeId }: ApiGatewayFieldsProps) {
  const config           = useArchitectureStore((s) => s.nodeConfigs[nodeId] ?? {});
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);
  const edges            = useArchitectureStore((s) => s.edges);
  const nodeConfigs      = useArchitectureStore((s) => s.nodeConfigs);

  const authEnabled   = config.gatewayAuthEnabled ?? false;
  const cacheEnabled  = config.gatewayCacheEnabled ?? false;
  const routes        = config.gatewayRoutes ?? [];

  // Downstream nodes only (API Gateway routes traffic OUT to microservices)
  const downstreamNodeIds = Array.from(
    new Set(
      edges
        .filter((e) => e.source === nodeId)
        .map((e) => e.target)
    )
  );

  const serviceOptions = downstreamNodeIds.map((id) => ({
    id,
    label: nodeConfigs[id]?.label ?? id,
  }));

  // Detect shadowed routes (duplicate destNodeId — keep max weight)
  const destMaxWeight = new Map<string, { id: string; weight: number }>();
  for (const r of routes) {
    const cur = destMaxWeight.get(r.destNodeId);
    if (!cur || r.weightPct > cur.weight) {
      destMaxWeight.set(r.destNodeId, { id: r.id, weight: r.weightPct });
    }
  }
  const effectiveRouteIds = new Set(Array.from(destMaxWeight.values()).map((v) => v.id));

  const totalWeight = routes
    .filter((r) => effectiveRouteIds.has(r.id))
    .reduce((s, r) => s + r.weightPct, 0);

  function updateRoutes(next: typeof routes) {
    updateNodeConfig(nodeId, { gatewayRoutes: next });
  }

  function addRoute() {
    const dst = downstreamNodeIds[0] ?? '';
    updateRoutes([...routes, { id: nanoid6(), path: '', destNodeId: dst, weightPct: 50 }]);
  }

  function removeRoute(id: string) {
    updateRoutes(routes.filter((r) => r.id !== id));
  }

  function patchRoute(id: string, patch: Partial<{ path: string; destNodeId: string; weightPct: number }>) {
    updateRoutes(routes.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      {/* Auth */}
      <div style={fieldStyle}>
        <div style={toggleRowStyle}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Request Auth</label>
          <input
            type="checkbox"
            checked={authEnabled}
            onChange={(e) => updateNodeConfig(nodeId, { gatewayAuthEnabled: e.target.checked })}
            style={{ cursor: 'pointer', accentColor: GATEWAY_COLOR }}
          />
        </div>
        <div style={hintStyle}>Validates tokens/API keys per request. Adds overhead per hop.</div>
      </div>

      {authEnabled && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Auth Overhead (ms)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={config.gatewayAuthOverheadMs ?? 5}
            onChange={(e) => updateNodeConfig(nodeId, { gatewayAuthOverheadMs: Number(e.target.value) })}
            style={inputStyle}
          />
          <div style={hintStyle}>Latency added per request for token validation (JWT verify ≈ 1–5 ms, external IdP ≈ 10–50 ms).</div>
        </div>
      )}

      {/* Response caching */}
      <div style={fieldStyle}>
        <div style={toggleRowStyle}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Response Cache</label>
          <input
            type="checkbox"
            checked={cacheEnabled}
            onChange={(e) => updateNodeConfig(nodeId, { gatewayCacheEnabled: e.target.checked })}
            style={{ cursor: 'pointer', accentColor: GATEWAY_COLOR }}
          />
        </div>
        <div style={hintStyle}>Caches read responses at the gateway, reducing load on downstream services.</div>
      </div>

      {cacheEnabled && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Cache Hit % (reads)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={5}
            value={config.gatewayCacheHitPct ?? 30}
            onChange={(e) => updateNodeConfig(nodeId, { gatewayCacheHitPct: Number(e.target.value) })}
            style={inputStyle}
          />
          <div style={hintStyle}>Percentage of read requests served from gateway cache. Writes always pass through.</div>
        </div>
      )}

      {/* Route table */}
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
            Route Table
          </span>
          <button
            onClick={addRoute}
            disabled={downstreamNodeIds.length < 1}
            title={downstreamNodeIds.length < 1 ? 'Connect downstream services first' : 'Add route'}
            style={{
              background: downstreamNodeIds.length < 1
                ? `color-mix(in srgb, ${GATEWAY_COLOR} 5%, transparent)`
                : `color-mix(in srgb, ${GATEWAY_COLOR} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${GATEWAY_COLOR} 30%, transparent)`,
              color: downstreamNodeIds.length < 1
                ? `color-mix(in srgb, ${GATEWAY_COLOR} 40%, transparent)`
                : GATEWAY_COLOR,
              borderRadius: 4,
              padding: '2px 8px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              cursor: downstreamNodeIds.length < 1 ? 'not-allowed' : 'pointer',
              letterSpacing: '0.06em',
            }}
          >
            + ADD
          </button>
        </div>

        {/* Downstream services summary */}
        {downstreamNodeIds.length === 0 ? (
          <div style={hintStyle}>
            No downstream services connected. Wire this gateway to app servers or other services to configure routing.
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 600 }}>
              DOWNSTREAM SERVICES ({downstreamNodeIds.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {serviceOptions.map((svc) => (
                <span
                  key={svc.id}
                  style={{
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: GATEWAY_COLOR,
                    background: `color-mix(in srgb, ${GATEWAY_COLOR} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${GATEWAY_COLOR} 25%, transparent)`,
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

        {routes.length === 0 && downstreamNodeIds.length > 0 && (
          <div style={hintStyle}>
            No routes defined. Traffic splits equally across all outgoing edges.
            Add routes to control per-service traffic weight.
          </div>
        )}

        {/* Column headers */}
        {routes.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 48px 18px',
              gap: 4,
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>PATH</span>
            <span style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>SERVICE</span>
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
              style={{ marginBottom: 6, opacity: isShadowed ? 0.45 : 1, position: 'relative' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 48px 18px',
                  gap: 4,
                  alignItems: 'center',
                }}
              >
                {/* Path prefix */}
                <input
                  type="text"
                  placeholder="/api/..."
                  value={route.path ?? ''}
                  onChange={(e) => patchRoute(route.id, { path: e.target.value })}
                  style={{ ...inputStyle, padding: '4px 6px', fontSize: 10 }}
                  spellCheck={false}
                />

                {/* Destination service */}
                <select
                  value={route.destNodeId}
                  onChange={(e) => patchRoute(route.id, { destNodeId: e.target.value })}
                  style={{ ...selectStyle, padding: '4px 20px 4px 6px', backgroundPosition: 'right 4px center' }}
                >
                  <option value="">— select —</option>
                  {serviceOptions.map((svc) => (
                    <option key={svc.id} value={svc.id}>{svc.label}</option>
                  ))}
                </select>

                {/* Weight */}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, paddingLeft: 2 }}>
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
                  <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: GATEWAY_COLOR, letterSpacing: '0.04em' }}>
                    {totalWeight > 0 ? `${effectiveWeight}% of traffic` : 'effective'}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {routes.length > 0 && (
          <div style={hintStyle}>
            Weights are normalized to 100%. Each path prefix is for documentation only — the engine routes by destination weight.
            {totalWeight > 0 && ` Total weight: ${totalWeight}.`}
          </div>
        )}
      </div>
    </div>
  );
}

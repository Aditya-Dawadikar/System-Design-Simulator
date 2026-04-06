# Service Mesh

**Scope:** `regional`

Use this component to model sidecar proxy overhead, retries, mTLS, and circuit-breaking between services.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `mtlsEnabled` | `true` | `true` / `false` | Enables mTLS handshake overhead. |
| `observabilityLevel` | `basic` | `none`, `basic`, `full` | Adds different telemetry overhead levels. |
| `proxyOverheadMs` | `2` | number `>= 0` | Per-hop proxy latency cost. |
| `meshRetryCount` | `1` | integer `>= 0` | Number of automatic retries. |
| `meshCircuitBreakerEnabled` | `false` | `true` / `false` | Enables downstream-aware breaker behavior. |
| `meshCircuitBreakerThreshold` | `50` | `0–100` | Error percentage that opens the breaker. |
| `meshRoutes` | none | array of weighted routes | Each route uses `{ id, sourceNodeId, destNodeId, weightPct }`. |
| `regionId` | — | existing region node ID | Required regional placement field. |

## Simulation notes

| Item | Value |
|---|---|
| Base latency | `proxyOverheadMs × 2` plus mTLS/telemetry overhead |
| Retry model | Retries can amplify downstream RPS |
| Circuit breaker | When open, only ~5% of traffic passes through |
| Route handling | Duplicate destination rules are deduplicated by max weight |

## YAML example

```yaml
- id: mesh
  type: service_mesh
  label: East-West Mesh
  placement:
    region: us-east-1
  spec:
    mtlsEnabled: true
    observabilityLevel: full
    proxyOverheadMs: 3
    meshRetryCount: 2
    meshCircuitBreakerEnabled: true
    meshCircuitBreakerThreshold: 40
```

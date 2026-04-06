# API Gateway

**Scope:** `regional`

Use this component to expose multiple backend services behind one routed API surface.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `gatewayRoutes` | none | array of route objects | Each route uses `{ id, path?, destNodeId, weightPct }`. |
| `gatewayAuthEnabled` | `false` | `true` / `false` | Adds auth-related latency overhead. |
| `gatewayAuthOverheadMs` | `5` | number `>= 0` | Extra latency added when auth is enabled. |
| `gatewayCacheEnabled` | `false` | `true` / `false` | Enables gateway-level response caching for reads. |
| `gatewayCacheHitPct` | `30` | `0–100` | Read cache hit rate when caching is enabled. |
| `regionId` | — | existing region node ID | Required regional placement field. |

## Simulation notes

| Item | Value |
|---|---|
| Capacity model | `50,000 RPS` |
| Base latency | `5 ms` + optional auth overhead |
| Routing rules | Resolved before traversal and deduplicated by destination |
| Cache scope | Read traffic only |

## YAML example

```yaml
- id: api-gw
  type: api_gateway
  label: Public API
  placement:
    region: us-east-1
  spec:
    gatewayAuthEnabled: true
    gatewayAuthOverheadMs: 8
    gatewayCacheEnabled: true
    gatewayCacheHitPct: 35
    gatewayRoutes:
      - id: users
        path: /users
        destNodeId: api-a
        weightPct: 100
```

# Global Accelerator

**Scope:** `global`

Use this component when a topology needs multi-region ingress and health-aware failover.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `routingPolicy` | `latency` | `latency`, `geo`, `weighted` | Primary routing strategy label for the global entry point. |
| `failoverEnabled` | `true` | `true` / `false` | Enables health-aware rerouting away from failed regions. |

## Routing behavior

| Item | Value |
|---|---|
| Base latency | `5 ms` |
| Capacity model | `500,000 RPS` |
| Region weighting | Healthy downstream regions are weighted by active zone count |
| Failover | Failed regions receive weight `0` when failover is enabled |

## YAML example

```yaml
- id: ga
  type: global_accelerator
  label: Global Entry
  placement:
    scope: global
  spec:
    routingPolicy: latency
    failoverEnabled: true
```

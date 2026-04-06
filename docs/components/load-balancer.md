# Load Balancer

**Scope:** `regional`

This component distributes traffic across healthy downstream services inside one region.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `algorithm` | `round_robin` | `round_robin`, `least_conn`, `ip_hash`, `random`, `weighted` | Distribution strategy label. |
| `healthChecks` | `true` | `true` / `false` | Allows health-aware redistribution around unhealthy targets. |
| `maxConnections` | `100000` | integer `>= 1` | Connection tracking ceiling used in metrics. |
| `regionId` | — | existing region node ID | Required for regional placement in YAML. |

## Simulation notes

| Item | Value |
|---|---|
| Capacity model | `50,000 RPS` |
| Base latency | `2 ms` |
| Health-aware routing | Yes — traffic avoids failed downstream targets when possible |
| Detail metrics | active connections, failed targets, available zones |

## YAML example

```yaml
- id: api-lb
  type: load_balancer
  label: API LB
  placement:
    region: us-east-1
  spec:
    algorithm: least_conn
    healthChecks: true
    maxConnections: 120000
```

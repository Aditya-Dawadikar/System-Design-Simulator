# Redis Cache

**Scope:** `zonal`

Use this component to absorb read-heavy traffic and reduce database pressure.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `memoryGb` | `8` | number `> 0` | Higher memory generally improves hit rate. |
| `ttlSeconds` | `60` | number `>= 0` | Cache TTL hint. |
| `evictionPolicy` | `lru` | `lru`, `lfu`, `noeviction` | Determines eviction style under pressure. |
| `clusterMode` | `false` | `true` / `false` | Logical cluster toggle. |
| `zoneId` | — | existing zone node ID | Required zonal placement field. |

## Simulation notes

| Item | Value |
|---|---|
| Capacity model | `100,000 RPS` |
| Base latency | `1 ms` |
| Hit-rate behavior | Improves with memory, degrades under memory pressure |
| Metrics | hit rate, eviction rate, memory used % |

## YAML example

```yaml
- id: redis-a
  type: cache
  label: Redis Cache
  placement:
    zone: use1a
  spec:
    memoryGb: 16
    ttlSeconds: 120
    evictionPolicy: lfu
    clusterMode: true
```

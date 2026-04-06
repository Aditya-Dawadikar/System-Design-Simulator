# CDN Edge

**Scope:** `global`

Use this component to represent an edge cache that absorbs read traffic before it reaches the origin stack.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `pops` | `2` | integer `>= 1` | Number of edge PoPs used by the simulator capacity model. |
| `cacheablePct` | `60` | `0–100` | Percentage of requests that can be cached. Mostly affects reads. |
| `bandwidthGbps` | `100` | number `> 0` | Aggregate bandwidth reported in metrics. |

## Simulation notes

| Item | Value |
|---|---|
| Capacity model | `pops × 25,000 RPS` |
| Base latency | `5 ms` |
| Behavior | Reads may be served at the edge; writes and cache misses continue downstream |
| Degradation | Hit rate drops when load stays above ~80% |

## YAML example

```yaml
- id: edge
  type: cdn
  label: Global CDN
  placement:
    scope: global
  spec:
    pops: 4
    cacheablePct: 70
    bandwidthGbps: 150
```

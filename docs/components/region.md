# Region

**Scope:** structural / global container

Use this node to group availability zones and regional resources into a cloud-region boundary.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `regionName` | `us-east-1` | string | Human-readable region label. |
| `regionFailed` | `false` | `true` / `false` | Simulates an entire region outage. |
| `containerWidth` | `900` | number `> 0` | Canvas width for the region container. |
| `containerHeight` | `560` | number `> 0` | Canvas height for the region container. |

## Simulation notes

| Item | Value |
|---|---|
| Processes traffic | Transparent container only |
| Failure effect | If `regionFailed` is true, resources in the region are force-failed |
| Cross-region latency | Edges crossing regions add `+75 ms` |

## YAML example

```yaml
regions:
  - id: us-east-1
    label: us-east-1
```

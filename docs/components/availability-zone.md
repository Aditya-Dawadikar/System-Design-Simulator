# Availability Zone

**Scope:** structural / global container

Use this node to represent an isolated failure domain inside a region.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `zoneName` | `us-east-1a` | string | Human-readable AZ label. |
| `zoneFailed` | `false` | `true` / `false` | Simulates an AZ outage. |
| `containerWidth` | `380` | number `> 0` | Canvas width for the AZ container. |
| `containerHeight` | `440` | number `> 0` | Canvas height for the AZ container. |
| `regionId` | — | existing region node ID | Connects the AZ to its region. |

## Simulation notes

| Item | Value |
|---|---|
| Processes traffic | Transparent container only |
| Failure effect | Zonal resources using the zone fail when `zoneFailed` is true |
| Cross-AZ latency | Edges crossing AZs in the same region add `+2 ms` |

## YAML example

```yaml
regions:
  - id: us-east-1
    label: us-east-1
    zones:
      - id: use1a
        label: us-east-1a
```

# Private Subnet

**Scope:** structural / visual container

This is a layout and documentation container for internal-only services and data tiers.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `subnetCidr` | `10.0.1.0/24` | CIDR string | Display-only network range. |
| `containerWidth` | `500` | number `> 0` | Canvas width for the subnet box. |
| `containerHeight` | `350` | number `> 0` | Canvas height for the subnet box. |

## Simulation notes

| Item | Value |
|---|---|
| Processes traffic | No |
| Failure behavior | None directly |
| Best use | group app tiers, caches, databases, and workers visually |

## YAML example

```yaml
- id: private-sn
  type: private_subnet
  label: Private Subnet
  placement:
    scope: global
  spec:
    subnetCidr: 10.0.1.0/24
```

# Public Subnet

**Scope:** structural / visual container

This is a layout and documentation container for internet-facing resources.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `subnetCidr` | `10.0.0.0/24` | CIDR string | Display-only network range. |
| `containerWidth` | `500` | number `> 0` | Canvas width for the subnet box. |
| `containerHeight` | `350` | number `> 0` | Canvas height for the subnet box. |

## Simulation notes

| Item | Value |
|---|---|
| Processes traffic | No |
| Failure behavior | None directly |
| Best use | group load balancers, firewalls, and NAT gateways visually |

## YAML example

```yaml
- id: public-sn
  type: public_subnet
  label: Public Subnet
  placement:
    scope: global
  spec:
    subnetCidr: 10.0.0.0/24
```

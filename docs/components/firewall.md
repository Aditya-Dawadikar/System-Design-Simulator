# Firewall

**Scope:** `regional`

This component models inline packet inspection and traffic blocking before requests reach downstream services.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `firewallRules` | `10` | integer `>= 0` | Affects detection efficiency and capacity. |
| `firewallInspectionMode` | `basic` | `basic`, `deep` | Deeper inspection adds more latency and lower throughput. |
| `firewallBlockRatePct` | `0` | `0–100` | Manual block rate override applied in addition to auto-detection. |
| `regionId` | — | existing region node ID | Required regional placement field. |

## Inspection behavior

| Mode | Base latency | Approximate capacity |
|---|---:|---:|
| `basic` | `2 ms` | higher |
| `deep` | `10 ms` | lower |

## Simulation notes

- Detection efficiency increases with more rules.
- The firewall scrubs bad traffic so downstream `badRatio` is reduced to zero.
- Metrics include allowed RPS, blocked RPS, auto-detected RPS, and manual blocked RPS.

## YAML example

```yaml
- id: waf
  type: firewall
  label: Edge Firewall
  placement:
    region: us-east-1
  spec:
    firewallRules: 25
    firewallInspectionMode: deep
    firewallBlockRatePct: 15
```

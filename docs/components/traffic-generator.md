# Traffic Generator

**Scope:** `global`

This source node injects synthetic traffic into the topology and sets the read/write and good/bad traffic mix.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `generatorRps` | `1000` | number `>= 0` | Baseline request rate emitted by the node. |
| `generatorPattern` | `steady` | `steady`, `ramp`, `spike`, `wave`, `chaos` | Controls traffic shape over time. |
| `readRatioPct` | `50` | `0–100` | Percentage of traffic considered reads. |
| `badTrafficPct` | `0` | `0–100` | Percentage of generated traffic flagged as malicious. |

## Pattern behavior

| Pattern | Behavior |
|---|---|
| `steady` | constant baseline load |
| `ramp` | gradually increases over time |
| `spike` | brief high burst followed by a quieter period |
| `wave` | sinusoidal rise/fall pattern |
| `chaos` | randomized multiplier every tick |

## YAML example

```yaml
- id: users
  type: traffic_generator
  label: Internet Users
  placement:
    scope: global
  spec:
    generatorRps: 2500
    generatorPattern: spike
    readRatioPct: 80
    badTrafficPct: 5
```

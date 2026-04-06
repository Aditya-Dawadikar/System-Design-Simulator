# NAT Gateway

**Scope:** `regional`

Use this node when private workloads must send traffic to the public internet through a controlled egress point.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `natBandwidthGbps` | `10` | number `> 0` | Main throughput setting used by the simulator. |
| `maxConnections` | `55000` | integer `>= 1` | Tracked connection ceiling. |
| `regionId` | — | existing region node ID | Required regional placement field. |

## Simulation notes

| Item | Value |
|---|---|
| Capacity model | `natBandwidthGbps × 5,000 RPS` |
| Base latency | `3 ms` |
| Metrics | translated connections, bandwidth utilization, dropped packets |
| Important note | Traffic only flows through the NAT if you wire edges through it explicitly |

## YAML example

```yaml
- id: nat-a
  type: nat_gateway
  label: Private Egress NAT
  placement:
    region: us-east-1
  spec:
    natBandwidthGbps: 20
    maxConnections: 80000
```

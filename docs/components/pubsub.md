# Pub/Sub

**Scope:** `regional`

This component represents an async topic or stream-like bus that buffers work between producers and consumers.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `partitions` | `4` | integer `>= 1` | Main throughput parallelism control. |
| `messageRetentionHours` | `24` | number `> 0` | Retention window for buffered messages. |
| `maxMessageSizeKb` | `10` | number `> 0` | Maximum message size hint. |
| `regionId` | — | existing region node ID | Required regional placement field. |

## Simulation notes

| Item | Value |
|---|---|
| Capacity model | `partitions × 5,000 RPS` |
| Base latency | `5 ms` |
| Stateful metrics | subscriber lag, consumer throughput, unacked messages |
| Best use | decoupling producers and workers or absorbing bursts |

## YAML example

```yaml
- id: orders-topic
  type: pubsub
  label: Orders Topic
  placement:
    region: us-east-1
  spec:
    partitions: 8
    messageRetentionHours: 48
    maxMessageSizeKb: 32
```

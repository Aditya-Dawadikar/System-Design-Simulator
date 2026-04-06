# Rate Limiter

**Scope:** `regional`

Place this component in front of sensitive services to protect them from bursts and abuse.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `rateLimitAlgorithm` | `token_bucket` | `token_bucket`, `leaky_bucket`, `fixed_window`, `sliding_window`, `sliding_log` | Determines burst and queueing behavior. |
| `requestsPerSecond` | `1000` | number `>= 0` | Sustained allowed throughput. |
| `burstCapacity` | `200` | number `>= 0` | Extra headroom used mainly by `token_bucket`. |
| `windowSizeMs` | `1000` | number `> 0` | Window size for window-based modes. |
| `maxQueueSize` | `500` | number `>= 0` | Max queued requests for queueing modes. |
| `regionId` | — | existing region node ID | Required regional placement field. |

## Algorithm behavior

| Algorithm | Burst tolerance | Queues excess traffic |
|---|---|---|
| `token_bucket` | high | yes |
| `leaky_bucket` | low | yes |
| `fixed_window` | medium | no |
| `sliding_window` | medium | no |
| `sliding_log` | strict | no |

## YAML example

```yaml
- id: api-rl
  type: rate_limiter
  label: Public API Limit
  placement:
    region: us-east-1
  spec:
    rateLimitAlgorithm: token_bucket
    requestsPerSecond: 3000
    burstCapacity: 600
    maxQueueSize: 1000
```

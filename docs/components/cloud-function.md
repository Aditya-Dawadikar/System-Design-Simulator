# Cloud Function

**Scope:** `regional`

Use this component for trigger-based serverless compute or short-lived request handling.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `functionMemoryMb` | `256` | number `>= 128` | Memory per invocation; also affects modeled throughput. |
| `maxConcurrency` | `100` | integer `>= 1` | Maximum parallel invocations. |
| `avgExecutionMs` | `200` | number `> 0` | Baseline execution time used by the simulator. |
| `regionId` | — | existing region node ID | Required regional placement field. |

## Simulation notes

| Item | Value |
|---|---|
| Capacity model | `maxConcurrency × (1000 / execMs) × sqrt(memoryMb / 256)` |
| Base latency | `avgExecutionMs` |
| Stateful metrics | cold starts, throttled invocations, concurrency used |
| IO sensitivity | Downstream store latency can inflate effective execution time |

## YAML example

```yaml
- id: image-resizer
  type: cloud_function
  label: Image Resizer
  placement:
    region: us-east-1
  spec:
    functionMemoryMb: 512
    maxConcurrency: 250
    avgExecutionMs: 120
```

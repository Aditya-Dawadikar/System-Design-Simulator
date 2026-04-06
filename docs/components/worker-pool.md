# Worker Pool

**Scope:** `zonal`

This component represents background workers that drain queued jobs from a broker or scheduler.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `workerCount` | `4` | integer `>= 1` | Number of worker processes. |
| `threadCount` | `4` | integer `>= 1` | Threads per worker. |
| `taskDurationMs` | `500` | number `> 0` | Average task processing time per thread. |
| `zoneId` | — | existing zone node ID | Required zonal placement field. |

## Simulation notes

| Item | Value |
|---|---|
| Capacity model | `workerCount × threadCount × (1000 / taskDurationMs)` |
| Base latency | derived from task duration and backlog |
| Stateful metrics | queue depth, worker utilization, backlog ms |
| Best use | async consumers, background processing, ETL workers |

## YAML example

```yaml
- id: workers-a
  type: worker_pool
  label: Email Workers
  placement:
    zone: use1a
  deploy:
    workerCount: 8
    threadCount: 6
    taskDurationMs: 300
```

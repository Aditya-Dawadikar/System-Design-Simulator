# Cron Job

**Scope:** `regional`

This source node emits periodic work for batch, maintenance, and scheduled processing scenarios.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `intervalMinutes` | `5` | number `> 0` | How often the job fires. |
| `tasksPerRun` | `100` | number `>= 0` | Work emitted per execution window. |
| `regionId` | — | existing region node ID | Required regional placement field. |

## Simulation notes

| Item | Value |
|---|---|
| Emitted rate | `tasksPerRun / (intervalMinutes × 60)` |
| Base latency | `0 ms` |
| Detail metrics | overlap count, last run duration |
| Best use | scheduled ETL, maintenance, or back-office automation |

## YAML example

```yaml
- id: nightly-sync
  type: cron_job
  label: Nightly Sync
  placement:
    region: us-east-1
  spec:
    intervalMinutes: 60
    tasksPerRun: 5000
```

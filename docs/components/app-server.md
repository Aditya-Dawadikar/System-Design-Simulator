# App Server

**Scope:** `zonal`

This is the main stateless compute tier for APIs, services, and app workloads pinned to one AZ.

## Core compute properties

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `instances` | `1` | integer `>= 1` | Starting active instance count. |
| `cpuCores` | `4` | integer `>= 1` | Used by the baseline capacity model. |
| `ramGb` | `8` | number `> 0` | Used by the baseline capacity model. |
| `rpsPerInstance` | `500` | number `> 0` | Per-instance RPS used by the tick logic. |
| `avgLatencyMs` | `40` | number `>= 0` | Base service latency before queueing and downstream IO wait. |
| `workloadType` | `io_bound` | `cpu_bound`, `io_bound`, `memory_bound` | Labels the workload profile. |
| `zoneId` | — | existing zone node ID | Required zonal placement field. |

## Autoscaling properties

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `autoscalingEnabled` | `false` | `true` / `false` | Master toggle for the autoscaling FSM. |
| `autoscalingStrategy` | `threshold` | `threshold`, `target_tracking`, `scheduled`, `predictive` | Scaling strategy. |
| `warmPoolEnabled` | `false` | `true` / `false` | Enables pre-provisioned warm instances. |
| `minInstances` | `1` | integer `>= 0` | Minimum desired floor. |
| `maxInstances` | `8` | integer `>= minInstances` | Maximum allowed size. |
| `warmPoolSize` | `1` | integer `>= 0` | Target warm reserve. |
| `scaleUpCpuPct` | `75` | `0–100` | Scale-out trigger (based on load %). |
| `scaleDownCpuPct` | `25` | `0–100` | Scale-in trigger. |
| `scaleUpCooldownTicks` | `4` | integer `>= 0` | Delay between scale-out events. |
| `scaleDownCooldownTicks` | `12` | integer `>= 0` | Delay before scale-in events. |
| `coldProvisionTicks` | `6` | integer `>= 0` | Time needed to bring up a cold instance. |
| `scaleDownDrainTicks` | `4` | integer `>= 0` | Graceful drain period when scaling in. |

## Advanced strategy options

| Property | Default | Notes |
|---|---:|---|
| `targetMetric` | `load` | Used by target tracking: `load`, `cpu`, `rps_per_instance` |
| `targetValue` | `70` | Target % or RPS depending on `targetMetric` |
| `ttScaleOutCooldownTicks` | `4` | Aggressive target-tracking scale-out cooldown |
| `ttScaleInCooldownTicks` | `24` | Conservative target-tracking scale-in cooldown |
| `scheduledActions` | none | Array of scheduled scaling actions |
| `predictiveLookbackTicks` | `20` | History window for predictive mode |
| `predictiveLookaheadTicks` | `10` | How far ahead to forecast |
| `predictiveScalingBuffer` | `20` | Percent buffer above projected demand |

## YAML example

```yaml
- id: api-a
  type: app_server
  label: API Server A
  placement:
    zone: use1a
  deploy:
    instances: 3
    cpuCores: 4
    ramGb: 8
    rpsPerInstance: 600
    autoscaling:
      enabled: true
      strategy: target_tracking
      minInstances: 2
      maxInstances: 10
      targetMetric: load
      targetValue: 70
```

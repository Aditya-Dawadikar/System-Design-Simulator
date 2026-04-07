# IaC YAML Quick Reference

## Top-level shape

```yaml
version: 1
name: checkout-platform
description: Example system

globals:
  peakRps: 4500
  trafficPattern: ramp

regions:
  - id: us-east-1
    label: us-east-1
    zones:
      - id: use1a
        label: us-east-1a

resources:
  - id: edge
    type: cdn
    label: Global CDN
    placement:
      scope: global
    spec:
      pops: 4
      cacheablePct: 70

services:
  - id: api
    type: app_server
    deploy:
      instances: 3
    dependencies:
      - service: orders-db

deployments:
  - service: api
    zones: [use1a, use1b]

connections:
  - from: edge
    to: api-lb
    protocol: REST
    timeoutMs: 3000
```

## Key sections

| Section | Purpose |
|---|---|
| `globals` | simulation defaults such as peak RPS and traffic pattern |
| `regions` | region and zone declarations that create the placement map |
| `resources` | standalone infrastructure/resource nodes rendered directly on the canvas |
| `services` | shared logical service definitions that hold reusable config and dependencies |
| `deployments` | where each service is instantiated across zones or regions |
| `connections` | the edges and edge-level protocol settings |
| `scenarios` | optional failure or test scenarios |

## Service + deployment pattern

Use `services[]` when you want to define a workload once and fan it out into multiple deployed nodes.
The matching `deployments[]` entry decides whether it appears per zone or per region.

## Placement reminder

- use `placement.scope: global` for global resources
- use `placement.region` for regional resources
- use `placement.zone` for zonal resources

## Component lookup

For accepted fields and defaults, open the matching file in `docs/components/`.

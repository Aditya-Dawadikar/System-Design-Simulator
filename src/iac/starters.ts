/**
 * src/iac/starters.ts
 *
 * Starter YAML templates embedded as TypeScript string constants.
 * Importable from client components without a custom webpack loader.
 */

export const THREE_TIER_STARTER = `\
version: 1
name: my-architecture
description: Multi-AZ three-tier web app in us-east-1 — edit and click Apply

globals:
  peakRps: 1500
  trafficPattern: steady

regions:
  - id: us-east-1
    label: us-east-1
    zones:
      - id: use1a
        label: us-east-1a
      - id: use1b
        label: us-east-1b

resources:
  - id: tgen
    type: traffic_generator
    label: Traffic Generator
    spec:
      generatorRps: 2000
      generatorPattern: steady
      readRatioPct: 70

  - id: lb
    type: load_balancer
    label: Load Balancer
    placement:
      region: us-east-1
    spec:
      algorithm: round_robin
      healthChecks: true

  - id: app-a
    type: app_server
    label: App Server AZ-A
    placement:
      zone: use1a
    deploy:
      instances: 8
      cpuCores: 32
      ramGb: 32
      rpsPerInstance: 5000
      workloadType: io_bound
      autoscaling:
        enabled: true
        strategy: target_tracking
        minInstances: 2
        maxInstances: 32
        targetMetric: load
        targetValue: 70

  - id: app-b
    type: app_server
    label: App Server AZ-B
    placement:
      zone: use1b
    deploy:
      instances: 8
      cpuCores: 32
      ramGb: 32
      rpsPerInstance: 5000
      workloadType: io_bound
      autoscaling:
        enabled: true
        strategy: target_tracking
        minInstances: 2
        maxInstances: 32
        targetMetric: load
        targetValue: 70

  - id: redis
    type: cache
    label: Redis Cache
    placement:
      zone: use1a
    spec:
      memoryGb: 8
      ttlSeconds: 60
      evictionPolicy: lru

  - id: db
    type: database
    label: PostgreSQL
    placement:
      zone: use1a
    spec:
      engine: PostgreSQL
      shards: 1
      storageGb: 100
      maxConnections: 200
      dbRole: standalone

connections:
  - from: tgen
    to: lb
    protocol: REST

  - from: lb
    to: app-a
    protocol: REST
    splitPct: 50

  - from: lb
    to: app-b
    protocol: REST
    splitPct: 50

  - from: app-a
    to: redis
    protocol: TCP

  - from: app-a
    to: db
    protocol: TCP

  - from: app-b
    to: redis
    protocol: TCP

  - from: app-b
    to: db
    protocol: TCP
`;

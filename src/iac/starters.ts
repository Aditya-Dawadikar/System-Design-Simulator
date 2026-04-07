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

export const SERVICE_DEPLOYMENT_STARTER = `\
version: 1
name: checkout-service-platform
description: K8s-style example using shared services[] and deployments[] blocks

globals:
  peakRps: 3200
  trafficPattern: ramp

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
    label: Load Generator
    spec:
      generatorRps: 3200
      generatorPattern: ramp
      readRatioPct: 65

  - id: edge-lb
    type: load_balancer
    label: Public API LB
    placement:
      region: us-east-1
    spec:
      algorithm: least_conn
      healthChecks: true

services:
  - id: api
    type: app_server
    label: Checkout API
    deploy:
      instances: 3
      cpuCores: 4
      ramGb: 8
      rpsPerInstance: 650
      workloadType: io_bound
      autoscaling:
        enabled: true
        strategy: target_tracking
        minInstances: 2
        maxInstances: 10
        targetMetric: load
        targetValue: 70
    dependencies:
      - service: session-cache
      - service: orders-db
        readSplitPct: 80
        writeSplitPct: 20

  - id: session-cache
    type: cache
    label: Session Cache
    spec:
      memoryGb: 16
      ttlSeconds: 600
      evictionPolicy: lru

  - id: orders-db
    type: database
    label: Orders DB
    spec:
      engine: PostgreSQL
      storageGb: 250
      shards: 1
      rpsPerShard: 1200

  - id: order-queue
    type: pubsub
    label: Order Queue
    spec:
      partitions: 8
      messageRetentionHours: 24

  - id: order-worker
    type: worker_pool
    label: Order Worker
    deploy:
      workerCount: 6
      threadCount: 4
      taskDurationMs: 250
    dependencies:
      - service: orders-db
        writeSplitPct: 100

deployments:
  - service: api
    zones:
      - use1a
      - use1b

  - service: session-cache
    zones:
      - use1a
      - use1b

  - service: orders-db
    zones:
      - use1a
    replicas:
      - zone: use1b

  - service: order-queue
    regions:
      - us-east-1

  - service: order-worker
    zones:
      - use1a
      - use1b

connections:
  - from: tgen
    to: edge-lb
    protocol: REST

  - from: edge-lb
    to: api-use1a
    protocol: REST
    splitPct: 50

  - from: edge-lb
    to: api-use1b
    protocol: REST
    splitPct: 50

  - from: api-use1a
    to: order-queue-us-east-1
    protocol: gRPC

  - from: api-use1b
    to: order-queue-us-east-1
    protocol: gRPC

  - from: order-queue-us-east-1
    to: order-worker-use1a
    protocol: gRPC
    splitPct: 50

  - from: order-queue-us-east-1
    to: order-worker-use1b
    protocol: gRPC
    splitPct: 50
`;

export const SERVICE_DEPLOYMENT_ACTIVE_ACTIVE_STARTER = `\
version: 1
name: service-deployment-active-active
description: Multi-region active-active example using shared services[] and deployments[] blocks

globals:
  peakRps: 9000
  trafficPattern: ramp

regions:
  - id: us-east-1
    label: us-east-1
    zones:
      - id: use1a
        label: us-east-1a
      - id: use1b
        label: us-east-1b

  - id: us-west-2
    label: us-west-2
    zones:
      - id: usw2a
        label: us-west-2a
      - id: usw2b
        label: us-west-2b

resources:
  - id: tgen
    type: traffic_generator
    label: Global Traffic
    spec:
      generatorRps: 9000
      generatorPattern: ramp
      readRatioPct: 70

  - id: cdn
    type: cdn
    label: Global CDN
    spec:
      pops: 6
      cacheablePct: 55
      bandwidthGbps: 200

  - id: ga
    type: global_accelerator
    label: Global Accelerator
    spec:
      routingPolicy: latency
      failoverEnabled: true

  - id: east-lb
    type: load_balancer
    label: East Regional LB
    placement:
      region: us-east-1
    spec:
      algorithm: least_conn
      healthChecks: true

  - id: west-lb
    type: load_balancer
    label: West Regional LB
    placement:
      region: us-west-2
    spec:
      algorithm: least_conn
      healthChecks: true

services:
  - id: edge-api
    type: api_gateway
    label: Regional API Gateway
    spec:
      gatewayAuthEnabled: true
      gatewayAuthOverheadMs: 4
      gatewayCacheEnabled: true
      gatewayCacheHitPct: 20

  - id: checkout-api
    type: app_server
    label: Checkout API
    deploy:
      instances: 3
      cpuCores: 4
      ramGb: 8
      rpsPerInstance: 700
      workloadType: io_bound
      autoscaling:
        enabled: true
        strategy: target_tracking
        minInstances: 2
        maxInstances: 12
        targetMetric: load
        targetValue: 70
    dependencies:
      - service: session-cache
      - service: orders-db
        readSplitPct: 80
        writeSplitPct: 20

  - id: session-cache
    type: cache
    label: Session Cache
    spec:
      memoryGb: 12
      ttlSeconds: 180
      evictionPolicy: lru

  - id: orders-db
    type: database
    label: Orders DB
    spec:
      engine: PostgreSQL
      storageGb: 300
      shards: 2
      rpsPerShard: 1200

  - id: order-queue
    type: pubsub
    label: Order Queue
    spec:
      partitions: 12
      messageRetentionHours: 48

  - id: order-worker
    type: worker_pool
    label: Order Worker
    deploy:
      workerCount: 8
      threadCount: 4
      taskDurationMs: 220
    dependencies:
      - service: orders-db
        writeSplitPct: 100

deployments:
  - service: edge-api
    regions:
      - us-east-1
      - us-west-2

  - service: checkout-api
    zones:
      - use1a
      - use1b
      - usw2a
      - usw2b

  - service: session-cache
    zones:
      - use1a
      - use1b
      - usw2a
      - usw2b

  - service: orders-db
    zones:
      - use1a
    replicas:
      - zone: use1b
      - zone: usw2a
      - zone: usw2b

  - service: order-queue
    regions:
      - us-east-1
      - us-west-2

  - service: order-worker
    zones:
      - use1a
      - use1b
      - usw2a
      - usw2b

connections:
  - from: tgen
    to: cdn
    protocol: REST

  - from: cdn
    to: ga
    protocol: REST

  - from: ga
    to: east-lb
    protocol: REST
    splitPct: 50

  - from: ga
    to: west-lb
    protocol: REST
    splitPct: 50

  - from: east-lb
    to: edge-api-us-east-1
    protocol: REST

  - from: west-lb
    to: edge-api-us-west-2
    protocol: REST

  - from: edge-api-us-east-1
    to: checkout-api-use1a
    protocol: REST
    splitPct: 50

  - from: edge-api-us-east-1
    to: checkout-api-use1b
    protocol: REST
    splitPct: 50

  - from: edge-api-us-west-2
    to: checkout-api-usw2a
    protocol: REST
    splitPct: 50

  - from: edge-api-us-west-2
    to: checkout-api-usw2b
    protocol: REST
    splitPct: 50

  - from: checkout-api-use1a
    to: order-queue-us-east-1
    protocol: gRPC

  - from: checkout-api-use1b
    to: order-queue-us-east-1
    protocol: gRPC

  - from: checkout-api-usw2a
    to: order-queue-us-west-2
    protocol: gRPC

  - from: checkout-api-usw2b
    to: order-queue-us-west-2
    protocol: gRPC

  - from: order-queue-us-east-1
    to: order-worker-use1a
    protocol: gRPC
    splitPct: 50

  - from: order-queue-us-east-1
    to: order-worker-use1b
    protocol: gRPC
    splitPct: 50

  - from: order-queue-us-west-2
    to: order-worker-usw2a
    protocol: gRPC
    splitPct: 50

  - from: order-queue-us-west-2
    to: order-worker-usw2b
    protocol: gRPC
    splitPct: 50
`;

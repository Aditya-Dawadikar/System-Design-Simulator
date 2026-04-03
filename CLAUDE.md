# System Design Simulator — CLAUDE.md

Project-specific instructions for Claude Code. Read this before making any changes.

---

## Stack

| Package | Version |
|---------|---------|
| Next.js | ^16.2.1 |
| React | ^19.2.4 |
| reactflow | ^11.11.4 |
| zustand | ^5.0.12 |
| recharts | ^3.8.0 |
| lucide-react | ^1.0.1 |
| Tailwind CSS | ^4.2.2 |
| TypeScript | ^5.9.3 |

**No Vite** — this is a Next.js project. Dev server: `npm run dev`.

---

## Critical conventions

### Imports & exports
- All interactive components must have `'use client'` at the top
- All components use **default exports** (no named exports for components)
- Path alias `@/` maps to `src/`

### CSS / Tailwind
- `globals.css` must have the Google Fonts `@import` **before** `@tailwindcss/…` — order matters
- Design language: dark terminal/datacenter aesthetic
- CSS variables: `--bg-base`, `--bg-panel`, `--border`, `--text`, `--text-dim`, `--accent-green`, `--accent-cyan`, `--accent-purple`, `--accent-orange`, `--accent-red`, `--accent-yellow`

### React Flow
- All node types must be registered in `Canvas.tsx`
- Custom edge type is `'wire'` (see `EdgeWire.tsx`)
- Node `type` field equals the `ComponentType` string (e.g. `'app_server'`)
- Region/zone container nodes have `zIndex: -2 / -1` set in `Canvas.tsx` via `nodesWithSelection`; resource nodes default to `zIndex: 0`
- Region/zone nodes have `connectable: false` set in `Canvas.tsx`

---

## Source layout

```
src/
├── app/
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Root page — mounts Canvas + dashboard
├── components/
│   ├── canvas/
│   │   ├── Canvas.tsx              # React Flow canvas, registers all node types
│   │   ├── EdgeWire.tsx            # Custom 'wire' edge
│   │   └── nodes/                  # One file per ComponentType
│   ├── inspector/
│   │   ├── Inspector.tsx           # Right-panel config inspector; scope-aware NodeLocationField
│   │   ├── EdgeInspector.tsx       # Edge config fields
│   │   └── fields/                 # Per-type config field components (+ RegionFields, AvailabilityZoneFields)
│   ├── shared/                     # ArcGauge, Sparkline, StatCell, Badge, NodeLocationBadge, etc.
│   └── simulation/
│       ├── MetricsDashboard.tsx    # Bottom panel: global stats + node cards
│       ├── NodeMetricCard.tsx      # Per-node metric card with detail row
│       ├── SimulationControls.tsx  # Run/Stop/Reset buttons
│       ├── EventLog.tsx            # Real-time event log with auto-scroll
│       └── ScenarioDocsDrawer.tsx  # Scenario documentation drawer
├── constants/
│   └── components.ts               # COMPONENT_DEFINITIONS (with scope), capacity constants
├── simulation/
│   └── SimulationEngine.ts         # Pure TS tick engine (no React)
├── store/
│   ├── architectureStore.ts        # Zustand — canvas state, persisted to localStorage
│   └── simulationStore.ts          # Zustand — ephemeral simulation state + tick loop
├── templates/
│   ├── defaultTemplate.ts          # Pre-built starter architecture
│   ├── architectures.ts            # Architecture library (11 templates)
│   └── scenarios.ts                # Scenario definitions
└── types/
    └── index.ts                    # All shared TypeScript types
```

---

## Two Zustand stores

| Store | Persistence | Responsibility |
|-------|-------------|----------------|
| `architectureStore` | localStorage | nodes, edges, nodeConfigs, edgeConfigs |
| `simulationStore` | ephemeral | running/tick/metrics/events/history; 500 ms tick loop |

---

## Component types & scope

Every component has a **scope** (`ComponentScope = 'global' | 'regional' | 'zonal'`) following AWS conventions:

- **Global** — spans all regions; inspector shows no placement picker
- **Regional** — lives in one region, spans AZs; inspector shows Region dropdown (`regionId`)
- **Zonal** — pinned to a single AZ; fails with that AZ; inspector shows AZ dropdown (`zoneId`)

| Type | Label | Icon | Color | Scope | Description |
|------|-------|------|-------|-------|-------------|
| `cdn` | CDN Edge | ◎ | `#00ddff` | global | Content delivery network |
| `traffic_generator` | Traffic Generator | ↯ | `#f43f5e` | global | Injects configurable RPS |
| `comment` | Comment | // | `#f59e0b` | global | Annotation — no simulation effect |
| `global_accelerator` | Global Accelerator | ⊙ | `#818cf8` | global | Anycast routing across regions with health-aware failover |
| `load_balancer` | Load Balancer | ⇌ | `#ff55bb` | regional | Distributes traffic across AZs (ALB/NLB) |
| `api_gateway` | API Gateway | ⊞ | `#3b82f6` | regional | Routes traffic to microservices by path/weight |
| `cloud_storage` | Cloud Storage | ◫ | `#38bdf8` | regional | Object storage replicated across AZs (S3) |
| `pubsub` | Pub/Sub | ⊕ | `#fb923c` | regional | Async message bus across AZs (SQS/Kinesis) |
| `cloud_function` | Cloud Function | ƒ | `#a78bfa` | regional | Serverless compute (Lambda) |
| `rate_limiter` | Rate Limiter | ⊘ | `#c026d3` | regional | Throttles traffic across AZs |
| `service_mesh` | Service Mesh | ⊛ | `#22d3ee` | regional | Sidecar proxy — mTLS, retries, circuit breaking |
| `cron_job` | Cron Job | ◷ | `#34d399` | regional | Schedule-driven task emitter (EventBridge) |
| `nat_gateway` | NAT Gateway | ⇢ | `#f97316` | regional | Private subnet egress with address translation |
| `firewall` | Firewall | ⊟ | `#ef4444` | regional | Stateful packet inspection and traffic filtering |
| `app_server` | App Server | ◈ | `#00ff88` | zonal | Compute instance in one AZ (EC2/ECS) |
| `cache` | Redis Cache | ⚡ | `#ff8833` | zonal | In-memory cache node in one AZ (ElastiCache) |
| `database` | PostgreSQL | ▣ | `#bb66ff` | zonal | Primary or replica DB in one AZ (RDS/Aurora) |
| `block_storage` | Block Storage | ▤ | `#d97706` | zonal | Block volume in one AZ (EBS) |
| `network_storage` | Network Storage | ⊜ | `#6366f1` | zonal | NFS/SMB mount target in one AZ (EFS) |
| `worker_pool` | Worker Pool | ⚙ | `#facc15` | zonal | EC2-backed worker fleet in one AZ |
| `region` | Region | ⬡ | `#c084fc` | global | Visual container grouping AZs (e.g. us-east-1) |
| `availability_zone` | Availability Zone | ◎ | `#67e8f9` | global | Isolated failure domain within a region |
| `public_subnet` | Public Subnet | ⬤ | `#4ade80` | global | Visual container — internet-facing subnet |
| `private_subnet` | Private Subnet | ◯ | `#94a3b8` | global | Visual container — internal subnet via NAT |

---

## NodeConfig fields (`src/types/index.ts`)

All fields are optional. Flat bag shared across all component types.

```ts
// Shared
label?: string

// Region / AZ placement
zoneId?: string            // node ID of the AZ this resource belongs to
regionId?: string          // node ID of the region (used for regional components)

// Region container
regionName?: string        // e.g. 'us-east-1'
regionFailed?: boolean     // force-fail the entire region
containerWidth?: number    // default 900
containerHeight?: number   // default 560

// Availability Zone container
zoneName?: string          // e.g. 'us-east-1a'
zoneFailed?: boolean       // if true, all nodes with zoneId pointing here are force-failed
// containerWidth / containerHeight also apply (default 380 / 440)

// CDN
pops?: number              // default 2
cacheablePct?: number      // default 60
bandwidthGbps?: number     // default 100

// Load Balancer
algorithm?: 'round_robin' | 'least_conn' | 'ip_hash' | 'random' | 'weighted'
healthChecks?: boolean     // default true
maxConnections?: number    // default 100000

// API Gateway
gatewayRoutes?: Array<{ id: string; path?: string; destNodeId: string; weightPct: number }>
gatewayAuthEnabled?: boolean      // default false — adds auth overhead to latency
gatewayAuthOverheadMs?: number    // default 5 ms
gatewayCacheEnabled?: boolean     // default false — gateway-level response caching
gatewayCacheHitPct?: number       // 0–100, default 30 (read requests only)

// App Server
instances?: number         // default 1
cpuCores?: number          // default 4
ramGb?: number             // default 8
rpsPerInstance?: number    // default 500 (overrides workload-based nominal in tick)
avgLatencyMs?: number      // default 40
workloadType?: 'cpu_bound' | 'io_bound' | 'memory_bound'  // default 'io_bound'

// App Server — Autoscaling
autoscalingEnabled?: boolean         // master toggle (default false)
autoscalingStrategy?: 'threshold' | 'target_tracking' | 'scheduled' | 'predictive'  // default 'threshold'
warmPoolEnabled?: boolean            // warm replica toggle (default false)
minInstances?: number                // floor — always running
maxInstances?: number                // ceiling — never exceed
warmPoolSize?: number                // pre-provisioned instances (instant scale)
scaleUpCpuPct?: number              // threshold/scheduled/predictive: load% trigger scale-out (default 75)
scaleDownCpuPct?: number            // threshold/scheduled/predictive: load% trigger scale-in (default 25)
scaleUpCooldownTicks?: number       // ticks between scale-up events (default 4 = 2 s)
scaleDownCooldownTicks?: number     // ticks before scale-in fires (default 12 = 6 s)
coldProvisionTicks?: number         // ticks to provision cold instance (default 6 = 3 s)

// App Server — Target Tracking autoscaling
targetMetric?: 'load' | 'cpu' | 'rps_per_instance'  // default 'load'
targetValue?: number                 // target % (load/cpu) or RPS (rps_per_instance); default 70
ttScaleOutCooldownTicks?: number     // default 4 (2 s) — aggressive
ttScaleInCooldownTicks?: number      // default 24 (12 s) — conservative

// App Server — Scheduled autoscaling
scheduledActions?: ScheduledScalingAction[]
// ScheduledScalingAction: { id, atTick, intervalTicks?, desiredInstances?, minInstances?, maxInstances? }
// Actions fire at atTick; repeat every intervalTicks if set; bypass all cooldowns

// App Server — Predictive autoscaling
predictiveLookbackTicks?: number    // history window for trend (default 20)
predictiveLookaheadTicks?: number   // pre-provision horizon (default 10; should be ≥ coldProvisionTicks)
predictiveScalingBuffer?: number    // % above projected need (default 20)

// Cache
memoryGb?: number          // default 8
ttlSeconds?: number        // default 60
evictionPolicy?: 'lru' | 'lfu' | 'noeviction'
clusterMode?: boolean

// Database
engine?: 'PostgreSQL' | 'MySQL' | 'MongoDB' | 'Redis' | 'Cassandra'
instanceType?: string      // e.g. 'db.m5.large'
storageGb?: number         // default 100
readReplicas?: number      // default 0 — virtual replicas for standalone role only
shards?: number            // default 1
rpsPerShard?: number       // default 800
maxConnections?: number    // default 200
dbRole?: 'standalone' | 'primary' | 'replica'  // default 'standalone'
primaryNodeId?: string     // replica only: node ID of the primary in this replication group

// Cloud Storage
storageThroughputMbps?: number   // default 1000
objectSizeKb?: number            // default 512
storageClass?: 'standard' | 'nearline' | 'coldline' | 'archive'
storageGb?: number

// Block Storage
diskType?: 'nvme' | 'ssd' | 'hdd'
iops?: number              // IOPS limit (default 3000)
objectSizeKb?: number      // IO size (default 64)

// Network Storage
nfsProtocol?: 'nfs' | 'smb' | 'cephfs'
storageThroughputMbps?: number   // default 500
connectionLimit?: number         // max simultaneous mounts (default 100)
objectSizeKb?: number            // IO size (default 64)

// Pub/Sub
partitions?: number        // default 4
messageRetentionHours?: number   // default 24
maxMessageSizeKb?: number  // default 10

// Cloud Function
functionMemoryMb?: number  // default 256
maxConcurrency?: number    // default 100
avgExecutionMs?: number    // default 200

// Cron Job
intervalMinutes?: number   // default 5
tasksPerRun?: number       // default 100

// Worker Pool
workerCount?: number       // default 4
threadCount?: number       // default 4
taskDurationMs?: number    // default 500

// Traffic Generator
generatorRps?: number      // default 1000
generatorPattern?: TrafficPattern   // default 'steady'
readRatioPct?: number      // 0–100, default 50
badTrafficPct?: number     // 0–100, default 0 — malicious traffic fraction for firewall

// Rate Limiter
rateLimitAlgorithm?: 'token_bucket' | 'leaky_bucket' | 'fixed_window' | 'sliding_window' | 'sliding_log'
requestsPerSecond?: number    // allowed RPS (default 1000)
burstCapacity?: number        // extra burst requests (default 200; token_bucket only)
windowSizeMs?: number         // window size for window-based algorithms (default 1000)
maxQueueSize?: number         // max requests in queue before dropping (default 500)

// Service Mesh
mtlsEnabled?: boolean                 // default true
observabilityLevel?: 'none' | 'basic' | 'full'   // default 'basic'
proxyOverheadMs?: number              // sidecar latency per hop (default 2)
meshRetryCount?: number               // automatic retries on failure (default 1)
meshCircuitBreakerEnabled?: boolean   // default false
meshCircuitBreakerThreshold?: number  // error% to open circuit (default 50)
meshRoutes?: Array<{
  id: string
  sourceNodeId: string    // upstream node ID (UI display; engine deduplicates by destNodeId)
  destNodeId: string      // downstream node ID
  weightPct: number       // relative weight (normalized to 100% at tick time)
}>

// Global Accelerator
routingPolicy?: 'latency' | 'geo' | 'weighted'
failoverEnabled?: boolean

// NAT Gateway
natBandwidthGbps?: number    // default 10
// maxConnections also applies (default 55000)

// Firewall
firewallRules?: number                           // default 10
firewallInspectionMode?: 'basic' | 'deep'        // default 'basic'
firewallBlockRatePct?: number                    // 0–100, default 0

// Public / Private Subnet (containers)
subnetCidr?: string   // e.g. '10.0.1.0/24' — display only

// Comment
commentBody?: string
```

---

## EdgeConfig fields

```ts
protocol: 'REST' | 'gRPC' | 'TCP' | 'WebSocket'   // default 'REST'
timeoutMs: number                                   // default 5000
retryCount: number                                  // default 2
circuitBreaker: boolean                             // default false
circuitBreakerThreshold: number                     // default 50
bandwidthMbps: number                               // default 0 (unlimited)
splitPct?: number                                   // 0–100; undefined = auto equal-split
readSplitPct?: number                               // 0–100; read-traffic override for this edge
writeSplitPct?: number                              // 0–100; write-traffic override for this edge
```

`readSplitPct` and `writeSplitPct` allow separate routing splits for read vs write traffic, enabling primary/replica topologies to be modeled at the edge level.

---

## NodeMetrics & ComponentDetail (`src/types/index.ts`)

### NodeMetrics

```ts
interface NodeMetrics {
  rpsIn: number
  rpsOut: number
  load: number               // 0–1+ (>1 = overloaded)
  latencyMs: number          // mean latency
  p99LatencyMs: number       // = latencyMs × 2.5
  errorRate: number          // 0–1
  failed: boolean            // load > 1.05
  readRatio: number          // fraction 0–1 propagated from traffic_generator
  readRpsIn: number          // rpsIn × readRatio
  writeRpsIn: number         // rpsIn × (1 − readRatio)
  badRatio: number           // fraction of malicious traffic (from traffic_generator)
  badRpsIn: number           // rpsIn × badRatio
  readLoad?: number          // database only
  writeLoad?: number         // database only
  detail?: ComponentDetail
}
```

### ComponentDetail (discriminated union by `kind`)

| `kind` | Fields |
|--------|--------|
| `cdn` | `cacheHitRate`, `originBypassRps`, `bandwidthGbps` |
| `load_balancer` | `activeConnections`, `scalingEvent: boolean`, `connectionsPerSecond`, `failedTargets`, `availableZones`, `totalZones`, `noZonesAvailable` |
| `api_gateway` | `activeRoutes`, `routedRps`, `throttledRps`, `cacheHitRate` |
| `app_server` | `cpuPct`, `memPct`, `activeInstances`, `pendingInstances`, `pendingCountdown`, `warmReserve`, `scalingEvent: 'up-warm'\|'up-cold'\|'down'\|null`, `scaleUpCooldown`, `scaleDownCooldown`, `projectedRps?` (predictive only), `desiredInstances?` (target_tracking + predictive) |
| `cache` | `hitRate`, `evictionRate`, `memoryUsedPct` |
| `database` | `connectionPoolUsed`, `connectionPoolMax`, `queryQueueDepth`, `slowQueryRate`, `replicationLagMs`, `writeRejectedRps?`, `writeRoutingLatency?` |
| `cloud_storage` | `throttledRequests`, `bandwidthUtilization` |
| `block_storage` | `iopsUsed`, `iopsLimit`, `queueDepth`, `throughputMbps` |
| `network_storage` | `activeConnections`, `bandwidthUsedMbps`, `throughputLimitMbps` |
| `pubsub` | `subscriberLagMs` (stateful), `consumerThroughput`, `unackedMessages` |
| `cloud_function` | `coldStarts` (stateful), `throttledInvocations`, `concurrencyUsed` |
| `cron_job` | `overlapCount`, `lastRunDurationMs` |
| `worker_pool` | `queueDepth` (stateful), `workerUtilization`, `taskBacklogMs` |
| `rate_limiter` | `allowedRps`, `throttledRps`, `throttleRate`, `queueDepth` (stateful for queuing algos) |
| `service_mesh` | `activeConnections`, `mtlsHandshakeRate`, `circuitBroken`, `retryRate` |
| `global_accelerator` | `activeRegions`, `failedRegions`, `reroutedRps` |
| `nat_gateway` | `translatedConnections`, `bandwidthUtilizationPct`, `droppedPackets` |
| `firewall` | `allowedRps`, `blockedRps`, `autoDetectedRps`, `manualBlockedRps`, `detectionEfficiency` |

---

## SimulationEngine contract (`src/simulation/SimulationEngine.ts`)

Pure TypeScript — no React imports.

```ts
export function runSimulationTick(
  topology: Topology,            // { nodes, edges, nodeConfigs, edgeConfigs }
  incomingRps: number,           // global RPS × traffic pattern multiplier
  tick = 0,
  previousMetrics: Record<string, NodeMetrics> = {},   // required for stateful components
  nodeHistory: Record<string, number[]> = {}            // rpsIn history per node; required for predictive autoscaling
): { nodeMetrics: Record<string, NodeMetrics>; edgeMetrics: Record<string, EdgeMetrics> }
```

### Processing order

1. `buildAdjacency` — downstream/upstream maps + cycle detection via DFS (WHITE/GRAY/BLACK coloring)
2. `topoSort` — Kahn's BFS; returns nodes in processing order and source node set
3. **Resolve service mesh routing tables** → `resolvedEdgeConfigs` (overrides `splitPct` on matched edges; deduplicates by max weight per `destNodeId`)
4. **Resolve API gateway routing tables** → same `resolvedEdgeConfigs` (deduplicates by `destNodeId`; all four unique dest IDs are effective when routing to per-AZ replicas)
5. **Pre-compute effectively failed regions** — region is failed if `regionFailed=true` OR every AZ in it has `zoneFailed=true`
6. **Health-aware redistribution** — LB: equal split among healthy targets; GA: zone-count-weighted split
7. BFS traversal in topological order computing per-node metrics
8. Build `nodeZoneIdMap` / `nodeRegionIdMap` from nodeConfigs for cross-zone/region latency
9. Edge metrics pass: `rps = sourceMetric.rpsOut`, cross-AZ +2 ms, cross-region +75 ms, `isBottleneck = load > 0.9`

### RPS sourcing rules

- `traffic_generator` — uses own `generatorRps × pattern multiplier`
- `cron_job` — `tasksPerRun / (intervalMinutes × 60)` fixed rate; ignores global RPS
- Other nodes with no upstream — receive `incomingRps`
- All other nodes — sum upstream contributions weighted by `splitPct` / `readSplitPct` / `writeSplitPct`

### Zone / region failure injection

Before the `switch (type)` for each node (except `region`, `availability_zone`, `comment`):
- If the node's `zoneId` → zone has `zoneFailed === true`, metrics forced to `{ rpsOut: 0, load: 2, errorRate: 1, failed: true }`
- If the node's `regionId` (or its zone's `regionId`) is in the effectively-failed-regions set, same force-fail

### load / failed / errorRate pattern

```ts
let load = rpsIn / capacity          // overridden per-type in switch
let failed = load > 1.05
let errorRate = 0                    // at load < 0.9
                                     // linear ramp 0→1 at load 0.9→1.2
```

`load`, `failed`, `errorRate` are `let` so per-type cases can reassign them.

### Latency

```ts
baseLatency = computeBaseLatency(type, config)
queueingFactor = Math.pow(Math.min(load, 2.0), 2) * 200
latencyMs = baseLatency + queueingFactor
// per-type cases may add: ioWaitMs, pool-exhaustion penalty, cold-start penalty
p99LatencyMs = latencyMs * 2.5      // always computed at end
```

### Downstream IO wait (`computeDownstreamIoWaitMs`)

Applied to `app_server`, `cloud_function`, `worker_pool`. Reads previous-tick latency of downstream stores (`database`, `cache`, `block_storage`, `network_storage`, `cloud_storage`). Each store contributes `prevLatencyMs × ioFraction` where `ioFraction = 0.2` for cache, `0.5` for all others. Models Little's Law back-pressure.

---

## Capacity formulas

| Type | Formula |
|------|---------|
| CDN | `pops × 25000` (`RPS_PER_POP`) |
| Load Balancer | `50000` fixed (`LB_RPS_MAX`) |
| API Gateway | `50000` fixed |
| App Server | `instances × min(cpuCores, ramGb×0.5) × 300` (used by `computeCapacity`; tick uses `rpsPerInstance` override if set) |
| Cache | `100000` fixed (`CACHE_RPS_MAX`) |
| Database (standalone) | `shards × rpsPerShard + readReplicas × rpsPerShard` |
| Database (primary) | `shards × rpsPerShard` (actual replicas are separate nodes) |
| Database (replica) | `shards × rpsPerShard` (read-only capacity) |
| Cloud Storage | `(throughputMbps × 1000/8) / objectSizeKb` ops/sec |
| Block Storage | `iops` |
| Network Storage | `(throughputMbps × 1000/8) / ioSizeKb` ops/sec |
| Pub/Sub | `partitions × 5000` |
| Cloud Function | `maxConcurrency × (1000/execMs) × sqrt(memMb/256)` |
| Cron Job | `∞` (pure emitter) |
| Worker Pool | `workerCount × threadCount × (1000/taskDurationMs)` |
| Traffic Generator | `∞` (pure source) |
| Rate Limiter | `requestsPerSecond` (placeholder; load overridden in tick) |
| Service Mesh | `∞` (pass-through; load derived from proxy overhead fraction) |
| Global Accelerator | `500000` |
| NAT Gateway | `natBandwidthGbps × 5000` |
| Firewall | `firewallRules × (inspectionMode === 'deep' ? 500 : 1000)` |
| Region / AZ / Subnets | `∞` (structural containers) |

### Base latencies (ms)

| Type | Base | Config override |
|------|------|----------------|
| CDN | 5 | — |
| Load Balancer | 2 | — |
| API Gateway | 5 | `gatewayAuthOverheadMs` added on top when auth enabled |
| App Server | 40 | `avgLatencyMs` |
| Cache | 1 | — |
| Database | 10 | — |
| Cloud Storage | 20 | `storageClass`: standard=20, nearline=50, coldline=100, archive=500 |
| Block Storage | 1 | `diskType`: nvme=0.2, ssd=1, hdd=5 |
| Network Storage | 5 | `nfsProtocol`: nfs=5, smb=8, cephfs=3 |
| Pub/Sub | 5 | — |
| Cloud Function | 200 | `avgExecutionMs` |
| Worker Pool | 0 | `taskDurationMs` |
| Cron Job | 0 | — |
| Traffic Generator | 0 | — |
| Rate Limiter | 1 | — |
| Service Mesh | 2 | `proxyOverheadMs` |
| Global Accelerator | 5 | — |
| NAT Gateway | 3 | — |
| Firewall | 2 | `inspectionMode`: basic=2, deep=10 |
| Region / AZ / Subnets | 0 | — |

---

## Per-component tick behavior

### CDN
Cache hit rate = `(cacheablePct/100) × max(0.4, 1 − degradation)` where degradation rises above 80% load. Reads absorbed by hit rate; writes pass through. `rpsOut = non-hit reads + writes − drops`.

### Load Balancer
Passes traffic minus drop rate. `activeConnections ≈ rpsIn × 0.05`, capped at `maxConnections`. Sets `scalingEvent = true` when `load > 0.75`. Health-check redistribution (pre-BFS step 6) routes away from failed downstream nodes; `failedTargets` and `noZonesAvailable` tracked in detail.

### API Gateway
`cacheHitRate = gatewayCacheHitPct/100` (reads only, when `gatewayCacheEnabled`). `readRpsOut = readRpsIn × (1 − cacheHitRate) × (1 − dropRate)`. `writeRpsOut = writeRpsIn × (1 − dropRate)`. Auth overhead added to `latencyMs` when `gatewayAuthEnabled`. `gatewayRoutes` resolved in pre-BFS step 4.

### App Server (static, `autoscalingEnabled = false`)
`effectiveCap = instances × perInstRps × ioScale`. IO wait from downstream stores added to latency.

### App Server Autoscaling — Four Strategies

All strategies share the same state fields threaded through `prevD` each tick: `activeInstances`, `pendingInstances`, `pendingCountdown`, `warmReserve`, `scaleUpCooldown`, `scaleDownCooldown`.

**Common FSM steps (all strategies):**
1. Promote pending: decrement `pendingCountdown`; when 0, move pending to active (clamped to maxInst)
2. Decrement cooldowns
3. Compute `effectiveCap = activeInstances × perInstRps`, `dynamicLoad`, `cpuPct/memPct`

**`threshold`** (default): Scale out when `loadPct > scaleUpCpuPct`; scale in when `loadPct < scaleDownCpuPct`. One instance at a time via `provisionDelta(1)`.

**`target_tracking`**: Compute `desiredInstances` from `targetMetric` and `targetValue` each tick. Scale out by `desiredInstances − totalProvisioned` in one shot via `provisionDelta(delta)`. Scale in directly to `desiredInstances`. Uses `ttScaleOutCooldownTicks` (default 4, short) and `ttScaleInCooldownTicks` (default 24, long).

**`scheduled`**: Fire matching `scheduledActions` at `atTick` (or every `intervalTicks`). Scheduled fires bypass cooldowns and set `activeInstances` instantly. Threshold fallback (`scaleUpCpuPct`/`scaleDownCpuPct`) runs as safety net between scheduled actions.

**`predictive`**: Use `linRegSlope` over last `predictiveLookbackTicks` values from `nodeHistory` to project `rpsIn` forward by `predictiveLookaheadTicks`. Scale out proactively to `ceil(projectedRps × (1 + buffer) / perInstRps)` via `provisionDelta`. Scale in is always reactive (threshold-based) to avoid thrashing. Activates after `ceil(lookback/2)` history points accumulate.

**`provisionDelta(delta)` helper** (shared by all strategies): Consumes warm pool first; remaining delta cold-provisions. Sets `scaleUpCooldown = scaleUpCDConf`.

**Scale trigger uses `loadPct` (not `cpuPct`)** so IO-bound and memory-bound workloads scale correctly.

### Cache
Hit rate scales with `memoryGb` (up to 85%). Under load, eviction rate rises above 80% memory used, degrading hit rate. Reads absorbed by hit rate; writes pass through.

### Database — Single-Leader Replication

Three roles set via `dbRole`:

**`standalone`** (default, backward-compatible): Existing behavior. `readCapacity = (shards + readReplicas) × rpsPerShard`. Separate read/write loads; `load = max(readLoad, writeLoad)`. Virtual `readReplicas` count boosts read capacity.

**`primary`**: No virtual readReplicas (actual replicas are separate nodes). `capacity = shards × rpsPerShard`. Serves both reads and writes. Same load/pool/queue calculation as standalone without the readReplicas bonus.

**`replica`** with `primaryNodeId` set: Internally routes writes to primary with cross-zone (+2 ms) or cross-region (+75 ms) latency overhead. Reads served locally. If primary is failed, writes are rejected (`writeRejectedRps = writeRpsIn`, `errorRate = writeRpsIn / rpsIn`). Replication lag = `max(0, (primaryWriteLoad - 0.3) / 0.7 × 500)` ms — grows from 0 at 30% primary write load to 500 ms at 100%. Stale-read overhead adds `replicationLagMs × 0.05` to latency.

**`replica`** without `primaryNodeId`: Read-only. Any write traffic is rejected and raises `errorRate`. No internal routing.

### Cloud Storage
~10% of RPS emitted downstream as event notifications. `throttledRequests = max(0, rpsIn - capacity)`. Bandwidth utilization tracked.

### Block Storage
**Stateful** `queueDepth` accumulates at `(rpsIn - iopsLimit) × 0.5` per tick. Queue depth adds up to 1000 ms latency.

### Network Storage
Bandwidth-limited. `activeConnections ≈ ceil(rpsIn / 10)`, capped at `connectionLimit`. Connection saturation (≥90% of limit) adds 50 ms × utilization to latency.

### Pub/Sub
**Stateful** `subscriberLagMs` accumulates at `((rpsIn - capacity) / capacity) × 500` ms per tick. `unackedMessages ≈ subscriberLagMs × capacity / 1000`.

### Cloud Function
IO wait inflates `effectiveExecMs`. Capacity recalculated with inflated exec time. **Stateful** `coldStarts ≈ max(0, concurrencyUsed - prevConcurrencyUsed) × 0.8`. Cold starts add up to 400 ms. Throttled invocations when demand exceeds `maxConcurrency`.

### Cron Job
`rpsIn = tasksPerRun / (intervalMinutes × 60)`. `rpsOut = rpsIn`. `overlapCount > 0` when `lastRunDurationMs > intervalMs`.

### Worker Pool
**Stateful** `queueDepth` accumulates at `(rpsIn - effectiveCap) × 0.5` per tick. IO wait inflates `effectiveTaskMs`. `taskBacklogMs = queueDepth / effectiveCap × 1000`. Backlog adds up to 5000 ms latency.

### Rate Limiter
Five algorithms with different burst/queue behaviors:

| Algorithm | Instant cap | Queuing |
|-----------|-------------|---------|
| `token_bucket` | `rpsLimit + burstCapacity` | Yes — excess queued up to `maxQueueSize` |
| `leaky_bucket` | `rpsLimit` | Yes — excess queued up to `maxQueueSize` |
| `fixed_window` | `rpsLimit × 1.5` | No — excess immediately dropped (429) |
| `sliding_window` | `rpsLimit × 1.2` | No — excess immediately dropped (429) |
| `sliding_log` | `rpsLimit` | No — excess immediately dropped; +2 ms bookkeeping |

`rpsOut` always hard-capped at `requestsPerSecond`. **Stateful** queue for `token_bucket` and `leaky_bucket`.

### Service Mesh
Pass-through proxy. Latency = `proxyOverheadMs × 2` + observability overhead + mTLS (~1 ms). Circuit breaker watches **downstream** error rate (not mesh's own load). When tripped: `rpsOut = rpsIn × 0.05`, `errorRate = 0.95`, `failed = false` (mesh is healthy, acting correctly). Retries amplify downstream RPS; `errorRate = pow(downstreamErrorRate, retries + 1)`.

### Firewall
`detectionEfficiency = min(1, rules × (deep ? 0.05 : 0.04))`. Auto-blocks `badRatio × detectionEfficiency` of traffic; manual block rate adds to total. `badRatioOut = 0` (bad traffic scrubbed from `badRatio`).

### Global Accelerator
Health-aware proportional routing (pre-BFS step 6). Each downstream region weighted by its active zone count. Failed regions get weight 0. `reroutedRps` tracks traffic shifted away from failed endpoints.

### NAT Gateway
Connection tracking: `translatedConnections ≈ rpsIn × 0.1`, capped at `maxConnections`. Bandwidth utilization = `rpsIn / (natBwGbps × 5000)`. Dropped packets when over capacity.

### Region / Availability Zone / Subnets
Structural container nodes — transparent pass-through (`load=0`, `failed=false`, `rpsOut=rpsIn`). Zone/region failures applied before processing each resource node.

---

## Traffic patterns

Defined identically in `SimulationEngine.ts` and `simulationStore.ts` (kept in sync manually).

| Pattern | Multiplier | Behavior |
|---------|-----------|----------|
| `steady` | `1.0` | Constant baseline |
| `ramp` | `min(1 + (tick/60)×0.6, 1.6)` | Grows 60% over ~60 ticks (30 s) then holds |
| `spike` | `3.5` for ticks 0–4 of each 30-tick cycle, `0.35` otherwise | Burst every 15 s |
| `wave` | `0.5 + 0.5×sin(tick/20×2π)` | Sinusoidal 0→1 wave |
| `chaos` | `0.3 + random×1.4` | Random 0.3×–1.7× each tick |

`traffic_generator` nodes have their own `generatorPattern` field. The global pattern in `simulationStore` applies to the overall `peakRps` scale.

---

## Regions and Availability Zones

### Scope system
Each `ComponentDefinition` has a `scope: ComponentScope` field. The Inspector's `NodeLocationField` reads it from `COMPONENT_BY_TYPE` and renders the appropriate picker:
- `zonal` → Availability Zone dropdown (sets `nodeConfig.zoneId`)
- `regional` → Region dropdown (sets `nodeConfig.regionId`)
- `global` → hidden

### NodeLocationBadge
Shared component rendered at the bottom of every resource node card. Shows `◎ us-east-1a` (cyan) when `zoneId` is set, or `⬡ us-east-1` (purple) when `regionId` is set.

### Cross-zone / cross-region latency (edge metrics)
- Source and target in **different zones, same region** → `+2 ms`
- Source and target in **different regions** → `+75 ms`

### Zone / region failure
Set `zoneFailed: true` on an `availability_zone` node's config, or `regionFailed: true` on a `region` node's config. On the next tick, all resource nodes in that failure domain are force-failed.

---

## Simulation store (`src/store/simulationStore.ts`)

- Tick interval: **500 ms**
- Passes `get().nodeMetrics` as `previousMetrics` and `get().history` as `nodeHistory` to `runSimulationTick`
- RPS history: last **40 points** per node (used by predictive autoscaling)
- Event log: last **100 events**; levels: `'info'`, `'warn'`, `'error'`, `'k8s'`

### Event generation triggers

| Condition | Level | Note |
|-----------|-------|------|
| `!prev.failed && m.failed` | error | Overload onset |
| `prev.failed && !m.failed` | info | Recovery |
| load crosses 75% threshold | warn | Approaching capacity |
| pubsub lag crosses 2000 ms | warn | Consumers falling behind |
| cloud_function cold starts appear | warn | Concurrency ramp |
| cloud_function throttled invocations appear | error | Max concurrency reached |
| database queryQueueDepth goes from 0 to >0 | error | Connection pool exhausted |
| database writeRejectedRps goes from 0 to >0 | error | Writes arriving at replica |
| database writeRejectedRps drops to 0 | info | Replica healthy |
| database replicationLagMs crosses 200 ms | warn | Primary write load high |
| worker_pool backlog crosses 2000 ms | warn | Queue depth included |
| app_server scalingEvent changes | k8s | warm/cold/down message |
| load_balancer scalingEvent fires | k8s | Auto-scale signal |
| load_balancer failedTargets goes from 0 to >0 | warn | Health check rerouting |
| load_balancer noZonesAvailable becomes true | error | All zones down |
| global_accelerator failedRegions goes from 0 to >0 | warn | Failover active |
| firewall blockedRps goes from 0 to >0 | warn | Traffic being blocked |
| nat_gateway droppedPackets goes from 0 to >0 | warn | Bandwidth limit reached |

---

## Adding a new component type

1. Add the string literal to `ComponentType` in `src/types/index.ts`
2. Add a `ComponentDetail` variant with `kind` field if it needs unique per-tick metrics
3. Add `NodeConfig` fields if configurable
4. Add a `ComponentDefinition` entry in `src/constants/components.ts` with icon/color/defaults/**scope**
5. Create `src/components/canvas/nodes/YourTypeNode.tsx` — import and render `NodeLocationBadge` before the bottom Handle
6. Create `src/components/inspector/fields/YourTypeFields.tsx`
7. Register the node type in `Canvas.tsx` (`nodeTypes` map)
8. Add the type to `Inspector.tsx` field dispatch switch
9. Add `case 'your_type':` in `SimulationEngine.ts`:
   - Add to `BASE_LATENCY` record
   - Add to `computeCapacity` switch
   - Set `rpsOut`, override `load`, `failed`, `errorRate`, `latencyMs` if needed
   - Set `detail` if the type has a `ComponentDetail` variant
   - If it needs pre-BFS routing: add a routing resolution block between steps 3 and 5 in the processing order
10. Thread stateful components by reading `prevNodeMetrics?.detail` and storing state in `detail`
11. Add event generation in `simulationStore.ts` if the type has component-specific failure events
12. Add to `COMPONENT_CATEGORY` in `ComponentLibrary.tsx`

---

## Known gotchas

- **`'use client'`** — any component using hooks, browser APIs, or React Flow must have this directive at the top. Missing it causes Next.js SSR errors.
- **Default exports only** — all components use default exports. Named exports for components break the project convention.
- **CSS import order** — Google Fonts `@import` in `globals.css` must precede `@tailwindcss/postcss`. Reversing breaks font loading.
- **React Flow node registration** — every new `ComponentType` must be added to the `nodeTypes` object in `Canvas.tsx`. Missing registration causes React Flow to render a generic fallback node.
- **`previousMetrics` threading** — stateful components (`app_server`, `pubsub`, `cloud_function`, `worker_pool`, `block_storage`, `rate_limiter`, `service_mesh`) rely on previous-tick `detail`. Always pass `get().nodeMetrics`; never pass `{}`.
- **`nodeHistory` threading** — predictive autoscaling reads `nodeHistory[node.id]` for the last 40 rpsIn values. Always pass `get().history` from simulationStore; never pass `{}`.
- **Traffic pattern sync** — `getTrafficMultiplier` is duplicated in both `SimulationEngine.ts` and `simulationStore.ts`. Changing one requires updating the other.
- **`p99LatencyMs = latencyMs × 2.5`** — fixed multiplier, computed at end of each node's tick.
- **Autoscaling scale trigger uses `loadPct`, not `cpuPct`** — `scaleUpCpuPct`/`scaleDownCpuPct` config fields are compared against `dynamicLoad × 100`, not the displayed `cpuPct`. This is intentional so IO-bound workloads scale correctly.
- **`computeCapacity` vs tick capacity** — `computeCapacity` for `app_server` uses `min(cpuCores, ramGb×0.5) × 300` and ignores `rpsPerInstance`. The tick case uses `rpsPerInstance` if set. These can diverge; the tick value is what actually determines simulation behavior.
- **API gateway route deduplication** — `gatewayRoutes` deduplicates by `destNodeId` (max weight wins). Multiple routes to the same dest are shadowed.
- **Service mesh routing deduplication** — `meshRoutes` deduplicates by `destNodeId` only (max weight wins). The inspector UI marks lower-weight duplicate rules as "SHADOWED".
- **Region/AZ nodes are not React Flow parent nodes** — zone membership is stored in `nodeConfig.zoneId` / `nodeConfig.regionId`, not via React Flow's `parentNode`. The containers are purely visual.
- **NodeLocationBadge scope** — do not add `NodeLocationBadge` to `RegionNode`, `AvailabilityZoneNode`, `PublicSubnetNode`, or `PrivateSubnetNode` (they are containers, not resource nodes).
- **`scope` field required** — every new `ComponentDefinition` must include a `scope` value.
- **Pre-BFS routing resolution order** — service mesh routes resolved first (step 3), then API gateway routes (step 4), then health-aware redistribution (step 5/6). Later steps overwrite earlier `splitPct` values for the same edge.
- **Database `dbRole` defaults to `'standalone'`** — existing architectures without `dbRole` set continue to work unchanged. Only set `'primary'` or `'replica'` when modeling explicit single-leader replication groups. The `readReplicas` virtual-count field is only meaningful for `standalone`; it is ignored for `primary` and `replica`.
- **Replica `primaryNodeId` required for write routing** — a `replica` without `primaryNodeId` rejects all writes immediately. With `primaryNodeId` set, writes are internally forwarded to the primary with cross-zone/cross-region latency; if the primary is failed, writes are rejected.

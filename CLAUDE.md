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
| zod | ^4.3.6 |
| js-yaml | ^4.1.1 |

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
│   ├── page.tsx                    # Landing page — architecture library & scenario picker
│   └── simulator/page.tsx          # Simulator page — mounts Canvas + dashboard
├── components/
│   ├── canvas/
│   │   ├── Canvas.tsx              # React Flow canvas, registers all node types
│   │   ├── EdgeWire.tsx            # Custom 'wire' edge
│   │   └── nodes/                  # One file per ComponentType
│   ├── inspector/
│   │   ├── Inspector.tsx           # Right-panel config inspector; scope-aware NodeLocationField;
│   │   │                           #   NodeHeader shows service group badge + replica count;
│   │   │                           #   ServicePropagationNotice between location and type fields
│   │   ├── fields/EdgeInspector.tsx
│   │   └── fields/                 # Per-type config field components (+ RegionFields, AvailabilityZoneFields)
│   ├── iac/
│   │   └── IacEditorDrawer.tsx     # YAML editor drawer — Validate/Apply/Export/Starter toolbar
│   ├── shared/                     # ArcGauge, Sparkline, StatCell, Badge, NodeLocationBadge, etc.
│   └── simulation/
│       ├── MetricsDashboard.tsx    # Bottom panel: global stats, latency chart, node cards
│       ├── NodeMetricCard.tsx      # Per-node metric card with detail row
│       ├── LatencyPercentileChart.tsx  # Live p50/p75/p90/p95/p99 SVG chart
│       ├── SimulationControls.tsx  # Run/Stop/Reset buttons
│       ├── EventLog.tsx            # Real-time event log with auto-scroll
│       └── ScenarioDocsDrawer.tsx  # Scenario documentation drawer
├── constants/
│   └── components.ts               # COMPONENT_DEFINITIONS (with scope), capacity constants
├── simulation/
│   └── SimulationEngine.ts         # Pure TS tick engine (no React)
├── store/
│   ├── architectureStore.ts        # Zustand — canvas state + serviceGroups, persisted to localStorage
│   └── simulationStore.ts          # Zustand — ephemeral simulation state + tick loop
├── iac/
│   ├── schema.ts                   # TypeScript types + Zod schema for the YAML DSL
│   ├── parser.ts                   # YAML text → parsed JS object with error handling
│   ├── validate.ts                 # Semantic validation (duplicate IDs, bad refs, placement, service rules)
│   ├── normalize.ts                # Fill defaults, resolve derived values, stable IDs
│   ├── toTopology.ts               # Validated YAML model → nodes/edges/nodeConfigs/edgeConfigs/serviceGroups
│   ├── fromTopology.ts             # Current canvas state → YAML model (export); reconstructs services[]+deployments[]
│   ├── starters.ts                 # THREE_TIER_STARTER, SERVICE_DEPLOYMENT_STARTER,
│   │                               #   SERVICE_DEPLOYMENT_ACTIVE_ACTIVE_STARTER
│   └── examples/
│       ├── three-tier.yaml         # Classic CDN → LB → App → DB
│       ├── multi-az.yaml           # Multi-AZ with zone failover
│       ├── event-driven.yaml       # Queue-heavy async architecture
│       └── multi-service.yaml      # K8s-style services[] + deployments[] checkout platform
├── templates/
│   ├── defaultTemplate.ts          # Pre-built starter architecture
│   ├── architectures.ts            # Architecture library
│   └── scenarios.ts                # Scenario definitions
├── tests/
│   └── features/
│       └── iac/
│           ├── canvas-iac-sync.test.ts       # Round-trip / export tests
│           └── service-deployment.test.ts    # 75 tests: toTopology, fromTopology, propagation, validation
└── types/
    └── index.ts                    # All shared TypeScript types
```

---

## Two Zustand stores

| Store | Persistence | Responsibility |
|-------|-------------|----------------|
| `architectureStore` | localStorage | nodes, edges, nodeConfigs, edgeConfigs, **serviceGroups** |
| `simulationStore` | ephemeral | running/tick/metrics/events/history/latencyHistory; 500 ms tick loop |

### simulationStore fields
- `tick: number` — increments every 500 ms
- `history: Record<string, number[]>` — last 40 `rpsIn` values per node (predictive autoscaling)
- `latencyHistory: Record<string, number[]>` — last 40 `latencyMs` values per node (percentile chart)
- `events: LogEvent[]` — last 100 log events

### architectureStore — serviceGroups

```ts
interface ServiceGroup {
  id: string              // same as the service id in YAML
  type: ComponentType     // shared component type for all member nodes
  label: string           // display label
  nodeIds: string[]       // all node IDs that belong to this service
  healingEnabled?: boolean
}

serviceGroups: Record<string, ServiceGroup>   // keyed by group id
```

**Config propagation**: When `updateNodeConfig(id, config)` is called for a node that belongs to a service group, all non-placement fields are propagated to every sibling node in the group automatically.

```ts
const PROPAGATION_SKIP = new Set<keyof NodeConfig>([
  'zoneId', 'regionId', 'dbRole', 'primaryNodeId'
])
```

Fields in `PROPAGATION_SKIP` are node-specific and are never propagated. All other config fields are propagated to siblings. This means changing `rpsPerInstance`, `instances`, autoscaling settings, etc. on one node will synchronize those changes to all other instances of the same service.

---

## Component types & scope

Every component has a **scope** (`ComponentScope = 'global' | 'regional' | 'zonal'`) following AWS conventions:

- **Global** — spans all regions; inspector shows no placement picker
- **Regional** — lives in one region, spans AZs; inspector shows Region dropdown (`regionId`)
- **Zonal** — pinned to a single AZ; fails with that AZ; inspector shows AZ dropdown (`zoneId`)

| Type | Label | Icon | Color | Scope |
|------|-------|------|-------|-------|
| `cdn` | CDN Edge | ◎ | `#00ddff` | global |
| `traffic_generator` | Traffic Generator | ↯ | `#f43f5e` | global |
| `comment` | Comment | // | `#f59e0b` | global |
| `global_accelerator` | Global Accelerator | ⊙ | `#818cf8` | global |
| `region` | Region | ⬡ | `#c084fc` | global |
| `availability_zone` | Availability Zone | ◎ | `#67e8f9` | global |
| `public_subnet` | Public Subnet | ⬤ | `#4ade80` | global |
| `private_subnet` | Private Subnet | ◯ | `#94a3b8` | global |
| `load_balancer` | Load Balancer | ⇌ | `#ff55bb` | regional |
| `api_gateway` | API Gateway | ⊞ | `#3b82f6` | regional |
| `cloud_storage` | Cloud Storage | ◫ | `#38bdf8` | regional |
| `pubsub` | Pub/Sub | ⊕ | `#fb923c` | regional |
| `cloud_function` | Cloud Function | ƒ | `#a78bfa` | regional |
| `rate_limiter` | Rate Limiter | ⊘ | `#c026d3` | regional |
| `service_mesh` | Service Mesh | ⊛ | `#22d3ee` | regional |
| `cron_job` | Cron Job | ◷ | `#34d399` | regional |
| `nat_gateway` | NAT Gateway | ⇢ | `#f97316` | regional |
| `firewall` | Firewall | ⊟ | `#ef4444` | regional |
| `app_server` | App Server | ◈ | `#00ff88` | zonal |
| `cache` | Redis Cache | ⚡ | `#ff8833` | zonal |
| `database` | PostgreSQL | ▣ | `#bb66ff` | zonal |
| `block_storage` | Block Storage | ▤ | `#d97706` | zonal |
| `network_storage` | Network Storage | ⊜ | `#6366f1` | zonal |
| `worker_pool` | Worker Pool | ⚙ | `#facc15` | zonal |

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
autoscalingStrategy?: 'threshold' | 'target_tracking' | 'scheduled' | 'predictive'
warmPoolEnabled?: boolean            // warm replica toggle (default false)
minInstances?: number                // floor — always running
maxInstances?: number                // ceiling — never exceed
warmPoolSize?: number                // target warm-pool size (auto-replenished)
scaleUpCpuPct?: number              // loadPct% threshold for scale-out (default 75)
scaleDownCpuPct?: number            // loadPct% threshold for scale-in (default 25)
scaleUpCooldownTicks?: number       // ticks between scale-up events (default 4)
scaleDownCooldownTicks?: number     // ticks before scale-in fires (default 12)
coldProvisionTicks?: number         // ticks to provision a cold instance (default 6 = 3 s)
scaleDownDrainTicks?: number        // ticks for graceful drain before termination (default 4 = 2 s)

// App Server — Target Tracking autoscaling
targetMetric?: 'load' | 'cpu' | 'rps_per_instance'  // default 'load'
targetValue?: number                 // target % (load/cpu) or RPS (rps_per_instance); default 70
ttScaleOutCooldownTicks?: number     // default 4 (aggressive)
ttScaleInCooldownTicks?: number      // default 24 (conservative)

// App Server — Scheduled autoscaling
scheduledActions?: ScheduledScalingAction[]
// ScheduledScalingAction: { id, atTick, intervalTicks?, desiredInstances?, minInstances?, maxInstances? }

// App Server — Predictive autoscaling
predictiveLookbackTicks?: number    // history window (default 20)
predictiveLookaheadTicks?: number   // pre-provision horizon (default 10)
predictiveScalingBuffer?: number    // % above projected need (default 20)

// Cache
memoryGb?: number          // default 8
ttlSeconds?: number        // default 60
evictionPolicy?: 'lru' | 'lfu' | 'noeviction'
clusterMode?: boolean

// Database
engine?: 'PostgreSQL' | 'MySQL' | 'MongoDB' | 'Redis' | 'Cassandra'
instanceType?: string
storageGb?: number         // default 100
readReplicas?: number      // default 0 — virtual replicas for standalone role only
shards?: number            // default 1
rpsPerShard?: number       // default 800
maxConnections?: number    // default 200
dbRole?: 'standalone' | 'primary' | 'replica'  // default 'standalone'
primaryNodeId?: string     // replica only: node ID of the primary

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
maxQueueSize?: number         // max requests in queue (default 500)

// Service Mesh
mtlsEnabled?: boolean
observabilityLevel?: 'none' | 'basic' | 'full'   // default 'basic'
proxyOverheadMs?: number              // sidecar latency per hop (default 2)
meshRetryCount?: number               // automatic retries on failure (default 1)
meshCircuitBreakerEnabled?: boolean   // default false
meshCircuitBreakerThreshold?: number  // error% to open circuit (default 50)
meshRoutes?: Array<{ id: string; sourceNodeId: string; destNodeId: string; weightPct: number }>

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

// Public / Private Subnet
subnetCidr?: string   // display only

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
readSplitPct?: number                               // 0–100; read-traffic override
writeSplitPct?: number                              // 0–100; write-traffic override
```

---

## NodeMetrics & ComponentDetail

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
| `app_server` | `cpuPct`, `memPct`, `activeInstances`, `pendingInstances`, `pendingCountdown`, `drainingInstances`, `drainCountdown`, `warmReserve`, `pendingWarmInstances`, `warmPendingCountdown`, `scalingEvent: 'up-warm'\|'up-cold'\|'down'\|null`, `scaleUpCooldown`, `scaleDownCooldown`, `projectedRps?`, `desiredInstances?` |
| `cache` | `hitRate`, `evictionRate`, `memoryUsedPct` |
| `database` | `connectionPoolUsed`, `connectionPoolMax`, `queryQueueDepth`, `slowQueryRate`, `replicationLagMs`, `writeRejectedRps?`, `writeRoutingLatency?` |
| `cloud_storage` | `throttledRequests`, `bandwidthUtilization` |
| `block_storage` | `iopsUsed`, `iopsLimit`, `queueDepth`, `throughputMbps` |
| `network_storage` | `activeConnections`, `bandwidthUsedMbps`, `throughputLimitMbps` |
| `pubsub` | `subscriberLagMs`, `consumerThroughput`, `unackedMessages` |
| `cloud_function` | `coldStarts`, `throttledInvocations`, `concurrencyUsed` |
| `cron_job` | `overlapCount`, `lastRunDurationMs` |
| `worker_pool` | `queueDepth`, `workerUtilization`, `taskBacklogMs` |
| `rate_limiter` | `allowedRps`, `throttledRps`, `throttleRate`, `queueDepth` |
| `service_mesh` | `activeConnections`, `mtlsHandshakeRate`, `circuitBroken`, `retryRate` |
| `global_accelerator` | `activeRegions`, `failedRegions`, `reroutedRps` |
| `api_gateway` | `activeRoutes`, `routedRps`, `throttledRps`, `cacheHitRate` |
| `nat_gateway` | `translatedConnections`, `bandwidthUtilizationPct`, `droppedPackets` |
| `firewall` | `allowedRps`, `blockedRps`, `autoDetectedRps`, `manualBlockedRps`, `detectionEfficiency` |

---

## SimulationEngine contract

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
4. **Resolve API gateway routing tables** → same `resolvedEdgeConfigs`
5. **Pre-compute effectively failed regions** — region is failed if `regionFailed=true` OR every AZ in it has `zoneFailed=true`
6. **Health-aware redistribution** — LB: equal split among healthy targets; GA: zone-count-weighted split
7. BFS traversal in topological order computing per-node metrics
8. Build `nodeZoneIdMap` / `nodeRegionIdMap` for cross-zone/region latency
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
let load = rpsIn / capacity
let failed = load > 1.05
let errorRate = computeErrorRate(load)   // 0 at load<0.9, ramps to 1.0 at load≥1.2
// computeDropRate(load) = min(1, (load-1.0)*0.8) — drops only when load > 1.0
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

Applied to `app_server`, `cloud_function`, `worker_pool`. Reads previous-tick latency of downstream stores (`database`, `cache`, `block_storage`, `network_storage`, `cloud_storage`). Each store contributes `prevLatencyMs × ioFraction` where `ioFraction = 0.2` for cache, `0.5` for all others.

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
| Database (primary) | `shards × rpsPerShard` |
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
| Service Mesh | `100000` (pass-through; load derived from proxy overhead fraction) |
| Global Accelerator | `500000` |
| NAT Gateway | `natBandwidthGbps × 5000` |
| Firewall | `rules × (deep ? 500 : 1000)` — `computeCapacity` uses `deep?10000:50000` |

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
Passes traffic minus drop rate. `activeConnections ≈ rpsIn × 0.05`, capped at `maxConnections`. Sets `scalingEvent = true` when `load > 0.75`. Health-check redistribution routes away from failed downstream nodes.

### API Gateway
`cacheHitRate = gatewayCacheHitPct/100` (reads only, when `gatewayCacheEnabled`). Auth overhead added to `latencyMs` when `gatewayAuthEnabled`. `gatewayRoutes` resolved in pre-BFS step 4.

### App Server (static, `autoscalingEnabled = false`)
`effectiveCap = instances × perInstRps × ioScale`. IO wait from downstream stores added to latency.

### App Server Autoscaling — FSM

All strategies share state fields threaded through `prevD` each tick:

```
activeInstances     — instances currently serving traffic
pendingInstances    — cold instances provisioning (not yet active)
pendingCountdown    — ticks until pending → active
drainingInstances   — instances in graceful shutdown (not serving new requests)
drainCountdown      — ticks until draining instances are fully removed
warmReserve         — warm-pool slots available for instant scale-up
pendingWarmInstances — warm instances being provisioned to refill the pool
warmPendingCountdown — ticks until pendingWarm → warmReserve
scaleUpCooldown     — ticks before next scale-up is allowed
scaleDownCooldown   — ticks before next scale-in is allowed
```

**FSM steps each tick (all strategies):**
1. **Promote cold**: decrement `pendingCountdown`; when 0, move pending → active (clamped to maxInst)
2. **Complete drain**: decrement `drainCountdown`; when 0, remove `drainingInstances`
3. **Replenish warm pool**: decrement `warmPendingCountdown`; when 0, move pendingWarm → warmReserve
4. Decrement cooldowns
5. Compute `effectiveCap = activeInstances × perInstRps`, `dynamicLoad`, `loadPct`

**`provisionDelta(delta)` helper**: Consumes warm pool first (instant, no countdown); remaining cold-provisions with `pendingCountdown = coldTicks`. Sets `scaleUpCooldown`.

**`startDrain(n)` helper**: Moves `n` instances from active → draining. Sets `drainCountdown = drainTicks`, `scaleDownCooldown`. Does NOT immediately replenish warm pool (auto-replenishment handles it separately).

**Warm pool auto-replenishment (step 4b)**: After every strategy decision, if `warmPoolEnabled && warmReserve < warmPool && pendingWarmInstances === 0`, start `coldTicks`-length provisioning of the deficit into `pendingWarmInstances`.

**`threshold`** (default): Scale out when `loadPct > scaleUpCpuPct`; `startDrain(1)` when `loadPct < scaleDownCpuPct`.

**`target_tracking`**: Compute `desiredInstances` from `targetMetric`/`targetValue` each tick. Scale out by `desiredInstances − totalProvisioned`; `startDrain(activeInstances - desired)` to scale in.

**`scheduled`**: Fire matching `scheduledActions` at `atTick` (or every `intervalTicks`). Scheduled scale-down is **instant** (no drain — models pre-planned fleet resizing). Threshold fallback runs as safety net; uses `startDrain`.

**`predictive`**: Use `linRegSlope` over `nodeHistory` to project `rpsIn` forward by `predictiveLookaheadTicks`. Scale out proactively. Scale in always reactive via `startDrain`.

**Scale trigger uses `loadPct` (not `cpuPct`)** so IO-bound and memory-bound workloads scale correctly.

### Cache
Hit rate scales with `memoryGb` (up to 85%). Under load, eviction rate rises above 80% memory used, degrading hit rate. Reads absorbed by hit rate; writes pass through.

### Database — Single-Leader Replication

**`standalone`** (default): `readCapacity = (shards + readReplicas) × rpsPerShard`. Separate read/write loads; `load = max(readLoad, writeLoad)`.

**`primary`**: No virtual readReplicas. `capacity = shards × rpsPerShard`. Serves both reads and writes.

**`replica`** with `primaryNodeId`: Routes writes to primary with +2 ms (cross-zone) or +75 ms (cross-region) latency. If primary is failed, writes are rejected (`writeRejectedRps = writeRpsIn`). Replication lag = `max(0, (primaryWriteLoad - 0.3) / 0.7 × 500)` ms.

**`replica`** without `primaryNodeId`: Read-only; any write traffic raises `errorRate`.

### Cloud Storage
~10% of RPS emitted downstream as event notifications. Bandwidth utilization tracked.

### Block Storage
**Stateful** `queueDepth` accumulates at `(rpsIn - iopsLimit) × 0.5` per tick. Queue depth adds up to 1000 ms latency.

### Network Storage
Bandwidth-limited. `activeConnections ≈ ceil(rpsIn / 10)`, capped at `connectionLimit`. Connection saturation (≥90% of limit) adds 50 ms × utilization to latency.

### Pub/Sub
**Stateful** `subscriberLagMs` accumulates at `((rpsIn - capacity) / capacity) × 500` ms per tick.

### Cloud Function
IO wait inflates `effectiveExecMs`. Capacity recalculated with inflated exec time. **Stateful** `coldStarts ≈ max(0, concurrencyUsed - prevConcurrencyUsed) × 0.8`. Cold starts add up to 400 ms.

### Cron Job
`rpsIn = tasksPerRun / (intervalMinutes × 60)`. `rpsOut = rpsIn`. `overlapCount > 0` when `lastRunDurationMs > intervalMs`.

### Worker Pool
**Stateful** `queueDepth` accumulates at `(rpsIn - effectiveCap) × 0.5` per tick. IO wait inflates `effectiveTaskMs`. Backlog adds up to 5000 ms latency.

### Rate Limiter
Five algorithms:

| Algorithm | Instant cap | Queuing |
|-----------|-------------|---------|
| `token_bucket` | `rpsLimit + burstCapacity` | Yes — excess queued up to `maxQueueSize` |
| `leaky_bucket` | `rpsLimit` | Yes — excess queued |
| `fixed_window` | `rpsLimit × 1.5` | No — excess immediately dropped (429) |
| `sliding_window` | `rpsLimit × 1.2` | No — excess immediately dropped |
| `sliding_log` | `rpsLimit` | No — excess immediately dropped; +2 ms bookkeeping |

`rpsOut` always hard-capped at `requestsPerSecond`. **Stateful** queue for `token_bucket` and `leaky_bucket`.

### Service Mesh
Pass-through proxy. Latency = `proxyOverheadMs × 2` + observability overhead + mTLS (~1 ms). Circuit breaker watches **downstream** error rate. When tripped: `rpsOut = rpsIn × 0.05`, `errorRate = 0.95`, `failed = false`. Retries amplify downstream RPS; `errorRate = pow(downstreamErrorRate, retries + 1)`.

### Firewall
`detectionEfficiency = min(1, rules × (deep ? 0.05 : 0.04))`. Auto-blocks `badRatio × detectionEfficiency` of traffic; manual block rate adds to total. `badRatioOut = 0` (bad traffic scrubbed).

### Global Accelerator
Health-aware proportional routing (pre-BFS step 6). Each downstream region weighted by its active zone count. Failed regions get weight 0.

### NAT Gateway
Connection tracking: `translatedConnections ≈ rpsIn × 0.1`, capped at `maxConnections`. Dropped packets when over capacity.

### Region / Availability Zone / Subnets
Structural container nodes — transparent pass-through (`load=0`, `failed=false`, `rpsOut=rpsIn`).

---

## Global error rate formula

**Not** a simple weighted average. Computed in `MetricsDashboard.computeGlobalErrorRate`:

```
global error rate = min(1, Σ(rpsIn × errorRate) over all processing nodes)
                   ─────────────────────────────────────────────────────────
                   Σ(rpsOut) of traffic_generator and cron_job nodes
```

Each failed request is counted once at the node where it fails. Pass-through nodes (CDN, LB, API GW) with `errorRate=0` contribute 0. Falls back to simple weighted average when no source nodes exist.

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

`traffic_generator` nodes have their own `generatorPattern`. The global pattern in `simulationStore` applies to the `peakRps` scale.

---

## Latency percentile chart

`LatencyPercentileChart` (raw SVG) renders live p50/p75/p90/p95/p99 lines from `latencyHistory` per node. Percentiles are synthesized using fixed log-normal multipliers consistent with the engine's `p99 = latencyMs × 2.5`:

| Percentile | Multiplier |
|---|---|
| p50 | × 0.72 |
| p75 | × 1.00 |
| p90 | × 1.50 |
| p95 | × 2.00 |
| p99 | × 2.50 |

Located in the right panel of `MetricsDashboard`, above the Event Log. Node selector auto-defaults to first eligible node (excludes containers, comment, traffic_generator).

---

## Regions and Availability Zones

### Scope system
Each `ComponentDefinition` has a `scope: ComponentScope`. The Inspector's `NodeLocationField` renders the appropriate picker:
- `zonal` → Availability Zone dropdown (sets `nodeConfig.zoneId`)
- `regional` → Region dropdown (sets `nodeConfig.regionId`)
- `global` → hidden

### NodeLocationBadge
Rendered at the bottom of every resource node card. Shows zone (cyan) or region (purple).

### Cross-zone / cross-region latency (edge metrics)
- Source and target in **different zones, same region** → `+2 ms`
- Source and target in **different regions** → `+75 ms`

---

## Simulation store (`src/store/simulationStore.ts`)

- Tick interval: **500 ms**
- Passes `get().nodeMetrics` as `previousMetrics` and `get().history` as `nodeHistory` to `runSimulationTick`
- RPS history: last **40 points** per node
- Latency history: last **40 points** per node
- Event log: last **100 events**; levels: `'info'`, `'warn'`, `'error'`, `'k8s'`
- History hooks in `MetricsDashboard` use **tick-gated** refs (append once per tick regardless of value change)

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
10. Thread stateful components by reading `prevNodeMetrics?.detail` and storing state in `detail`
11. Add event generation in `simulationStore.ts` if the type has component-specific failure events
12. Decide whether to exclude from `SKIP_ERROR_TYPES` / `NO_LATENCY_TYPES` in `MetricsDashboard.tsx`

---

## Known gotchas

- **`'use client'`** — any component using hooks, browser APIs, or React Flow must have this directive. Missing it causes Next.js SSR errors.
- **Default exports only** — all components use default exports. Named exports for components break the project convention.
- **CSS import order** — Google Fonts `@import` in `globals.css` must precede `@tailwindcss/postcss`. Reversing breaks font loading.
- **React Flow node registration** — every new `ComponentType` must be added to the `nodeTypes` object in `Canvas.tsx`. Missing registration causes React Flow to render a generic fallback node.
- **`previousMetrics` threading** — stateful components rely on previous-tick `detail`. Always pass `get().nodeMetrics`; never pass `{}`.
- **`nodeHistory` threading** — predictive autoscaling reads `nodeHistory[node.id]`. Always pass `get().history`; never pass `{}`.
- **Traffic pattern sync** — `getTrafficMultiplier` is duplicated in both `SimulationEngine.ts` and `simulationStore.ts`. Changing one requires updating the other.
- **`p99LatencyMs = latencyMs × 2.5`** — fixed multiplier, computed at end of each node's tick.
- **Autoscaling scale trigger uses `loadPct` (not `cpuPct`)** — `scaleUpCpuPct`/`scaleDownCpuPct` config fields are compared against `dynamicLoad × 100`.
- **`computeCapacity` vs tick capacity** — `computeCapacity` for `app_server` uses `min(cpuCores, ramGb×0.5) × 300` and ignores `rpsPerInstance`. The tick case uses `rpsPerInstance` if set. These can diverge.
- **Scale-down is deferred** — all autoscaling strategies use `startDrain(n)` for scale-in (graceful drain + `drainCountdown`). Scheduled scale-down is the one exception (instant, models pre-planned resizing).
- **Warm pool auto-replenishes** — `pendingWarmInstances` / `warmPendingCountdown` ensure the warm reserve always refills to `warmPoolSize` after it is consumed by a scale-up event.
- **API gateway route deduplication** — `gatewayRoutes` deduplicates by `destNodeId` (max weight wins).
- **Service mesh routing deduplication** — `meshRoutes` deduplicates by `destNodeId` (max weight wins). Inspector UI marks lower-weight duplicate rules as "SHADOWED".
- **Region/AZ nodes are not React Flow parent nodes** — zone membership is stored in `nodeConfig.zoneId` / `nodeConfig.regionId`, not via React Flow's `parentNode`.
- **`NodeLocationBadge` scope** — do not add it to `RegionNode`, `AvailabilityZoneNode`, `PublicSubnetNode`, or `PrivateSubnetNode`.
- **`scope` field required** — every new `ComponentDefinition` must include a `scope` value.
- **Pre-BFS routing resolution order** — service mesh routes (step 3) → API gateway routes (step 4) → health-aware redistribution (step 6). Later steps overwrite earlier `splitPct` values for the same edge.
- **Database `dbRole` defaults to `'standalone'`** — existing architectures without `dbRole` set continue to work. The `readReplicas` virtual-count field is only meaningful for `standalone`.
- **Replica `primaryNodeId` required for write routing** — a `replica` without `primaryNodeId` rejects all writes immediately.
- **Global error rate** — uses source-denominator formula, not a plain weighted average. Adding a new source-type node requires updating `SOURCE_TYPES` in `MetricsDashboard.tsx`.

---

## Phase 2 — IaC YAML Authoring (`src/iac/`)

### Overview

Phase 2 adds a Terraform-inspired YAML DSL so users can define an entire topology in one file and have the simulator build and configure the canvas automatically. This is **not** real cloud provisioning — it is a simulator-native IaC playground.

Core workflow:
1. User opens the YAML editor panel
2. User writes or pastes a simulator YAML document
3. App validates the document and shows structured errors
4. `Apply` replaces the canvas atomically (only on success)
5. The simulation runs immediately against the imported topology
6. `Export` writes the current canvas back to clean, diff-friendly YAML
7. The canvas auto-syncs to the YAML editor (debounced 300 ms) whenever the canvas changes

### YAML DSL shape (v1)

Two authoring styles are supported. They can be combined in one document.

**Classic style** — flat `resources[]` with explicit per-zone node IDs:
```yaml
version: 1
name: three-tier-app
globals:
  peakRps: 1500
  trafficPattern: steady
regions:
  - id: us-east-1
    zones:
      - id: use1a
resources:
  - id: lb
    type: load_balancer
    placement:
      region: us-east-1
    spec:
      algorithm: round_robin
  - id: app-a
    type: app_server
    placement:
      zone: use1a
    deploy:
      instances: 4
      rpsPerInstance: 500
connections:
  - from: lb
    to: app-a
    protocol: REST
```

**K8s-style** — `services[]` + `deployments[]` (generates node IDs automatically):
```yaml
version: 1
name: checkout-platform
services:
  - id: api
    type: app_server
    label: Checkout API
    deploy:
      instances: 3
      rpsPerInstance: 650
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
  - id: orders-db
    type: database
    spec:
      engine: PostgreSQL
      storageGb: 250
deployments:
  - service: api
    zones:
      - use1a
      - use1b
  - service: orders-db
    zones:
      - use1a          # becomes primary
    replicas:
      - zone: use1b    # becomes replica linked to primary
```

### YAML → simulator mapping

| YAML concept | Maps to |
|---|---|
| `resources[]` | React Flow `nodes[]` (explicit IDs) |
| `services[]` + `deployments[]` | Expanded to multiple nodes; IDs follow `{serviceId}-{zoneId}` or `{serviceId}-{regionId}` |
| `connections[]` | React Flow `edges[]` |
| `regions[].id` | node ID for the `region` node; also used for `regionId` lookups |
| `regions[].zones[].id` | node ID for the `availability_zone` node; used for `zoneId` lookups |
| `placement.scope: global` | no placement field set |
| `placement.region` | `nodeConfig.regionId` |
| `placement.zone` | `nodeConfig.zoneId` |
| `spec.*` | flat `nodeConfigs[nodeId]` fields |
| `deploy.*` | flat `nodeConfigs[nodeId]` fields (`instances`, `cpuCores`, etc.) |
| `deploy.autoscaling.*` | `autoscalingEnabled`, `autoscalingStrategy`, `minInstances`, … |
| `dependencies[].service` | inferred edges between service nodes |
| `dependencies[].readSplitPct` / `writeSplitPct` | `edgeConfigs[edgeId].readSplitPct` / `writeSplitPct` |
| `deployments[].zones[]` | one node per zone (first = primary for `database`) |
| `deployments[].replicas[]` | replica nodes with `dbRole: 'replica'` + `primaryNodeId` |
| `globals.peakRps` | simulation control default RPS |
| `globals.trafficPattern` | simulation pattern default |
| Expanded service nodes | recorded in `serviceGroups` for config propagation |

### Compiler pipeline (`src/iac/`)

```
YAML text
  → parser.ts        parse YAML, surface line/path on syntax errors
  → validate.ts      semantic checks (see rules below)
  → normalize.ts     fill defaults, generate stable node IDs
  → toTopology.ts    produce { nodes, edges, nodeConfigs, edgeConfigs, serviceGroups }
  → store apply      architectureStore.loadTopology() — atomic, only on success
  → canvas render    React Flow picks up the new nodes/edges
```

Export path: `fromTopology.ts` reads current store state → produces clean YAML model → serialized to string.

All pipeline modules are **pure functions** — no React imports, no store imports. Testable in isolation.

### Service/Deployment abstraction — `toTopology.ts`

When `services[]` + `deployments[]` are present, `toTopology` expands them:

1. For each deployment entry, look up the service definition.
2. For each zone in `deployment.zones[]`, create one node with ID `{serviceId}-{zoneId}`, type = service type, `nodeConfig.zoneId = zoneId` (or `regionId` for regional services).
3. For database services, the first zone entry becomes `dbRole: 'primary'`; each `replicas[]` entry becomes `dbRole: 'replica'` with `primaryNodeId` pointing to the primary node.
4. All expanded nodes for the same service are recorded in a `ServiceGroup` under the service ID.
5. `dependencies[]` in a service definition generate edges between the expanded nodes of the source service and each node of the target service. `readSplitPct`/`writeSplitPct` are applied to those edges.

### Service/Deployment abstraction — `fromTopology.ts`

`fromTopology` accepts `{ nodes, edges, nodeConfigs, edgeConfigs, serviceGroups }`. When `serviceGroups` is non-empty:

1. Build a `nodeToService` reverse map from `serviceGroups`.
2. Exclude service-member nodes from `resources[]` — they will appear in `services[]` + `deployments[]` instead.
3. For each service group, pick the canonical node (first non-replica). Pre-strip `dbRole`, `primaryNodeId`, `healingEnabled` from the config (these are encoded in the `deployments` structure, not the service spec). Reconstruct `spec` / `deploy` fields.
4. Classify each node: `dbRole === 'replica'` → `deployment.replicas[]`; others → `deployment.zones[]` or `deployment.regions[]`.
5. Infer `dependencies[]` from inter-service edges (one dependency entry per unique target service).
6. Inter-service edges are excluded from `connections[]`.

### Starter templates (`src/iac/starters.ts`)

| Constant | Description |
|---|---|
| `THREE_TIER_STARTER` | Classic multi-AZ three-tier web app (classic resources[] style) |
| `SERVICE_DEPLOYMENT_STARTER` | K8s-style checkout platform with services/deployments; 5 services across 2 AZs |
| `SERVICE_DEPLOYMENT_ACTIVE_ACTIVE_STARTER` | Multi-region active-active; 6 services across us-east-1 + us-west-2 with CDN + Global Accelerator |

IaC editor toolbar exposes: `STARTER` (THREE_TIER_STARTER) and `SVC+DEPLOY` (SERVICE_DEPLOYMENT_STARTER).

### Validation rules (minimum for v1)

Errors block apply. Warnings are advisory.

| Rule | Severity |
|---|---|
| Missing `version` field | error |
| Duplicate resource `id` | error |
| Unknown `type` (not in `ComponentType`) | error |
| `connections[].from` / `.to` references non-existent resource ID | error |
| `placement.zone` references a zone ID not declared in `regions` | error |
| `placement.region` references a region ID not declared in `regions` | error |
| Regional resource missing `placement.region` | error |
| Zonal resource missing `placement.zone` | error |
| Global resource with `placement.zone` or `placement.region` | error |
| Invalid enum value (e.g. `algorithm`, `engine`, `trafficPattern`) | error |
| Unsupported field for given resource type | warning |
| Self-referencing connection (`from === to`) | error |
| `deployments[].service` references unknown service ID | error |
| `deployments[].zones[]` references undeclared zone ID | error |
| `dependencies[].service` references unknown service ID | error |

### UI requirements

- YAML editor in a drawer (not modal — stays open alongside canvas)
- Toolbar: `STARTER` | `SVC+DEPLOY` | `VALIDATE` | `APPLY` | `EXPORT`
- Error list rendered below editor; `APPLY` disabled while there are validation errors
- `APPLY` replaces canvas atomically — partial mutation on invalid input is not allowed
- Canvas auto-syncs to YAML editor (debounced 300 ms) on every canvas change
- `ServicePropagationNotice` rendered in Inspector between location and type-specific fields for nodes that belong to a service group

### Inspector service group UI

`NodeHeader` in `Inspector.tsx` shows a purple `⊕ {serviceId}` badge when the node belongs to a service group, plus a replica count badge and an optional `✦ healing` badge.

`ServicePropagationNotice` renders a purple-bordered info box explaining that config changes will propagate to all sibling nodes. It appears between the location fields and type-specific fields, only for nodes in a service group.

**Config propagation**: `architectureStore.updateNodeConfig` detects if the node belongs to a service group and propagates all non-`PROPAGATION_SKIP` fields to every sibling node automatically. This enables clicking any instance of a service and editing its spec to apply the change fleet-wide.

### IaC-specific gotchas

- **Atomic apply only** — never partially mutate store state. Build the full topology object first, validate it, then call `loadTopology` once.
- **`regions` section auto-creates nodes** — declaring a region or zone in `regions[]` implicitly creates a `region` / `availability_zone` node. Do not also declare them again in `resources[]`.
- **Service node IDs follow `{serviceId}-{zoneId}`** — e.g. `api` deployed to `use1a` → node ID `api-use1a`. Connections in classic `connections[]` reference these generated IDs; `dependencies[]` reference service IDs (not node IDs).
- **`deploy` vs `spec`** — `deploy` is for compute resources (`app_server`, `worker_pool`, `cloud_function`); `spec` for everything else. Both flatten into the same `NodeConfig`.
- **Autoscaling sub-object** — `deploy.autoscaling.*` must be spread into flat `NodeConfig` fields (`autoscalingEnabled`, `autoscalingStrategy`, `minInstances`, etc.) in `toTopology.ts`.
- **`dbRole` / `primaryNodeId` not in global `SKIP_FIELDS`** — classic resources need these fields in `spec`; service group nodes have them stripped inside `buildServicesAndDeployments` before calling `splitConfig`. Do not add them to global `SKIP_FIELDS`.
- **Export omits defaults** — `fromTopology.ts` does not emit fields whose value equals the `ComponentDefinition` default. Keeps exported YAML minimal and diff-friendly.
- **Parser is decoupled from React** — `src/iac/` modules must not import from `src/components/`, `src/store/`, or `src/simulation/`. They accept plain data and return plain data.
- **Round-trip stability** — importing a YAML file, exporting it, and re-importing must produce an identical topology. Covered by `canvas-iac-sync.test.ts`.
- **Service groups persisted** — `serviceGroups` is included in `architectureStore`'s `partialize` slice and survives page refresh.
- **`removeNode` cleans service groups** — when a node is deleted, `architectureStore.removeNode` removes it from any service group and removes the group if it becomes empty.
- **`PROPAGATION_SKIP` is exhaustive** — only `zoneId`, `regionId`, `dbRole`, `primaryNodeId` are skipped. All other config keys (including all autoscaling fields) propagate to siblings.
- **`serviceGroups` must be passed to `fromTopology`** — both the auto-sync in `simulator/page.tsx` and the `handleExport` in `IacEditorDrawer.tsx` must pass `serviceGroups` from the store, or service reconstruction will produce classic `resources[]` instead of `services[]` + `deployments[]`.

### Test suite

`tests/features/iac/service-deployment.test.ts` — 75 tests organized in 10 suites:

| Suite | Tests | What it covers |
|---|---|---|
| toTopology — node IDs | 5 | Generated IDs follow `{serviceId}-{zoneId}` pattern |
| toTopology — serviceGroups | 6 | Group membership, node count, type, label |
| toTopology — nodeConfig | 8 | Shared fields propagated; zone-specific fields correct |
| toTopology — db primary/replica | 6 | First zone = primary; replicas[] = replica + primaryNodeId |
| toTopology — dependency edges | 4 | Edge creation, readSplitPct/writeSplitPct mapping |
| fromTopology — reconstruction | 14 | services[]/deployments[] correctly rebuilt; classic resources unaffected |
| config propagation | 8 | Pure `applyWithPropagation` mirrors store behavior; PROPAGATION_SKIP respected |
| validateDocument — service rules | 5 | Unknown service ref, deployment without service, etc. |
| validateDocument — deployment rules | 6 | Zone ref validation, region ref validation |
| multi-service.yaml — end-to-end | 13 | Full parse→validate→toTopology→fromTopology round-trip |

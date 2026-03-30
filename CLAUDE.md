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
│   │   ├── Inspector.tsx           # Right-panel config inspector
│   │   ├── EdgeInspector.tsx       # Edge config fields
│   │   └── fields/                 # Per-type config field components
│   ├── shared/                     # ArcGauge, Sparkline, StatCell, Badge, etc.
│   ├── sidebar/                    # ComponentLibrary drag-source (collapsible)
│   └── simulation/
│       ├── MetricsDashboard.tsx    # Bottom panel: global stats + node cards
│       ├── NodeMetricCard.tsx      # Per-node metric card with detail row
│       ├── SimulationControls.tsx  # Run/Stop/Reset buttons
│       └── EventLog.tsx            # Real-time event log with auto-scroll
├── constants/
│   └── components.ts               # COMPONENT_DEFINITIONS, capacity constants
├── simulation/
│   └── SimulationEngine.ts         # Pure TS tick engine (no React)
├── store/
│   ├── architectureStore.ts        # Zustand — canvas state, persisted to localStorage
│   └── simulationStore.ts          # Zustand — ephemeral simulation state + tick loop
├── templates/
│   └── defaultTemplate.ts          # Pre-built example architecture
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

## Component types

Defined in `src/constants/components.ts`. The `ComponentType` union in `src/types/index.ts`:

| Type | Label | Icon | Color | Description |
|------|-------|------|-------|-------------|
| `cdn` | CDN Edge | ◎ | `#00ddff` | Content delivery network |
| `load_balancer` | Load Balancer | ⇌ | `#ff55bb` | Distributes incoming traffic |
| `app_server` | App Server | ◈ | `#00ff88` | Application compute layer with optional autoscaling |
| `cache` | Redis Cache | ⚡ | `#ff8833` | In-memory key-value store |
| `database` | PostgreSQL | ▣ | `#bb66ff` | Persistent relational/NoSQL database |
| `cloud_storage` | Cloud Storage | ◫ | `#38bdf8` | Object storage buckets |
| `block_storage` | Block Storage | ▤ | `#d97706` | Persistent block volume (NVMe/SSD/HDD) |
| `network_storage` | Network Storage | ⊜ | `#6366f1` | Shared network file system (NFS/SMB/CephFS) |
| `pubsub` | Pub/Sub | ⊕ | `#fb923c` | Async message bus |
| `cloud_function` | Cloud Function | ƒ | `#a78bfa` | Serverless compute |
| `cron_job` | Cron Job | ◷ | `#34d399` | Schedule-driven task emitter |
| `worker_pool` | Worker Pool | ⚙ | `#facc15` | Parallel task processing pool |
| `traffic_generator` | Traffic Generator | ↯ | `#f43f5e` | Injects traffic at configurable RPS |
| `rate_limiter` | Rate Limiter | ⊘ | `#c026d3` | Throttles traffic by rate-limiting algorithm |
| `service_mesh` | Service Mesh | ⬡ | `#22d3ee` | Sidecar proxy layer — mTLS, retries, routing, circuit breaking |
| `comment` | Comment | // | `#f59e0b` | Annotation node — no simulation effect |

---

## NodeConfig fields (`src/types/index.ts`)

All fields are optional. Flat bag shared across all component types.

```ts
// Shared
label?: string

// CDN
pops?: number                          // default 2
cacheablePct?: number                  // default 60
bandwidthGbps?: number                 // default 100

// Load Balancer
algorithm?: 'round_robin' | 'least_conn' | 'ip_hash' | 'random' | 'weighted'
healthChecks?: boolean                 // default true
maxConnections?: number                // default 100000

// App Server
instances?: number                     // default 1
cpuCores?: number                      // default 4
ramGb?: number                         // default 8
rpsPerInstance?: number                // default 500 (overrides workload-based nominal in tick; NOT used in computeCapacity)
avgLatencyMs?: number                  // default 40

workloadType?: 'cpu_bound' | 'io_bound' | 'memory_bound'  // default 'io_bound'
// App Server — Autoscaling
autoscalingEnabled?: boolean           // master toggle (default false)
warmPoolEnabled?: boolean              // warm replica toggle (default false)
minInstances?: number                  // floor — always running
maxInstances?: number                  // ceiling — never exceed
warmPoolSize?: number                  // pre-provisioned instances (instant scale)
scaleUpCpuPct?: number                 // load% that triggers scale-out (default 75)
scaleDownCpuPct?: number               // load% that triggers scale-in (default 25)
scaleUpCooldownTicks?: number          // ticks between scale-up events (default 4 = 2 s)
scaleDownCooldownTicks?: number        // ticks before scale-in fires (default 12 = 6 s)
coldProvisionTicks?: number            // ticks to provision cold instance (default 6 = 3 s)

// Cache
memoryGb?: number                      // default 8
ttlSeconds?: number                    // default 60
evictionPolicy?: 'lru' | 'lfu' | 'noeviction'
clusterMode?: boolean

// Database
engine?: 'PostgreSQL' | 'MySQL' | 'MongoDB' | 'Redis' | 'Cassandra'
instanceType?: string                  // e.g. 'db.m5.large'
storageGb?: number                     // default 100
readReplicas?: number                  // default 0
shards?: number                        // default 1
rpsPerShard?: number                   // default 800
maxConnections?: number                // default 200

// Cloud Storage
storageThroughputMbps?: number         // default 1000
objectSizeKb?: number                  // default 512
storageClass?: 'standard' | 'nearline' | 'coldline' | 'archive'
storageGb?: number

// Block Storage
diskType?: 'nvme' | 'ssd' | 'hdd'
iops?: number                          // IOPS limit (default 3000)
storageGb?: number
objectSizeKb?: number                  // IO size (default 64)

// Network Storage
nfsProtocol?: 'nfs' | 'smb' | 'cephfs'
storageThroughputMbps?: number         // default 500
connectionLimit?: number               // max simultaneous mounts (default 100)
objectSizeKb?: number                  // IO size (default 64)

// Pub/Sub
partitions?: number                    // default 4
messageRetentionHours?: number         // default 24
maxMessageSizeKb?: number              // default 10

// Cloud Function
functionMemoryMb?: number              // default 256
maxConcurrency?: number                // default 100
avgExecutionMs?: number                // default 200

// Cron Job
intervalMinutes?: number               // default 5
tasksPerRun?: number                   // default 100

// Worker Pool
workerCount?: number                   // default 4
threadCount?: number                   // default 4
taskDurationMs?: number                // default 500

// Traffic Generator
generatorRps?: number                  // default 1000
generatorPattern?: TrafficPattern      // default 'steady'
readRatioPct?: number                  // 0–100, default 50

// Rate Limiter
rateLimitAlgorithm?: 'token_bucket' | 'leaky_bucket' | 'fixed_window' | 'sliding_window' | 'sliding_log'
requestsPerSecond?: number             // allowed RPS (default 1000)
burstCapacity?: number                 // extra requests in burst window (default 200; token_bucket only)
windowSizeMs?: number                  // window size for window-based algorithms (default 1000)
maxQueueSize?: number                  // max requests held in queue before dropping (default 500)

// Service Mesh
mtlsEnabled?: boolean                  // default true
observabilityLevel?: 'none' | 'basic' | 'full'   // default 'basic'
proxyOverheadMs?: number               // sidecar latency per hop (default 2)
meshRetryCount?: number                // automatic retries on failure (default 1)
meshCircuitBreakerEnabled?: boolean    // default false
meshCircuitBreakerThreshold?: number   // error% to open circuit (default 50)
meshRoutes?: Array<{                   // routing table
  id: string
  sourceNodeId: string                 // upstream service node ID (used for UI; engine deduplicates by destNodeId)
  destNodeId: string                   // downstream service node ID
  weightPct: number                    // relative weight (normalized to 100% at tick time)
}>

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
```

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
  readLoad?: number          // database only
  writeLoad?: number         // database only
  detail?: ComponentDetail
}
```

### ComponentDetail (discriminated union by `kind`)

| `kind` | Fields |
|--------|--------|
| `cdn` | `cacheHitRate`, `originBypassRps`, `bandwidthGbps` |
| `load_balancer` | `activeConnections`, `scalingEvent: boolean`, `connectionsPerSecond` |
| `app_server` | `cpuPct`, `memPct`, `activeInstances`, `pendingInstances`, `pendingCountdown`, `warmReserve`, `scalingEvent: 'up-warm'\|'up-cold'\|'down'\|null`, `scaleUpCooldown`, `scaleDownCooldown` |
| `cache` | `hitRate`, `evictionRate`, `memoryUsedPct` |
| `database` | `connectionPoolUsed`, `connectionPoolMax`, `queryQueueDepth`, `slowQueryRate` |
| `cloud_storage` | `throttledRequests`, `bandwidthUtilization` |
| `block_storage` | `iopsUsed`, `iopsLimit`, `queueDepth`, `throughputMbps` |
| `network_storage` | `activeConnections`, `bandwidthUsedMbps`, `throughputLimitMbps` |
| `pubsub` | `subscriberLagMs` (stateful), `consumerThroughput`, `unackedMessages` |
| `cloud_function` | `coldStarts` (stateful), `throttledInvocations`, `concurrencyUsed` |
| `cron_job` | `overlapCount`, `lastRunDurationMs` |
| `worker_pool` | `queueDepth` (stateful), `workerUtilization`, `taskBacklogMs` |
| `rate_limiter` | `allowedRps`, `throttledRps`, `throttleRate`, `queueDepth` (stateful for queuing algos) |
| `service_mesh` | `activeConnections`, `mtlsHandshakeRate`, `circuitBroken`, `retryRate` |

---

## SimulationEngine contract (`src/simulation/SimulationEngine.ts`)

Pure TypeScript — no React imports.

```ts
export function runSimulationTick(
  topology: Topology,            // { nodes, edges, nodeConfigs, edgeConfigs }
  incomingRps: number,           // global RPS × traffic pattern multiplier
  tick = 0,
  previousMetrics: Record<string, NodeMetrics> = {}   // required for stateful components
): { nodeMetrics: Record<string, NodeMetrics>; edgeMetrics: Record<string, EdgeMetrics> }
```

### Processing order

1. `buildAdjacency` — downstream/upstream maps + cycle detection via DFS (WHITE/GRAY/BLACK coloring)
2. `topoSort` — Kahn's BFS; returns nodes in processing order and source node set
3. Resolve service mesh routing tables → `resolvedEdgeConfigs` (overrides `splitPct` on matched edges; deduplicates by max weight per `destNodeId`)
4. BFS traversal in topological order computing per-node metrics
5. Edge metrics pass: `rps = sourceMetric.rpsOut`, `isBottleneck = load > 0.9`

### RPS sourcing rules

- `traffic_generator` — uses own `generatorRps × pattern multiplier`
- `cron_job` — `tasksPerRun / (intervalMinutes × 60)` fixed rate; ignores global RPS
- Other nodes with no upstream — receive `incomingRps`
- All other nodes — sum upstream contributions weighted by `splitPct`

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
| CDN | `pops × 25000` |
| Load Balancer | `50000` fixed |
| App Server | `instances × min(cpuCores, ramGb×0.5) × 300` (used by `computeCapacity`; tick uses `rpsPerInstance` override if set) |
| Cache | `100000` fixed |
| Database | `shards × rpsPerShard + readReplicas × rpsPerShard` |
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

### Base latencies (ms)

| Type | Base | Config override |
|------|------|----------------|
| CDN | 5 | — |
| Load Balancer | 2 | — |
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

---

## Per-component tick behavior

### CDN
Cache hit rate = `(cacheablePct/100) × max(0.4, 1 − degradation)` where degradation rises above 80% load. Reads absorbed by hit rate; writes pass through. `rpsOut = non-hit reads + writes − drops`.

### Load Balancer
Passes traffic minus drop rate. `activeConnections ≈ rpsIn × 0.05`, capped at `maxConnections`. Sets `scalingEvent = true` when `load > 0.75`.

### App Server (static, `autoscalingEnabled = false`)
`effectiveCap = instances × perInstRps × ioScale`. IO wait from downstream stores added to latency.

`workloadType` changes three things:
- **IO wait weight** applied before `ioScale`: `cpu_bound=0.1`, `memory_bound=0.35`, `io_bound=1.0`
- **Nominal RPS per instance** (when `rpsPerInstance` not set): `cpu_bound=cpuCores×350`, `memory_bound=min(cpuCores×300, ramGb×100)`, `io_bound=cpuCores×500`
- **`cpuPct`/`memPct` display**: `cpu_bound` saturates CPU fast; `memory_bound` saturates memory fast; `io_bound` both moderate (threads waiting)

### App Server (autoscaling FSM)
See "App Server Autoscaling FSM" section below.

### Cache
Hit rate scales with `memoryGb` (up to 85%). Under load, eviction rate rises above 80% memory used, degrading hit rate. Reads absorbed by hit rate; writes pass through.

### Database
Separate read/write loads: reads served by primary + replicas, writes by primary only. `load = max(readLoad, writeLoad)`. Connection pool = `(shards + replicas) × 100`. Query queue depth adds latency. Slow query rate rises above 60% load.

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

`rpsOut` is always hard-capped at `requestsPerSecond` regardless of algorithm. **Stateful** queue for `token_bucket` and `leaky_bucket`. `load` = queue fill fraction (queuing algos) or `rpsIn / instantCap` (window algos). `errorRate = throttleRate`.

### Service Mesh
Pass-through proxy layer. Latency = `proxyOverheadMs × 2` (two sidecar hops) + observability overhead (`none=0`, `basic=0.5`, `full=1` ms) + mTLS overhead (~1 ms if enabled). Retries amplify downstream RPS when upstream errors occur (`retryRps += errorRps × meshRetryCount`). Circuit breaker: when error rate exceeds `meshCircuitBreakerThreshold%`, `circuitBroken = true` — traffic is fast-failed. Routing table overrides edge `splitPct` for matched `destNodeId` entries; duplicate dest pairs are resolved by max weight.

---

## App Server Autoscaling FSM

Only active when `autoscalingEnabled = true`. State threads through `detail` via `previousMetrics` each tick.

### Per-tick order

1. **Promote pending**: decrement `pendingCountdown`; when it reaches 0, move `pendingInstances` to `activeInstances` (clamped to `maxInst`)
2. **Decrement cooldowns**: `scaleUpCooldown--`, `scaleDownCooldown--`
3. **Compute load**: `effectiveCap = activeInstances × perInstRps × ioScale`; `loadPct = dynamicLoad × 100`
4. **Scale-up**: if `loadPct > scaleUpThr && scaleUpCooldown === 0 && totalProvisioned < maxInst`:
   - Warm available (`warmPoolEnabled && warmReserve > 0`) → instant: `activeInstances++`, `warmReserve--`, event = `'up-warm'`
   - Otherwise → cold: `pendingInstances = 1`, `pendingCountdown = coldProvisionTicks`, event = `'up-cold'`
   - Set `scaleUpCooldown = scaleUpCooldownTicks`
5. **Scale-down**: if `loadPct < scaleDownThr && scaleDownCooldown === 0 && activeInstances > minInst`:
   - `activeInstances--`, optionally refill `warmReserve`, event = `'down'`
   - Set `scaleDownCooldown = scaleDownCooldownTicks`

**Note**: The scale trigger uses `loadPct` (not `cpuPct`) so `io_bound` and `memory_bound` workloads scale correctly — `cpuPct` for `io_bound` only reaches ~50% at full load, which would never cross a 75% threshold.

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

## Simulation store (`src/store/simulationStore.ts`)

- Tick interval: **500 ms**
- Passes `get().nodeMetrics` as `previousMetrics` to `runSimulationTick`
- RPS history: last **40 points** per node
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
| worker_pool backlog crosses 2000 ms | warn | Queue depth included |
| app_server scalingEvent changes | k8s | warm/cold/down message |
| load_balancer scalingEvent fires | k8s | Auto-scale signal |

---

## Adding a new component type

1. Add the string literal to `ComponentType` in `src/types/index.ts`
2. Add a `ComponentDetail` variant with `kind` field if it needs unique per-tick metrics
3. Add `NodeConfig` fields if configurable
4. Add a `ComponentDefinition` entry in `src/constants/components.ts` with icon/color/defaults
5. Create `src/components/canvas/nodes/YourTypeNode.tsx`
6. Create `src/components/inspector/fields/YourTypeFields.tsx`
7. Register the node type in `Canvas.tsx` (`nodeTypes` map)
8. Add the type to `Inspector.tsx` field dispatch switch
9. Add `case 'your_type':` in `SimulationEngine.ts`:
   - Set `rpsOut`
   - Override `load`, `failed`, `errorRate`, `latencyMs` if needed
   - Set `detail` if the type has a `ComponentDetail` variant
   - Add cases in `computeCapacity` and `computeBaseLatency`
10. Thread stateful components by reading `prevNodeMetrics?.detail` and storing state in `detail`
11. Add event generation in `simulationStore.ts` if the type has component-specific failure events

---

## Known gotchas

- **`'use client'`** — any component using hooks, browser APIs, or React Flow must have this directive at the top. Missing it causes Next.js SSR errors.
- **Default exports only** — all components use default exports. Named exports for components break the project convention.
- **CSS import order** — Google Fonts `@import` in `globals.css` must precede `@tailwindcss/postcss`. Reversing breaks font loading.
- **React Flow node registration** — every new `ComponentType` must be added to the `nodeTypes` object in `Canvas.tsx`. Missing registration causes React Flow to render a generic fallback node.
- **`previousMetrics` threading** — stateful components (`app_server`, `pubsub`, `cloud_function`, `worker_pool`, `block_storage`, `rate_limiter`, `service_mesh`) rely on previous-tick `detail`. Always pass `get().nodeMetrics`; never pass `{}`.
- **Traffic pattern sync** — `getTrafficMultiplier` is duplicated in both `SimulationEngine.ts` and `simulationStore.ts`. Changing one requires updating the other.
- **`p99LatencyMs = latencyMs × 2.5`** — fixed multiplier, computed at end of each node's tick.
- **Autoscaling scale trigger uses `loadPct`, not `cpuPct`** — `scaleUpCpuPct`/`scaleDownCpuPct` config fields are compared against `dynamicLoad × 100`, not the displayed `cpuPct`. This is intentional so IO-bound workloads scale correctly.
- **`computeCapacity` vs tick capacity** — `computeCapacity` for `app_server` uses `min(cpuCores, ramGb×0.5) × 300` and ignores `rpsPerInstance`. The tick case uses `rpsPerInstance` if set. These can diverge; the tick value is what actually determines simulation behavior.
- **Service mesh routing deduplication** — `meshRoutes` supports `sourceNodeId` for UI display and dedup logic in the inspector. The simulation engine deduplicates by `destNodeId` only (max weight wins), ignoring `sourceNodeId`. The inspector UI marks lower-weight duplicate rules as "SHADOWED".

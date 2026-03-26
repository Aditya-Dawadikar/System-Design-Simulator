# System Design Simulator — CLAUDE.md

Project-specific instructions for Claude Code. Read this before making any changes.

---

## Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Canvas**: React Flow 11 (`reactflow`)
- **State**: Zustand 5 — two stores (see below)
- **Styling**: Tailwind CSS v4 + JetBrains Mono + CSS variables
- **Language**: TypeScript 5 (strict)
- **No Vite** — despite any older notes, this is a Next.js project

---

## Critical conventions

### Imports & exports
- All interactive components must have `'use client'` at the top
- All components use **default exports** (no named exports for components)
- Path alias `@/` maps to `src/`

### CSS / Tailwind
- `globals.css` must have the Google Fonts `@import` **before** `@tailwindcss/…` — order matters
- Design language: dark terminal/datacenter aesthetic
- CSS variables used throughout: `--bg-base`, `--bg-panel`, `--border`, `--text`, `--text-dim`, `--accent-green`, `--accent-cyan`, `--accent-purple`, `--accent-orange`, `--accent-red`, `--accent-yellow`

### React Flow
- All node types must be registered in `Canvas.tsx`
- Custom edge type is `'wire'` (see `EdgeWire.tsx`)
- Node `type` field equals the `ComponentType` string (e.g. `'app_server'`)

---

## Architecture

### Source layout

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx
│   └── page.tsx                # Root — mounts Canvas + dashboard
├── components/
│   ├── canvas/
│   │   ├── Canvas.tsx          # React Flow canvas, registers all node types
│   │   ├── EdgeWire.tsx        # Custom 'wire' edge
│   │   └── nodes/              # One file per ComponentType
│   ├── inspector/
│   │   ├── Inspector.tsx       # Right-panel config inspector
│   │   └── fields/             # Per-type config field components
│   ├── shared/                 # ArcGauge, Sparkline, StatCell, Badge, etc.
│   ├── sidebar/                # ComponentLibrary drag-source
│   └── simulation/
│       ├── MetricsDashboard.tsx  # Bottom panel: global stats + node cards
│       ├── NodeMetricCard.tsx    # Per-node metric card with detail row
│       ├── SimulationControls.tsx
│       └── EventLog.tsx
├── constants/
│   └── components.ts           # COMPONENT_DEFINITIONS, defaults per type
├── simulation/
│   └── SimulationEngine.ts     # Pure TS tick engine (no React)
├── store/
│   ├── architectureStore.ts    # Zustand — canvas state, persisted to localStorage
│   └── simulationStore.ts      # Zustand — ephemeral simulation state + tick loop
├── templates/
│   └── defaultTemplate.ts      # Pre-built example architecture
└── types/
    └── index.ts                # All shared TypeScript types
```

### Two Zustand stores

| Store | Persistence | Responsibility |
|-------|-------------|----------------|
| `architectureStore` | localStorage | nodes, edges, nodeConfigs, edgeConfigs |
| `simulationStore` | ephemeral | running/tick/metrics/events/history; 500ms tick loop |

---

## Types (`src/types/index.ts`)

### ComponentType
`'cdn' | 'load_balancer' | 'app_server' | 'cache' | 'database' | 'cloud_storage' | 'pubsub' | 'cloud_function' | 'cron_job' | 'worker_pool' | 'comment' | 'traffic_generator'`

### NodeMetrics
Each node gets this shape every tick, plus an optional `detail?: ComponentDetail`.

```ts
interface NodeMetrics {
  rpsIn, rpsOut, load, latencyMs, p99LatencyMs, errorRate, failed
  readRatio, readRpsIn, writeRpsIn   // read/write split propagated from traffic_generator
  readLoad?, writeLoad?              // database only
  detail?: ComponentDetail           // component-specific failure/scaling metrics
}
```

### ComponentDetail (discriminated union, `kind` per type)

| kind | Key fields |
|------|-----------|
| `cdn` | `cacheHitRate`, `originBypassRps`, `bandwidthGbps` |
| `load_balancer` | `activeConnections`, `scalingEvent: boolean`, `connectionsPerSecond` |
| `app_server` | `cpuPct`, `memPct`, `activeInstances`, `pendingInstances`, `pendingCountdown`, `warmReserve`, `scalingEvent: 'up-warm'\|'up-cold'\|'down'\|null`, `scaleUpCooldown`, `scaleDownCooldown` |
| `cache` | `hitRate`, `evictionRate`, `memoryUsedPct` |
| `database` | `connectionPoolUsed`, `connectionPoolMax`, `queryQueueDepth`, `slowQueryRate` |
| `cloud_storage` | `throttledRequests`, `bandwidthUtilization` |
| `pubsub` | `subscriberLagMs` (stateful), `consumerThroughput`, `unackedMessages` |
| `cloud_function` | `coldStarts` (stateful), `throttledInvocations`, `concurrencyUsed` |
| `cron_job` | `overlapCount`, `lastRunDurationMs` |
| `worker_pool` | `queueDepth` (stateful), `workerUtilization`, `taskBacklogMs` |

### NodeConfig
Flat bag of optional fields for all component types. Key autoscaling fields for `app_server`:
- `minInstances`, `maxInstances`, `warmPoolSize`
- `scaleUpCpuPct` (default 75), `scaleDownCpuPct` (default 25)
- `scaleUpCooldownTicks` (default 4), `scaleDownCooldownTicks` (default 12)
- `coldProvisionTicks` (default 6 = 3 s)

---

## Simulation engine (`src/simulation/SimulationEngine.ts`)

Pure TypeScript — no React imports.

### Tick signature
```ts
runSimulationTick(
  topology: Topology,
  incomingRps: number,
  tick = 0,
  previousMetrics: Record<string, NodeMetrics> = {}   // ← required for stateful components
): { nodeMetrics, edgeMetrics }
```

`previousMetrics` **must** be passed from `simulationStore` on every tick so stateful components work correctly.

### Per-type tick functions (inside the main `switch(type)`)

Each component type has a dedicated case that computes `rpsOut`, `detail`, and optionally overrides `load`, `failed`, `latencyMs`, `errorRate`. The variables `load`, `failed`, `errorRate` are all `let` so they can be reassigned inside cases.

**Stateful components** (read previous detail from `prevNodeMetrics`):
- `pubsub` — `subscriberLagMs` accumulates when producers > consumer throughput
- `cloud_function` — `coldStarts` triggered by concurrency growth from prev tick
- `worker_pool` — `queueDepth` accumulates at (rpsIn − capacity) × 0.5 per tick
- `app_server` — **autoscaling FSM** (see below)

### App Server autoscaling FSM

Per tick:
1. Promote pending cold instances if `pendingCountdown` reached 0
2. Decrement cooldown counters
3. Compute `effectiveCap = activeInstances × perInstanceRps`; override `load`
4. Scale-up decision: `cpuPct > scaleUpCpuPct` → warm pool first (instant), else cold (+countdown)
5. Scale-down decision: `cpuPct < scaleDownCpuPct` → decrement activeInstances, refill warm pool
6. All state (instances, countdowns, warmReserve) stored in `detail` and threaded to next tick

### Capacity formulas

| Type | Formula |
|------|---------|
| CDN | `pops × 25,000` |
| Load Balancer | 50,000 fixed |
| App Server | `instances × min(cpuCores, ramGb×0.5) × 300` (static; overridden by autoscaling FSM) |
| Cache | 100,000 fixed |
| Database | `shards × rpsPerShard + readReplicas × rpsPerShard` |
| Cloud Storage | `(throughputMbps × 1000/8) / objectSizeKb` |
| Pub/Sub | `partitions × 5,000` |
| Cloud Function | `maxConcurrency × (1000/execMs) × sqrt(memMb/256)` |
| Worker Pool | `workerCount × threadCount × (1000/taskDurationMs)` |

### Read/write ratio propagation
- `traffic_generator` seeds `readRatio = readRatioPct / 100`
- Each downstream node receives a weighted average read ratio from its upstream edges
- `cdn` and `cache` apply read-specific hit-rate logic to read traffic only

---

## Simulation store (`src/store/simulationStore.ts`)

- Tick interval: **500ms**
- Passes `get().nodeMetrics` as `previousMetrics` to `runSimulationTick`
- Keeps last **40 points** of RPS history per node
- Generates log events: generic (overload/recovery/75%-warn) + component-specific:
  - `pubsub`: subscriber lag > 2 s
  - `cloud_function`: cold starts, throttling
  - `database`: connection pool exhausted
  - `worker_pool`: task backlog > 2 s
  - `app_server`: scale events (warm/cold/down) at `k8s` log level
  - `load_balancer`: auto-scale signal

---

## Adding a new component type

1. Add the string literal to `ComponentType` in `types/index.ts`
2. Add a `ComponentDetail` variant if it has unique metrics
3. Add NodeConfig fields if configurable
4. Add a `ComponentDefinition` entry in `constants/components.ts` with icon/color/defaults
5. Create `src/components/canvas/nodes/YourTypeNode.tsx`
6. Create `src/components/inspector/fields/YourTypeFields.tsx`
7. Register the node type in `Canvas.tsx`
8. Add the type to `Inspector.tsx` field dispatch
9. Add a `case 'your_type':` in the `switch(type)` in `SimulationEngine.ts`
10. Handle `computeCapacity` and `computeBaseLatency` for the new type

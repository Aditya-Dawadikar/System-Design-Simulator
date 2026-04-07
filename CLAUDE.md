# System Design Simulator — CLAUDE.md

Project-specific instructions for Claude Code. Read this before making any changes.

---

## Stack

| Package | Version |
|---------|---------|
| Next.js | ^16.2.1 | React | ^19.2.4 | reactflow | ^11.11.4 | zustand | ^5.0.12 |
| recharts | ^3.8.0 | lucide-react | ^1.0.1 | Tailwind CSS | ^4.2.2 | TypeScript | ^5.9.3 |
| zod | ^4.3.6 | js-yaml | ^4.1.1 |

**No Vite** — Next.js project. Dev server: `npm run dev`.

---

## Critical conventions

- All interactive components: `'use client'` at top; **default exports only**; `@/` → `src/`
- `globals.css`: Google Fonts `@import` **before** `@tailwindcss/…` — order matters
- Design: dark terminal/datacenter. CSS vars: `--bg-base`, `--bg-panel`, `--border`, `--text`, `--text-dim`, `--accent-green/cyan/purple/orange/red/yellow`
- React Flow: all node types registered in `Canvas.tsx`; custom edge `'wire'`; `type` = `ComponentType` string; region/zone nodes: `zIndex: -2/-1`, `connectable: false`

---

## Source layout

```
src/
├── app/layout.tsx | page.tsx | simulator/page.tsx
├── components/
│   ├── canvas/Canvas.tsx | EdgeWire.tsx | nodes/   (one file per ComponentType)
│   ├── inspector/Inspector.tsx | fields/EdgeInspector.tsx | fields/
│   ├── iac/IacEditorDrawer.tsx
│   ├── shared/   (ArcGauge, Sparkline, StatCell, Badge, NodeLocationBadge…)
│   └── simulation/MetricsDashboard.tsx | NodeMetricCard.tsx | LatencyPercentileChart.tsx
│                  SimulationControls.tsx | EventLog.tsx | ScenarioDocsDrawer.tsx
├── constants/components.ts          # COMPONENT_DEFINITIONS + capacity constants
├── simulation/SimulationEngine.ts   # Pure TS tick engine (no React)
├── store/architectureStore.ts | simulationStore.ts
├── iac/schema.ts | parser.ts | validate.ts | normalize.ts | toTopology.ts | fromTopology.ts
│       starters.ts | examples/(three-tier|multi-az|event-driven|multi-service).yaml
├── templates/defaultTemplate.ts | architectures.ts | scenarios.ts
├── tests/features/iac/canvas-iac-sync.test.ts | service-deployment.test.ts
└── types/index.ts
```

---

## Two Zustand stores

| Store | Persistence | Responsibility |
|-------|-------------|----------------|
| `architectureStore` | localStorage | nodes, edges, nodeConfigs, edgeConfigs, **serviceGroups** |
| `simulationStore` | ephemeral | running/tick/metrics/events/history/latencyHistory; 500 ms tick |

**simulationStore:** `tick` (500 ms), `history` (last 40 rpsIn/node), `latencyHistory` (last 40 ms/node), `events` (last 100).

**serviceGroups:** `Record<string, { id, type: ComponentType, label, nodeIds[], healingEnabled? }>` — keyed by group id.

**Config propagation:** `updateNodeConfig` auto-propagates all fields except `PROPAGATION_SKIP = { zoneId, regionId, dbRole, primaryNodeId }` to every sibling in the group.

---

## Component types & scope

`ComponentScope = 'global' | 'regional' | 'zonal'`. Inspector shows: zonal → AZ dropdown (`zoneId`); regional → Region dropdown (`regionId`); global → hidden.

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

All optional. Flat bag shared across types.

```ts
label?: string; zoneId?: string; regionId?: string
// Region: regionName?, regionFailed?, containerWidth(900), containerHeight(560)
// AZ: zoneName?, zoneFailed?, containerWidth(380), containerHeight(440)
// CDN: pops(2), cacheablePct(60), bandwidthGbps(100)
// LB: algorithm('round_robin'|'least_conn'|'ip_hash'|'random'|'weighted'), healthChecks(true), maxConnections(100000)
// API GW: gatewayRoutes?, gatewayAuthEnabled(false), gatewayAuthOverheadMs(5), gatewayCacheEnabled(false), gatewayCacheHitPct(30)
// App Server: instances(1), cpuCores(4), ramGb(8), rpsPerInstance(500), avgLatencyMs(40), workloadType('io_bound'|'cpu_bound'|'memory_bound')
// Autoscaling: autoscalingEnabled(false), autoscalingStrategy('threshold'|'target_tracking'|'scheduled'|'predictive')
//   warmPoolEnabled(false), minInstances, maxInstances, warmPoolSize
//   scaleUpCpuPct(75), scaleDownCpuPct(25), scaleUpCooldownTicks(4), scaleDownCooldownTicks(12)
//   coldProvisionTicks(6), scaleDownDrainTicks(4)
//   targetMetric('load'|'cpu'|'rps_per_instance'), targetValue(70)
//   ttScaleOutCooldownTicks(4), ttScaleInCooldownTicks(24)
//   scheduledActions?: { id, atTick, intervalTicks?, desiredInstances?, minInstances?, maxInstances? }[]
//   predictiveLookbackTicks(20), predictiveLookaheadTicks(10), predictiveScalingBuffer(20)
// Cache: memoryGb(8), ttlSeconds(60), evictionPolicy('lru'|'lfu'|'noeviction'), clusterMode?
// DB: engine('PostgreSQL'|'MySQL'|'MongoDB'|'Redis'|'Cassandra'), storageGb(100), readReplicas(0),
//   shards(1), rpsPerShard(800), maxConnections(200), dbRole('standalone'|'primary'|'replica'), primaryNodeId?
// Cloud Storage: storageThroughputMbps(1000), objectSizeKb(512), storageClass('standard'|'nearline'|'coldline'|'archive'), storageGb?
// Block Storage: diskType('nvme'|'ssd'|'hdd'), iops(3000), objectSizeKb(64)
// Network Storage: nfsProtocol('nfs'|'smb'|'cephfs'), storageThroughputMbps(500), connectionLimit(100), objectSizeKb(64)
// Pub/Sub: partitions(4), messageRetentionHours(24), maxMessageSizeKb(10)
// Cloud Function: functionMemoryMb(256), maxConcurrency(100), avgExecutionMs(200)
// Cron Job: intervalMinutes(5), tasksPerRun(100)
// Worker Pool: workerCount(4), threadCount(4), taskDurationMs(500)
// Traffic Gen: generatorRps(1000), generatorPattern('steady'), readRatioPct(50), badTrafficPct(0)
// Rate Limiter: rateLimitAlgorithm('token_bucket'|'leaky_bucket'|'fixed_window'|'sliding_window'|'sliding_log')
//   requestsPerSecond(1000), burstCapacity(200), windowSizeMs(1000), maxQueueSize(500)
// Service Mesh: mtlsEnabled?, observabilityLevel('basic'), proxyOverheadMs(2), meshRetryCount(1)
//   meshCircuitBreakerEnabled(false), meshCircuitBreakerThreshold(50)
//   meshRoutes?: { id, sourceNodeId, destNodeId, weightPct }[]
// Global Accel: routingPolicy('latency'|'geo'|'weighted'), failoverEnabled?
// NAT GW: natBandwidthGbps(10), maxConnections(55000)
// Firewall: firewallRules(10), firewallInspectionMode('basic'|'deep'), firewallBlockRatePct(0)
// Subnet: subnetCidr?; Comment: commentBody?
```

## EdgeConfig fields

```ts
protocol: 'REST'|'gRPC'|'TCP'|'WebSocket'  // default REST
timeoutMs: 5000; retryCount: 2; circuitBreaker: false; circuitBreakerThreshold: 50
bandwidthMbps: 0  // 0 = unlimited
splitPct?: number; readSplitPct?: number; writeSplitPct?: number
```

---

## NodeMetrics & ComponentDetail

```ts
interface NodeMetrics {
  rpsIn, rpsOut, load, latencyMs, p99LatencyMs  // p99 = latencyMs × 2.5
  errorRate, failed  // failed = load > 1.05
  readRatio, readRpsIn, writeRpsIn, badRatio, badRpsIn
  readLoad?, writeLoad?  // database only
  detail?: ComponentDetail
}
```

ComponentDetail discriminated union by `kind`:

| `kind` | Key fields |
|--------|-----------|
| `cdn` | cacheHitRate, originBypassRps, bandwidthGbps |
| `load_balancer` | activeConnections, scalingEvent, failedTargets, availableZones, totalZones |
| `app_server` | cpuPct, memPct, activeInstances, pendingInstances/Countdown, drainingInstances/Countdown, warmReserve, pendingWarmInstances/Countdown, scalingEvent, cooldowns, projectedRps?, desiredInstances? |
| `cache` | hitRate, evictionRate, memoryUsedPct |
| `database` | connectionPoolUsed/Max, queryQueueDepth, slowQueryRate, replicationLagMs, writeRejectedRps?, writeRoutingLatency? |
| `cloud_storage` | throttledRequests, bandwidthUtilization |
| `block_storage` | iopsUsed, iopsLimit, queueDepth, throughputMbps |
| `network_storage` | activeConnections, bandwidthUsedMbps, throughputLimitMbps |
| `pubsub` | subscriberLagMs, consumerThroughput, unackedMessages |
| `cloud_function` | coldStarts, throttledInvocations, concurrencyUsed |
| `cron_job` | overlapCount, lastRunDurationMs |
| `worker_pool` | queueDepth, workerUtilization, taskBacklogMs |
| `rate_limiter` | allowedRps, throttledRps, throttleRate, queueDepth |
| `service_mesh` | activeConnections, mtlsHandshakeRate, circuitBroken, retryRate |
| `global_accelerator` | activeRegions, failedRegions, reroutedRps |
| `api_gateway` | activeRoutes, routedRps, throttledRps, cacheHitRate |
| `nat_gateway` | translatedConnections, bandwidthUtilizationPct, droppedPackets |
| `firewall` | allowedRps, blockedRps, autoDetectedRps, manualBlockedRps, detectionEfficiency |

---

## SimulationEngine contract

`runSimulationTick(topology, incomingRps, tick=0, previousMetrics={}, nodeHistory={})` → `{ nodeMetrics, edgeMetrics }`

**Processing order:**
1. `buildAdjacency` — downstream/upstream maps + cycle detection (WHITE/GRAY/BLACK DFS)
2. `topoSort` — Kahn's BFS
3. Resolve service mesh routing → `resolvedEdgeConfigs` (dedup by max weight per `destNodeId`)
4. Resolve API gateway routing → same `resolvedEdgeConfigs`
5. Pre-compute effectively failed regions (`regionFailed=true` OR all AZs failed)
6. Health-aware redistribution: LB = equal split among healthy; GA = zone-count-weighted
7. BFS traversal computing per-node metrics
8. Build `nodeZoneIdMap`/`nodeRegionIdMap`
9. Edge metrics: cross-AZ +2 ms, cross-region +75 ms; `isBottleneck = load > 0.9`

**RPS sources:** `traffic_generator` uses `generatorRps × multiplier`; `cron_job` = `tasksPerRun/(intervalMinutes×60)`; no-upstream nodes get `incomingRps`; others sum upstream × `splitPct`.

**Failure injection (before type switch, except region/AZ/comment):** zone `zoneFailed` → `{rpsOut:0, load:2, errorRate:1, failed:true}`; same for effectively-failed regions.

**Core formulas:**
```ts
load = rpsIn / capacity; failed = load > 1.05
errorRate = computeErrorRate(load)  // 0 at <0.9, ramps to 1.0 at ≥1.2
dropRate = min(1, (load-1.0)*0.8)  // only when load > 1.0
baseLatency = computeBaseLatency(type, config)
queueingFactor = Math.pow(Math.min(load, 2.0), 2) * 200
latencyMs = baseLatency + queueingFactor  // + per-type additions
p99LatencyMs = latencyMs * 2.5
```

**Downstream IO wait** (app_server, cloud_function, worker_pool): prev-tick latency of downstream stores × ioFraction (cache=0.2, others=0.5).

---

## Capacity formulas & Base latencies

| Type | Capacity | Base latency (ms) |
|------|---------|-------------------|
| CDN | `pops × 25000` | 5 |
| Load Balancer | 50000 | 2 |
| API Gateway | 50000 | 5 (+authOverhead when enabled) |
| App Server | `instances × min(cpuCores, ramGb×0.5) × 300` (computeCapacity); tick uses `rpsPerInstance` | 40 (or `avgLatencyMs`) |
| Cache | 100000 | 1 |
| Database (standalone) | `(shards + readReplicas) × rpsPerShard` | 10 |
| Database (primary) | `shards × rpsPerShard` | 10 |
| Database (replica) | `shards × rpsPerShard` | 10 |
| Cloud Storage | `throughputMbps×125 / objectSizeKb` | 20 (nearline=50, coldline=100, archive=500) |
| Block Storage | `iops` | 1 (nvme=0.2, ssd=1, hdd=5) |
| Network Storage | `throughputMbps×125 / ioSizeKb` | 5 (nfs=5, smb=8, cephfs=3) |
| Pub/Sub | `partitions × 5000` | 5 |
| Cloud Function | `maxConcurrency × (1000/execMs) × sqrt(memMb/256)` | 200 (or `avgExecutionMs`) |
| Cron Job | ∞ | 0 |
| Worker Pool | `workerCount × threadCount × (1000/taskDurationMs)` | 0 (`taskDurationMs`) |
| Traffic Generator | ∞ | 0 |
| Rate Limiter | `requestsPerSecond` | 1 |
| Service Mesh | 100000 | 2 (`proxyOverheadMs`) |
| Global Accelerator | 500000 | 5 |
| NAT Gateway | `natBandwidthGbps × 5000` | 3 |
| Firewall | `rules × (deep?500:1000)` | 2 (deep=10) |
| Region / AZ / Subnets | ∞ (pass-through) | 0 |

---

## Per-component tick behavior

- **CDN**: hitRate = `(cacheablePct/100) × max(0.4, 1−degradation)`; reads absorbed by hits; `rpsOut = non-hit reads + writes − drops`
- **LB**: `activeConnections ≈ rpsIn × 0.05` capped at maxConnections; `scalingEvent = load > 0.75`; health-aware redistribution
- **API GW**: caching (reads only when enabled), auth overhead, routes resolved pre-BFS step 4
- **App Server static**: `effectiveCap = instances × perInstRps × ioScale`; IO wait from downstream
- **App Server autoscaling FSM** — state threaded via `prevD`: `activeInstances`, `pendingInstances/Countdown`, `drainingInstances/Countdown`, `warmReserve`, `pendingWarmInstances/Countdown`, `scaleUp/DownCooldown`. Each tick: promote cold → complete drain → replenish warm → decrement cooldowns → compute load. `provisionDelta`: warm pool first (instant), then cold (countdown). `startDrain(n)`: active→draining + countdown. Strategies: `threshold` (loadPct vs thresholds), `target_tracking` (desired = f(targetMetric)), `scheduled` (atTick/intervalTicks, scale-down **instant**), `predictive` (linReg over nodeHistory, proactive scale-out). Scale trigger = `loadPct` not `cpuPct`.
- **Cache**: hitRate scales with memoryGb (up to 85%); eviction degrades hit above 80% memory
- **Database**: standalone = separate read/write load, `load = max(readLoad, writeLoad)`; primary = no virtual replicas; replica = routes writes to primary (+2ms/+75ms), rejects if primary failed; lag = `max(0, (primaryWriteLoad-0.3)/0.7 × 500)` ms
- **Cloud Storage**: ~10% RPS emitted downstream as event notifications
- **Block Storage**: stateful `queueDepth` += `(rpsIn - iopsLimit) × 0.5`; queue adds up to 1000 ms
- **Network Storage**: `activeConnections ≈ ceil(rpsIn/10)` capped; ≥90% saturation → +50ms×util
- **Pub/Sub**: stateful `subscriberLagMs` += `((rpsIn-capacity)/capacity) × 500`
- **Cloud Function**: IO wait inflates execMs; stateful `coldStarts ≈ max(0, concurrencyDelta) × 0.8`; up to +400 ms
- **Cron Job**: `rpsIn = tasksPerRun/(intervalMinutes×60)`; pure emitter
- **Worker Pool**: stateful `queueDepth`; IO wait inflates taskMs; backlog up to 5000 ms
- **Rate Limiter**: token_bucket/leaky_bucket = stateful queue; fixed_window (×1.5 cap)/sliding_window (×1.2)/sliding_log — drop excess immediately; `rpsOut` hard-capped at `requestsPerSecond`
- **Service Mesh**: `latencyMs = proxyOverheadMs×2 + obsOverhead + mtls(~1ms)`; circuit breaker on downstream errorRate → `rpsOut = 5%`, `errorRate = 0.95`; retries amplify RPS
- **Firewall**: `detectionEff = min(1, rules × (deep?0.05:0.04))`; scrubs `badRatio×detectionEff`; `badRatioOut = 0`
- **Global Accel**: zone-count-weighted proportional routing; failed regions weight 0
- **NAT GW**: `translatedConnections ≈ rpsIn × 0.1` capped at maxConnections; drops when over capacity
- **Region/AZ/Subnets**: pass-through (`load=0, failed=false, rpsOut=rpsIn`)

**Global error rate** (not weighted avg):
```
min(1, Σ(rpsIn × errorRate)) / Σ(rpsOut of SOURCE_TYPES)
```
Falls back to weighted avg when no source nodes. Adding a source type → update `SOURCE_TYPES` in `MetricsDashboard.tsx`.

---

## Traffic patterns (duplicated in SimulationEngine.ts + simulationStore.ts — keep in sync)

| Pattern | Multiplier |
|---------|-----------|
| `steady` | 1.0 |
| `ramp` | `min(1 + (tick/60)×0.6, 1.6)` |
| `spike` | 3.5 ticks 0–4 of each 30-tick cycle, 0.35 otherwise |
| `wave` | `0.5 + 0.5×sin(tick/20×2π)` |
| `chaos` | `0.3 + random×1.4` |

**Latency percentile multipliers** (p99 = ×2.5): p50=×0.72, p75=×1.00, p90=×1.50, p95=×2.00, p99=×2.50.

Cross-zone latency: +2 ms. Cross-region: +75 ms.

---

## Adding a new component type

1. Add string literal to `ComponentType` in `src/types/index.ts`
2. Add `ComponentDetail` variant with `kind` field (if needed)
3. Add `NodeConfig` fields (if configurable)
4. Add `ComponentDefinition` in `src/constants/components.ts` with icon/color/defaults/**scope**
5. Create `src/components/canvas/nodes/YourTypeNode.tsx` — render `NodeLocationBadge` before bottom Handle
6. Create `src/components/inspector/fields/YourTypeFields.tsx`
7. Register in `Canvas.tsx` `nodeTypes` map
8. Add to `Inspector.tsx` field dispatch switch
9. Add `case 'your_type':` in `SimulationEngine.ts`: add to `BASE_LATENCY`, `computeCapacity`; set `rpsOut`, override `load`/`failed`/`errorRate`/`latencyMs`; set `detail`
10. Thread stateful components via `prevNodeMetrics?.detail`
11. Add events in `simulationStore.ts` if needed
12. Decide exclusion from `SKIP_ERROR_TYPES`/`NO_LATENCY_TYPES` in `MetricsDashboard.tsx`

---

## Known gotchas

- **`'use client'`** — missing causes Next.js SSR errors on any hook/browser API/React Flow component
- **Default exports only** — named component exports break convention
- **CSS import order** — Google Fonts `@import` must precede `@tailwindcss/postcss`
- **React Flow registration** — every `ComponentType` must be in `Canvas.tsx` `nodeTypes`
- **`previousMetrics` / `nodeHistory` threading** — always pass `get().nodeMetrics` / `get().history`; never `{}`
- **Traffic pattern sync** — `getTrafficMultiplier` duplicated in Engine + store; change both
- **`p99LatencyMs = latencyMs × 2.5`** — fixed multiplier at end of each node's tick
- **Autoscaling uses `loadPct` not `cpuPct`** — `scaleUpCpuPct`/`scaleDownCpuPct` compared vs `dynamicLoad × 100`
- **`computeCapacity` vs tick capacity** — app_server: computeCapacity ignores `rpsPerInstance`; tick uses it. Can diverge.
- **Scale-down deferred via `startDrain`** — except scheduled (instant)
- **Warm pool auto-replenishes** after consumption via `pendingWarmInstances`/`warmPendingCountdown`
- **Gateway/mesh route deduplication** — by `destNodeId` (max weight wins); mesh inspector marks lower-weight as "SHADOWED"
- **Zone/region membership** — stored in `nodeConfig.zoneId`/`regionId`, NOT React Flow `parentNode`
- **`NodeLocationBadge`** — do NOT add to Region, AZ, PublicSubnet, PrivateSubnet nodes
- **`scope` required** — every new `ComponentDefinition` must include it
- **Pre-BFS order** — mesh (step 3) → gateway (step 4) → health-redistribution (step 6); later steps overwrite earlier `splitPct`
- **`dbRole` defaults `'standalone'`**; `readReplicas` only meaningful for standalone; replica needs `primaryNodeId` for write routing

---

## Phase 2 — IaC YAML Authoring (`src/iac/`)

YAML DSL (v1) for defining full topologies. Not real cloud provisioning.

**Core workflow:** open drawer → write/paste YAML → validate → Apply (atomic, only on success) → simulation runs; Export writes canvas back to YAML; canvas auto-syncs to editor (debounced 300 ms).

**Two authoring styles:**
- **Classic**: flat `resources[]` with explicit IDs, `placement.zone/region`, `spec`/`deploy` fields
- **K8s-style**: `services[]` + `deployments[]`; IDs auto-generated as `{serviceId}-{zoneId}`; `dependencies[]` → edges

**Compiler pipeline:** `parser.ts → validate.ts → normalize.ts → toTopology.ts → architectureStore.loadTopology()`

Export: `fromTopology.ts` → clean YAML. All pipeline modules are **pure functions** (no React/store imports).

### YAML → simulator mapping (key mappings)

| YAML | Maps to |
|------|---------|
| `resources[]` | React Flow nodes (explicit IDs) |
| `services[]` + `deployments[]` | Expanded nodes: `{serviceId}-{zoneId}`; recorded in `serviceGroups` |
| `connections[]` | React Flow edges |
| `regions[].id` / `.zones[].id` | region/AZ node IDs; also used for regionId/zoneId lookups |
| `placement.zone/region` | `nodeConfig.zoneId/regionId` |
| `spec.*` / `deploy.*` | flat `NodeConfig` fields |
| `deploy.autoscaling.*` | spread to flat autoscaling fields in `toTopology.ts` |
| `dependencies[].service` | inferred edges between service nodes |
| `deployments[].zones[]` | one node per zone; DB: first = primary |
| `deployments[].replicas[]` | `dbRole:'replica'` + `primaryNodeId` |
| `globals.peakRps/trafficPattern` | simulation defaults |

### toTopology.ts / fromTopology.ts

**toTopology:** for each deployment zone → create node `{serviceId}-{zoneId}`; DB first zone = primary, replicas[] = replica + primaryNodeId; all nodes → ServiceGroup; dependencies[] → edges with readSplitPct/writeSplitPct.

**fromTopology:** build `nodeToService` reverse map; exclude service-member nodes from `resources[]`; strip `dbRole/primaryNodeId/healingEnabled` from canonical spec; classify replicas → `deployment.replicas[]`; infer `dependencies[]` from inter-service edges (excluded from `connections[]`).

### Starter templates

| Constant | Description |
|---|---|
| `THREE_TIER_STARTER` | Classic multi-AZ three-tier (toolbar: `STARTER`) |
| `SERVICE_DEPLOYMENT_STARTER` | K8s-style checkout platform, 5 services/2 AZs (toolbar: `SVC+DEPLOY`) |
| `SERVICE_DEPLOYMENT_ACTIVE_ACTIVE_STARTER` | Multi-region active-active, CDN + Global Accelerator |

### Validation rules

Errors block apply; warnings are advisory.

| Rule | Severity |
|---|---|
| Missing `version`; duplicate `id`; unknown `type`; self-referencing connection | error |
| `connections[].from/to` / `placement.zone/region` / `dependencies[].service` / `deployments[].service/zones[]` references unknown ID | error |
| Regional resource missing `placement.region`; zonal missing `placement.zone`; global with placement | error |
| Invalid enum value | error |
| Unsupported field for type | warning |

### UI requirements

- Drawer (not modal); toolbar: `STARTER | SVC+DEPLOY | VALIDATE | APPLY | EXPORT`
- `APPLY` disabled with validation errors; atomic only — never partial mutation
- `ServicePropagationNotice` in Inspector between location and type fields for service-group nodes
- `NodeHeader` shows `⊕ {serviceId}` badge + replica count + `✦ healing` badge

### IaC-specific gotchas

- **Atomic apply only** — build full topology, validate, then single `loadTopology` call
- **`regions[]` auto-creates nodes** — don't also list them in `resources[]`
- **Service node IDs** = `{serviceId}-{zoneId}`; `connections[]` use node IDs; `dependencies[]` use service IDs
- **`deploy` vs `spec`** — deploy for compute (app_server/worker_pool/cloud_function); spec for rest; both → same NodeConfig
- **`dbRole`/`primaryNodeId` not in global `SKIP_FIELDS`** — stripped inside `buildServicesAndDeployments`, not globally
- **Export omits defaults** — keeps YAML minimal/diff-friendly
- **Round-trip stability** — import → export → re-import must produce identical topology (covered by tests)
- **`serviceGroups` must be passed to `fromTopology`** — from both `simulator/page.tsx` auto-sync and `IacEditorDrawer.tsx` export; missing → falls back to classic `resources[]`
- **`removeNode` cleans service groups** — removes node from group; removes group if empty
- **`PROPAGATION_SKIP` is exhaustive** — only zoneId/regionId/dbRole/primaryNodeId; all other fields propagate

### Test suite (`service-deployment.test.ts`) — 75 tests, 10 suites

toTopology (node IDs, serviceGroups, nodeConfig, db primary/replica, dependency edges) · fromTopology reconstruction · config propagation · validateDocument (service rules, deployment rules) · multi-service.yaml end-to-end round-trip

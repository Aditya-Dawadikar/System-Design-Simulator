# Simulator Logic Deep Dive

This document explains how one simulation tick is computed in the project, including:

- RPS computation per tick
- Graph storage (adjacency maps)
- Traffic propagation and downstream impact
- Stateful component behavior
- Data structures and algorithms used

The goal is interview readiness: understand both system behavior and algorithmic design choices.

---

## 1) Entry Point and Tick Contract

The core engine is a pure TypeScript function:

```ts
runSimulationTick(topology, incomingRps, tick, previousMetrics)
```

Inputs:

- `topology`
  - `nodes: Node[]`
  - `edges: Edge[]`
  - `nodeConfigs: Record<string, NodeConfig>`
  - `edgeConfigs: Record<string, EdgeConfig>`
- `incomingRps: number`: global RPS after global traffic pattern multiplier
- `tick: number`: discrete simulation step (500 ms in store loop)
- `previousMetrics: Record<string, NodeMetrics>`: previous tick state for stateful behavior

Outputs:

- `nodeMetrics: Record<string, NodeMetrics>`
- `edgeMetrics: Record<string, EdgeMetrics>`

Store-level timing:

- A timer fires every 500 ms.
- `currentRps = peakRps * getTrafficMultiplier(pattern, tick)` is computed in the store.
- That `currentRps` is passed as `incomingRps` into the engine.

---

## 2) RPS Per Tick: How It Is Actually Computed

There are two layers of traffic shaping.

### 2.1 Global pattern in store

At tick `t`, store computes:

```text
incomingRps(t) = peakRps * globalMultiplier(pattern, t)
```

Pattern multipliers:

- `steady`: `1.0`
- `ramp`: `min(1 + (t / 60) * 0.6, 1.6)`
- `spike`: `3.5` for first 5 ticks in each 30-tick cycle, else `0.35`
- `wave`: `0.5 + 0.5 * sin((t / 20) * 2pi)`
- `chaos`: `0.3 + rand() * 1.4`

Given 500 ms per tick:

- 30 ticks = 15 seconds
- 60 ticks = 30 seconds

### 2.2 Per-node source rules in engine

For each node in topological order:

1. `cron_job`: ignores global incoming RPS.

```text
rpsIn = tasksPerRun / (intervalMinutes * 60)
```

2. `traffic_generator`: uses its own local generator config.

```text
rpsIn = generatorRps * localMultiplier(generatorPattern, tick)
```

3. Any other source node (in-degree 0):

```text
rpsIn = incomingRps
```

4. Any non-source node:

```text
rpsIn = sum(upstream contribution shares)
```

So "RPS per tick" is a combination of:

- global pattern (store)
- local source behavior (engine)
- graph-based downstream splitting (engine)

Pseudocode:

```text
function resolveNodeInputRps(node, tick, incomingRps):
   if node.type == cron_job:
      return tasksPerRun / (intervalMinutes * 60)

   if node.type == traffic_generator:
      return generatorRps * trafficMultiplier(generatorPattern, tick)

   if inDegree(node) == 0:
      return incomingRps

   total = 0
   for each upstream u of node:
      total += share(u -> node)
   return total
```

---

## 3) Graph Storage: Adjacency Maps and Supporting Indexes

The engine builds an `AdjacencyMap`:

- `downstream: Map<string, string[]>` (source -> list of targets)
- `upstream: Map<string, string[]>` (target -> list of sources)
- `edgeKey: Map<string, string>` where key is `"source|target"`, value is edge ID

Why each one exists:

- `downstream` supports traversal and edge share computation.
- `upstream` supports inbound RPS aggregation for each node.
- `edgeKey` gives O(1)-style lookup from node pair to edge config/ID.

Note on parallel edges:

- `edgeKey` stores one edge ID per `source|target` key.
- If multiple edges exist between the same pair, last write wins for that key.

---

## 4) Cycle Handling and DAG Processing

### 4.1 Cycle detection

Algorithm:

- DFS with 3-color marking:
  - WHITE (unvisited)
  - GRAY (in current recursion stack)
  - BLACK (done)
- Encountering edge to GRAY means a back edge (cycle).
- That edge ID is added to `cyclingEdgeIds` and effectively ignored later.

This does not fail the simulation. It degrades gracefully by skipping cyclic edges.

Pseudocode:

```text
WHITE = 0, GRAY = 1, BLACK = 2
color[node] = WHITE for all nodes
cyclingEdgeIds = {}

function dfs(u):
   color[u] = GRAY
   for each v in downstream[u]:
      if color[v] == GRAY:
         cyclingEdgeIds.add(edgeId(u, v))
      else if color[v] == WHITE:
         dfs(v)
   color[u] = BLACK

for each node n:
   if color[n] == WHITE:
      dfs(n)
```

### 4.2 Topological order

Algorithm:

- Kahn BFS topological sort, ignoring edges in `cyclingEdgeIds`.
- Compute in-degree map.
- Push all zero in-degree nodes into queue.
- Pop, append to order, decrement neighbors.

Result:

- `order: Node[]` for deterministic forward simulation.
- `sourceNodes: Node[]` for source semantics.

Pseudocode:

```text
inDegree[n] = 0 for all nodes
for each edge (u -> v):
   if edge not in cyclingEdgeIds:
      inDegree[v] += 1

queue = all n where inDegree[n] == 0
order = []

while queue not empty:
   u = pop_front(queue)
   order.push(u)
   for each v in downstream[u]:
      inDegree[v] -= 1
      if inDegree[v] == 0:
         queue.push(v)
```

---

## 5) RPS Propagation Through Edges (Split Algorithm)

For each target node, each upstream contributes a share.

For an upstream source S with total output `sourceOut`:

1. Collect all non-cyclic downstream edges from S.
2. Sum explicit `splitPct` values.
3. Remaining percentage is equally divided among edges with undefined `splitPct`.
4. Contribution to target T:

```text
share(S -> T) = sourceOut * pct(S -> T) / 100
```

The target `rpsIn` is:

```text
rpsIn(T) = sum over all upstream S of share(S -> T)
```

Read ratio is propagated with weighted averaging:

```text
readRpsIn(T) = sum(share * readRatioOut(upstream))
readRatio(T) = readRpsIn(T) / rpsIn(T)
```

Pseudocode:

```text
function edgeShare(source, target, sourceOut):
   outgoing = downstream[source] excluding cyclic edges
   definedTotal = sum(splitPct(e) for e in outgoing where splitPct defined)
   undefinedCount = count(e in outgoing where splitPct undefined)
   rem = max(0, 100 - definedTotal)
   defaultPct = (undefinedCount > 0) ? rem / undefinedCount : 0

   pct = splitPct(source -> target) if defined else defaultPct
   return sourceOut * pct / 100

function aggregateInput(target):
   rpsIn = 0
   readIn = 0
   for each upstream u of target:
      s = edgeShare(u, target, rpsOut[u])
      rpsIn += s
      readIn += s * readRatioOut[u]
   readRatio = (rpsIn > 0) ? readIn / rpsIn : 0.5
   return (rpsIn, readRatio)
```

---

## 6) Service Mesh Route Overrides Before Traversal

Before main traversal, service mesh routes are materialized into `resolvedEdgeConfigs`.

For each `service_mesh` node:

1. Read `meshRoutes`.
2. Deduplicate by destination node ID, keeping max weight.
3. Normalize kept weights to 100%.
4. Write normalized values into edge `splitPct` for matching downstream edges.

Effect:

- Later `computeEdgeShare` uses these updated split percentages.
- Traffic routing policy becomes data-driven by mesh config.

Pseudocode:

```text
resolvedEdgeConfigs = clone(edgeConfigs)

for each node m where m.type == service_mesh:
   routes = meshRoutes(m)
   if routes is empty: continue

   // dedupe by destination, keep highest weight
   maxWeightByDest = {}
   for each route r in routes:
      maxWeightByDest[r.dest] = max(maxWeightByDest[r.dest], r.weight)

   total = sum(maxWeightByDest.values)
   if total == 0: continue

   for each downstream dest of m:
      if dest in maxWeightByDest:
         pct = 100 * maxWeightByDest[dest] / total
         resolvedEdgeConfigs[edgeId(m, dest)].splitPct = pct
```

---

## 7) Per-Node Core Math (Common Skeleton)

For each node:

1. Determine `rpsIn`, `readRatio`, `readRpsIn`, `writeRpsIn`.
2. Compute `capacity` using type-specific formula.
3. Compute `load`:
   - Most nodes: `load = rpsIn / capacity`
   - Database: `load = max(readLoad, writeLoad)` using separate capacities
4. Initial failure and errors:

```text
failed = load > 1.05
errorRate(load):
  0                  if load < 0.9
  linear 0..1        if 0.9 <= load < 1.2
  1                  if load >= 1.2
```

5. Base latency + queueing:

```text
latencyMs = baseLatency + (min(load,2)^2) * 200
p99LatencyMs = latencyMs * 2.5
```

6. Run per-type switch to override:

- `rpsOut`
- optionally `load`, `failed`, `errorRate`, `latencyMs`
- optional `detail` object with component-specific state/metrics

7. Save into maps:

- `nodeMetrics[nodeId]`
- `rpsOutMap[nodeId]`
- `readRatioOutMap[nodeId]`

Pseudocode:

```text
for each node n in topologicalOrder:
   (rpsIn, readRatio) = resolveInput(n)
   readIn = rpsIn * readRatio
   writeIn = rpsIn * (1 - readRatio)

   cap = capacity(n.type, config[n])
   load = computeLoad(n.type, rpsIn, readIn, writeIn, cap)

   failed = (load > 1.05)
   errorRate = errorCurve(load)
   latency = baseLatency(n) + queuePenalty(load)

   if zoneFailed(n):
      emit forced-fail metrics for n
      continue

   (rpsOut, load, failed, errorRate, latency, detail, readRatioOut) =
      applyTypeSpecificLogic(n, ...)

   nodeMetrics[n] = {rpsIn, rpsOut, load, failed, errorRate, latency, detail, ...}
   rpsOutMap[n] = rpsOut
   readRatioOutMap[n] = readRatioOut
```

---

## 8) Downstream Impact Model

Downstream impact is modeled in two major ways.

### 8.1 Data-store back-pressure into compute tiers

Used by:

- `app_server`
- `cloud_function`
- `worker_pool`

Function `computeDownstreamIoWaitMs` scans direct downstream neighbors and reads previous tick latency for these store types:

- `database`
- `cache`
- `block_storage`
- `network_storage`
- `cloud_storage`

Contribution from each store:

```text
ioWait += prevLatency * ioFraction
ioFraction = 0.2 for cache, 0.5 otherwise
```

Then compute effective service time (or effective per-instance capacity), reducing throughput and increasing latency.

Pseudocode:

```text
function downstreamIoWait(node):
   wait = 0
   for each downstream d of node:
      if type(d) not in {database, cache, block_storage, network_storage, cloud_storage}:
         continue
      prev = previousMetrics[d]
      if prev missing: continue
      frac = (type(d) == cache) ? 0.2 : 0.5
      wait += prev.latencyMs * frac
   return wait
```

This is a first-order queueing/back-pressure approximation using previous tick state.

### 8.2 Service mesh downstream health reflection

`service_mesh` inspects downstream previous-tick metrics:

- `downstreamErrorRate = max(errorRate)`
- `downstreamLatencyMs = max(latencyMs)`

Consequences:

- Circuit breaker opens based on downstream error threshold.
- Mesh latency includes downstream latency when closed.
- Retry logic amplifies outbound traffic and changes effective error probability.

Pseudocode:

```text
downstreamError = max(previousMetrics[d].errorRate for d in downstream(mesh))
downstreamLatency = max(previousMetrics[d].latencyMs for d in downstream(mesh))

if circuitBreakerEnabled and downstreamError >= threshold:
   rpsOut = 0.05 * rpsIn
   errorRate = 0.95
   latency = proxyBase + failFastOverhead
else:
   rpsOut = passThrough(rpsIn)
   errorRate = 0.9 * downstreamError
   latency = proxyBase + downstreamLatency

   if retryCount > 0 and downstreamError > 0:
      latency += downstreamError * retryCount * proxyHopCost
      errorRate = downstreamError^(retryCount + 1)
      rpsOut = rpsOut * (1 + downstreamError * retryCount * 0.8)
```

---

## 9) Zone/Region Failure and Network Penalties

### 9.1 Zone failure injection

Before per-type switch for resource nodes:

- If node config points to a zone where `zoneFailed === true`, node is force-failed immediately.

Forced metrics:

- `rpsOut = 0`
- `load = 2`
- `errorRate = 1`
- `failed = true`

### 9.2 Cross-zone and cross-region latency on edges

After node metrics are done, engine computes edge metrics with geo penalty:

- Different region: `+75 ms`
- Same region but different zone: `+2 ms`

Edge metric fields:

- `rps = sourceNode.rpsOut`
- `latencyMs = sourceNode.latencyMs + crossPenalty`
- `isBottleneck = sourceNode.load > 0.9`

---

## 10) Stateful Components and Carried State

State is stored inside `NodeMetrics.detail` and threaded through `previousMetrics`.

Stateful patterns include:

- `app_server`: autoscaling FSM state (`activeInstances`, pending, cooldowns, warm pool)
- `pubsub`: `subscriberLagMs`
- `cloud_function`: cold starts inferred from concurrency deltas
- `worker_pool`: queue depth accumulation
- `block_storage`: queue depth accumulation
- `rate_limiter`: queue depth in requests for queue-based algorithms
- `service_mesh`: behavior depends on downstream previous-tick health

Important property:

- The engine is pure. State persistence is externalized through `previousMetrics` passed in each tick.

---

## 11) Core Data Structures

Main structures used in the engine:

- `Record<string, NodeConfig>`: node configuration lookup by node ID
- `Record<string, EdgeConfig>`: edge configuration lookup by edge ID
- `Record<string, NodeMetrics>`: output metric map by node ID
- `Record<string, EdgeMetrics>`: output metric map by edge ID
- `Map<string, string[]>`: adjacency for graph traversal
- `Map<string, string>`: source-target to edge ID index
- `Map<string, number>`: in-degree and temporary computation maps
- `Set<string>`: cycle edge IDs

Store-side structures:

- `history: Record<string, number[]>` (last 40 `rpsIn` points per node)
- `events: LogEvent[]` (last 100 events)

---

## 12) Algorithms Applied (Interview View)

1. Directed graph modeling
   - Architecture represented as nodes + edges.

2. DFS cycle detection with color marking
   - Detect back edges and isolate cyclic links.

3. Kahn topological sorting (BFS)
   - Ensures upstream metrics available before downstream computation.

4. Weighted flow distribution
   - Edge split percentages with default equal-share fallback.

5. Queueing-inspired latency model
   - Non-linear queue penalty using squared load.

6. Stateful discrete-time simulation
   - Previous tick metrics drive queues, cooldowns, lag, and retries.

7. Finite state machine
   - App server autoscaling behavior with cooldown transitions.

8. Rule-based fault injection
   - Zone failure short-circuit for affected nodes.

9. Post-pass edge metric synthesis
   - Compute link-level latency/RPS after node-level pass.

---

## 13) Time and Space Complexity

Let:

- `N` = number of nodes
- `E` = number of edges

Per tick (high level):

- Build adjacency: `O(N + E)`
- Cycle detection DFS: `O(N + E)`
- Topological sort: `O(N + E)`
- Node traversal and RPS aggregation: roughly `O(N + E)`
- Edge metric pass: `O(E)`

Total: approximately linear, `O(N + E)` per tick, with small constants from per-type logic.

Space:

- Adjacency + maps + metrics are also `O(N + E)`.

Pseudocode summary of cost centers:

```text
tick():
   buildAdjacency()        // O(N + E)
   detectCyclesDFS()       // O(N + E)
   topoSortKahn()          // O(N + E)
   for node in order:      // O(N + E) total over all neighbor scans
      computeNodeMetrics()
   for edge in edges:      // O(E)
      computeEdgeMetrics()
```

---

## 14) End-to-End Tick Pipeline Summary

1. Store computes global current RPS using pattern and tick.
2. Engine builds adjacency maps.
3. Engine detects cycles and marks cyclic edges to skip.
4. Engine topologically orders nodes.
5. Engine resolves service mesh route weights into edge split overrides.
6. Engine computes node metrics in topological order:
   - inbound RPS
   - read/write split propagation
   - load/failure/error/latency
   - per-type behavior and state updates
7. Engine computes edge metrics with network penalties.
8. Store persists result, appends history/events, increments tick.

Interview pseudocode (single-tick blueprint):

```text
function runTick(topology, peakRps, pattern, tick, prevMetrics):
   incomingRps = peakRps * trafficMultiplier(pattern, tick)

   adj, cyclic = buildAdjacencyAndDetectCycles(topology)
   order, sources = topoSort(topology.nodes, topology.edges, cyclic)
   resolvedEdges = applyServiceMeshRouteOverrides(topology, adj, cyclic)

   nodeMetrics = {}
   rpsOut = {}
   readRatioOut = {}

   for n in order:
      metrics = computeNode(n, incomingRps, adj, resolvedEdges, prevMetrics, rpsOut, readRatioOut)
      nodeMetrics[n.id] = metrics
      rpsOut[n.id] = metrics.rpsOut
      readRatioOut[n.id] = metrics.readRatioOut

   edgeMetrics = computeEdges(topology.edges, nodeMetrics, topology.nodeConfigs, cyclic)
   return { nodeMetrics, edgeMetrics }
```

---

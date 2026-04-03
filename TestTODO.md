# Test TODO - Simulation Unit Tests

Purpose: track unit-test coverage for simulation logic in src/simulation/SimulationEngine.ts.

Legend:
- [ ] not started
- [~] in progress
- [x] complete

## 1. Test Harness and Fixtures

- [x] Add deterministic topology builders (nodes, edges, nodeConfigs, edgeConfigs)
- [x] Add helper assertions for float comparisons (latency and ratios)
- [x] Add helpers for previousMetrics and nodeHistory setup
- [x] Add fixtures for multi-AZ and multi-region layouts
- [x] Add fixtures for read/write split routing graphs

## 2. Core Pipeline Stages

### 2.1 Adjacency and Cycle Handling
- [ ] Builds upstream/downstream adjacency for valid edges
- [ ] Ignores edges with missing source or target nodes
- [ ] Detects cycle edges and excludes them from traversal effects

### 2.2 Topological Ordering and Source Detection
- [ ] Produces stable topological order for DAG inputs
- [ ] Correctly marks source nodes (in-degree zero)

### 2.3 Route Resolution Order
- [ ] Service mesh route overrides applied first
- [ ] API gateway route overrides applied after mesh
- [ ] Health-aware redistribution can overwrite prior splitPct
- [ ] Duplicate mesh routes dedupe by destNodeId using max weight
- [ ] Duplicate gateway routes dedupe by destNodeId using max weight

### 2.4 Effective Region Failure Precomputation
- [ ] regionFailed flag marks region as failed
- [ ] Region auto-fails when all AZs in region are zoneFailed
- [ ] Region remains healthy when at least one AZ is healthy

### 2.5 Health-Aware Redistribution
- [ ] Load balancer redistributes equally across healthy targets
- [ ] Load balancer sets splitPct=0 for failed targets
- [ ] Global accelerator weights downstream by active zone count
- [ ] Global accelerator keeps existing split when all downstream failed

## 3. Shared Math and Invariants

### 3.1 Traffic Patterns
- [ ] steady multiplier behavior
- [ ] ramp multiplier behavior
- [ ] spike multiplier behavior
- [ ] wave multiplier behavior
- [ ] chaos multiplier bounds

### 3.2 Capacity and Base Latency
- [ ] computeCapacity per component type (sanity and edge cases)
- [ ] computeBaseLatency per component type with config overrides

### 3.3 Error and Drop Curves
- [ ] computeErrorRate below 0.9 load is zero
- [ ] computeErrorRate ramps linearly from 0.9 to 1.2
- [ ] computeErrorRate saturates at 1.0 at or above 1.2
- [ ] computeDropRate behavior at <=1.0 and >1.0 load

### 3.4 Global Invariants per Tick
- [ ] p99LatencyMs equals latencyMs * 2.5
- [ ] errorRate always in [0,1]
- [ ] rpsOut never negative
- [ ] readRpsIn + writeRpsIn equals rpsIn (within tolerance)
- [ ] badRpsIn equals rpsIn * badRatio

## 4. Input and Propagation Rules

- [ ] traffic_generator uses generatorRps * generatorPattern
- [ ] cron_job emits fixed schedule rate independent of incomingRps
- [ ] source nodes without upstream get incomingRps
- [ ] readRatio propagation through routing splits
- [ ] badRatio propagation through routing splits
- [ ] firewall scrubs badRatioOut

## 5. Failure Injection Rules

- [ ] Zone failure force-fails zonal resources
- [ ] Direct region failure force-fails regional resources
- [ ] Zone to region path force-fails zonal resources in failed region
- [ ] Non-resource containers are not force-failed by this rule path

## 6. Edge Share Logic

- [ ] Equal split when no splitPct is configured
- [ ] Explicit splitPct honored when fully defined
- [ ] Remaining percentage shared among undefined edges
- [ ] readSplitPct overrides splitPct for read traffic
- [ ] writeSplitPct overrides splitPct for write traffic
- [ ] Cycling edges are excluded from share calculations

## 7. Per-Component Unit Test Coverage

### 7.1 Infrastructure and Pass-through
- [ ] region pass-through behavior
- [ ] availability_zone pass-through behavior
- [ ] public_subnet pass-through behavior
- [ ] private_subnet pass-through behavior
- [ ] comment no-op behavior

### 7.2 cdn
- [ ] cache hit rate based on cacheablePct and load degradation
- [ ] read absorption and write pass-through behavior
- [ ] bandwidth and detail fields

### 7.3 load_balancer
- [ ] drop behavior from load
- [ ] activeConnections cap by maxConnections
- [ ] failedTargets and zone availability detail fields

### 7.4 api_gateway
- [ ] auth overhead added to latency
- [ ] read cache hit only affects reads
- [ ] throttledRps and activeRoutes detail fields

### 7.5 app_server (static)
- [ ] effective capacity with ioScale
- [ ] io wait latency contribution
- [ ] workload-specific cpuPct and memPct shape

### 7.6 app_server autoscaling FSM
- [ ] Cold instance promotion after pendingCountdown
- [ ] Drain completion after drainCountdown
- [ ] Warm-pool replenishment after warmPendingCountdown
- [ ] Threshold strategy scale-out and scale-in triggers
- [ ] Target tracking desiredInstances computation for load metric
- [ ] Target tracking desiredInstances computation for cpu metric
- [ ] Target tracking desiredInstances computation for rps_per_instance metric
- [ ] Scheduled strategy one-time action at atTick
- [ ] Scheduled strategy interval action with intervalTicks
- [ ] Scheduled scale-down immediate behavior
- [ ] Predictive strategy projection from nodeHistory slope
- [ ] Predictive strategy reactive scale-in only
- [ ] Cooldown enforcement for scale-up and scale-down
- [ ] Warm-first then cold provisioning behavior
- [ ] Min/max instance clamping behavior

### 7.7 cache
- [ ] hitRate and evictionRate under memory pressure
- [ ] read absorption and write pass-through behavior

### 7.8 database
- [ ] standalone read/write load split and capacity
- [ ] primary role capacity behavior
- [ ] replica without primary rejects writes
- [ ] replica with primary routes writes and adds routing latency
- [ ] replica with failed primary rejects writes
- [ ] replication lag derived from primary previous write load
- [ ] detail fields (pool usage, queue depth, slowQueryRate)

### 7.9 cloud_storage
- [ ] event emission rate (~10 percent of input rps)
- [ ] bandwidth utilization and throttledRequests

### 7.10 block_storage
- [ ] stateful queueDepth accumulation across ticks
- [ ] queueDepth latency penalty cap

### 7.11 network_storage
- [ ] activeConnections cap by connectionLimit
- [ ] saturation latency penalty near connection cap

### 7.12 pubsub
- [ ] subscriberLagMs growth when over capacity
- [ ] subscriberLagMs recovery when under capacity
- [ ] unackedMessages derived from lag and throughput

### 7.13 cloud_function
- [ ] effectiveExecMs includes downstream io wait
- [ ] recomputed capacity and load under io inflation
- [ ] coldStarts from concurrency increase
- [ ] throttledInvocations when maxConcurrency exceeded

### 7.14 cron_job
- [ ] rpsIn formula from tasksPerRun and intervalMinutes
- [ ] overlapCount behavior from run duration

### 7.15 worker_pool
- [ ] effectiveTaskMs includes downstream io wait
- [ ] stateful queueDepth accumulation across ticks
- [ ] taskBacklogMs and latency cap behavior

### 7.16 rate_limiter
- [ ] token_bucket queueing and overflow behavior
- [ ] leaky_bucket queueing behavior
- [ ] fixed_window immediate drop behavior
- [ ] sliding_window immediate drop behavior
- [ ] sliding_log additional latency overhead
- [ ] output hard cap at requestsPerSecond across all algorithms

### 7.17 service_mesh
- [ ] circuit breaker trips on downstream error threshold
- [ ] open circuit fast-fail behavior
- [ ] retry amplification adjusts rpsOut and errorRate
- [ ] mTLS and observability overhead in latency

### 7.18 global_accelerator
- [ ] activeRegions and failedRegions detail counts
- [ ] reroutedRps based on failed weighted endpoints

### 7.19 nat_gateway
- [ ] translatedConnections cap by maxConnections
- [ ] bandwidth utilization and dropped packets behavior

### 7.20 firewall
- [ ] detectionEfficiency by rules and inspection mode
- [ ] autoDetectedRps and manualBlockedRps composition
- [ ] bad traffic scrub reflected in badRatioOut
- [ ] errorRate combines block rate and overload error

## 8. Cross-Boundary Edge Metrics

- [ ] Edge rps equals source node rpsOut
- [ ] Edge latency adds +2ms for cross-zone same-region
- [ ] Edge latency adds +75ms for cross-region
- [ ] isBottleneck true when source load > 0.9
- [ ] Cycling edges are omitted from edgeMetrics

## 9. Regression and Safety Cases

- [ ] Empty topology returns empty metrics
- [ ] Topology with isolated node remains stable
- [ ] Missing optional config fields fall back to defaults
- [ ] Large but valid splitPct totals >100 are clamped by remainingPct path
- [ ] Negative or extreme inputs handled without NaN or Infinity outputs

## 10. CI and Coverage Gates

- [ ] Add command for simulation unit tests only
- [ ] Add threshold for line/branch coverage on SimulationEngine
- [ ] Add pull request check for simulation unit suite
- [ ] Add flaky-test guardrails (deterministic seeds/no chaos randomness)

## 11. Progress Log

- Date:
- Completed sections:
- Notes:

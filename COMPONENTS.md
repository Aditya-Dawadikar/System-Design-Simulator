# Component Details & Usage Guide

This document describes the currently shipped components in the System Design Simulator, grouped by their role in the system. It is aligned with the component registry in `src/constants/components.ts` and the shared config types in `src/types/index.ts`.

---

## Table of Contents

- [How to Read This Guide](#how-to-read-this-guide)
- [Global Components](#global-components)
- [Regional Components](#regional-components)
- [Zonal Components](#zonal-components)
- [Infrastructure Containers](#infrastructure-containers)
- [Notes and Limitations](#notes-and-limitations)

---

## How to Read This Guide

- **Global** components are not tied to a single region or AZ.
- **Regional** components live in one region and usually serve multiple AZs in that region.
- **Zonal** components are pinned to a single availability zone and fail with that AZ.
- **Infrastructure containers** are primarily visual grouping primitives, but Region and Availability Zone also drive failure behavior and cross-boundary latency.

---

## Global Components

### CDN
**Purpose:** Caches static content near users and reduces origin load.

**Key Configs:**
- `pops`: Number of edge locations
- `cacheablePct`: Fraction of traffic that can be cached
- `bandwidthGbps`: Aggregate edge bandwidth

**What it models:** Read requests can be absorbed at the edge; writes and cache misses continue downstream. Hit rate degrades under sustained load.

**Usage:** Put in front of internet-facing architectures to reduce latency and shield downstream services.

---

### Traffic Generator
**Purpose:** Injects synthetic traffic into the graph.

**Key Configs:**
- `generatorRps`: Baseline requests per second
- `generatorPattern`: `steady`, `ramp`, `spike`, `wave`, or `chaos`
- `readRatioPct`: Read/write mix
- `badTrafficPct`: Percentage of traffic treated as malicious

**What it models:** Entry-point traffic, including traffic shape and the proportion of reads, writes, and bad traffic.

**Usage:** Use one or more generators to represent user traffic, background callers, or attack traffic.

---

### Comment
**Purpose:** Annotation-only node.

**Key Configs:**
- `commentBody`: Freeform note text

**What it models:** Nothing in the simulator. It is documentation on the canvas.

**Usage:** Label assumptions, ownership boundaries, or architectural notes directly on the diagram.

---

### Global Accelerator
**Purpose:** Routes traffic across regions with health-aware failover.

**Key Configs:**
- `routingPolicy`: `latency`, `geo`, or `weighted`
- `failoverEnabled`: Enables health-aware rerouting

**What it models:** Anycast ingress and regional failover. Traffic is redistributed away from failed downstream regions based on active-zone weight.

**Usage:** Put in front of multi-region systems where you want active-active or active-passive behavior.

---

## Regional Components

### Load Balancer
**Purpose:** Distributes requests across downstream services.

**Key Configs:**
- `algorithm`: `round_robin`, `least_conn`, `ip_hash`, `random`, or `weighted`
- `healthChecks`: Health-aware rerouting toggle
- `maxConnections`: Connection tracking ceiling

**What it models:** Request fan-out, active connections, failed-target detection, and zone-aware rerouting around unhealthy backends.

**Usage:** Put between ingress and stateless services. It is the main regional distribution layer.

---

### API Gateway
**Purpose:** Routes requests to downstream services by path and weight.

**Key Configs:**
- `gatewayRoutes`: Route table with `path`, `destNodeId`, and `weightPct`
- `gatewayAuthEnabled`: Enables auth overhead
- `gatewayAuthOverheadMs`: Auth latency cost
- `gatewayCacheEnabled`: Enables gateway-level response caching
- `gatewayCacheHitPct`: Cache hit rate for reads

**What it models:** Weighted routing, auth latency overhead, throttling under overload, and gateway-local response caching for reads.

**Usage:** Use when different APIs or microservices need controlled traffic distribution behind one ingress.

---

### Cloud Storage
**Purpose:** Regional object storage.

**Key Configs:**
- `storageThroughputMbps`: Storage throughput cap
- `objectSizeKb`: Average object size
- `storageClass`: `standard`, `nearline`, `coldline`, or `archive`
- `storageGb`: Logical stored data size

**What it models:** Object-store throughput, latency by storage class, and throttling when throughput is exceeded.

**Usage:** Use for static assets, media, backups, and durable object workflows.

---

### Pub/Sub
**Purpose:** Regional asynchronous messaging bus.

**Key Configs:**
- `partitions`: Parallelism and throughput
- `messageRetentionHours`: Retention window
- `maxMessageSizeKb`: Message size cap

**What it models:** Topic-like buffering, consumer lag, and unacked message buildup under overload.

**Usage:** Use to decouple producers and consumers or to absorb bursty traffic.

---

### Cloud Function
**Purpose:** Regional serverless compute.

**Key Configs:**
- `functionMemoryMb`: Memory per invocation
- `maxConcurrency`: Maximum parallel invocations
- `avgExecutionMs`: Average execution time

**What it models:** Concurrency limits, throttled invocations, cold starts, and downstream IO wait amplification.

**Usage:** Use for event-driven processing, short-lived APIs, and trigger-based workloads.

---

### Rate Limiter
**Purpose:** Throttles traffic before it overwhelms downstream systems.

**Key Configs:**
- `rateLimitAlgorithm`: `token_bucket`, `leaky_bucket`, `fixed_window`, `sliding_window`, or `sliding_log`
- `requestsPerSecond`: Sustained allowed RPS
- `burstCapacity`: Extra headroom for burst-tolerant algorithms
- `windowSizeMs`: Window size for window-based algorithms
- `maxQueueSize`: Queue cap for queuing algorithms

**What it models:** Admission control, bursts, queueing, throttling, and algorithm-specific behavior differences.

**Usage:** Place in front of hot services or expensive write paths to protect them from spikes.

---

### Service Mesh
**Purpose:** Adds proxy-layer behavior between services.

**Key Configs:**
- `mtlsEnabled`: Mutual TLS toggle
- `observabilityLevel`: `none`, `basic`, or `full`
- `proxyOverheadMs`: Per-hop sidecar overhead
- `meshRetryCount`: Retry count
- `meshCircuitBreakerEnabled`: Circuit breaker toggle
- `meshCircuitBreakerThreshold`: Error threshold for opening the breaker
- `meshRoutes`: Weighted route table

**What it models:** Sidecar overhead, retry amplification, downstream-aware circuit breaking, and mesh-level routing decisions.

**Usage:** Use when you want to simulate east-west traffic policies rather than simple direct service calls.

---

### Cron Job
**Purpose:** Emits scheduled work at a fixed interval.

**Key Configs:**
- `intervalMinutes`: Run frequency
- `tasksPerRun`: Work emitted per run

**What it models:** Scheduler-driven bursts, overlap, and periodic rather than user-driven load.

**Usage:** Use for batch jobs, maintenance tasks, and periodic pipelines.

---

### NAT Gateway
**Purpose:** Represents outbound internet egress for private workloads.

**Key Configs:**
- `natBandwidthGbps`: Throughput capacity
- `maxConnections`: Tracked connection ceiling

**What it models:** Address translation, connection tracking, bandwidth utilization, and drops when explicitly routed through the NAT node.

**Usage:** Place in a public subnet to show outbound egress for private subnets.

**Note:** NAT routing is not inferred automatically. It only carries load if you explicitly wire traffic through it.

---

### Firewall
**Purpose:** Filters and inspects inbound or east-west traffic.

**Key Configs:**
- `firewallRules`: Number of configured rules
- `firewallInspectionMode`: `basic` or `deep`
- `firewallBlockRatePct`: Manual block rate override

**What it models:** Stateful inspection, detection efficiency, blocked RPS, and latency overhead from deeper inspection.

**Usage:** Put inline in front of API gateways, load balancers, or sensitive internal services.

---

## Zonal Components

### App Server
**Purpose:** Runs application logic inside one AZ.

**Key Configs:**
- `instances`, `cpuCores`, `ramGb`, `rpsPerInstance`
- `avgLatencyMs`, `workloadType`
- `autoscalingEnabled`, `warmPoolEnabled`, `minInstances`, `maxInstances`, `warmPoolSize`
- `scaleUpCpuPct`, `scaleDownCpuPct`, `scaleUpCooldownTicks`, `scaleDownCooldownTicks`, `coldProvisionTicks`

**What it models:** Compute capacity, downstream IO back-pressure, overload, and a warm-pool autoscaling FSM.

**Usage:** Use for stateless microservices or app tiers behind regional ingress.

---

### Cache
**Purpose:** In-memory cache node.

**Key Configs:**
- `memoryGb`: Memory size
- `ttlSeconds`: Item TTL
- `evictionPolicy`: `lru`, `lfu`, or `noeviction`
- `clusterMode`: Logical cluster toggle

**What it models:** Read absorption, hit rate, eviction pressure, and memory-driven performance degradation.

**Usage:** Place near read-heavy services to reduce database pressure.

---

### Database
**Purpose:** Persistent data store.

**Key Configs:**
- `engine`: `PostgreSQL`, `MySQL`, `MongoDB`, `Redis`, or `Cassandra`
- `instanceType`: Display-oriented instance class
- `storageGb`: Provisioned storage
- `shards`: Number of shards
- `readReplicas`: Number of replicas represented by the node
- `rpsPerShard`: Throughput per shard or replica
- `maxConnections`: Connection cap

**What it models:** Separate read and write load, connection pool usage, query queue depth, and slow-query behavior under pressure.

**Usage:** Use for primaries, replicas, or logically sharded stores.

**Note:** A single database node represents a logical database instance or cluster segment, not a table-level model.

---

### Block Storage
**Purpose:** Attached block volume.

**Key Configs:**
- `diskType`: `nvme`, `ssd`, or `hdd`
- `iops`: IOPS cap
- `objectSizeKb`: IO size
- `storageGb`: Provisioned storage

**What it models:** IOPS saturation, queue depth growth, and latency differences by storage medium.

**Usage:** Use when local-disk pressure or volume saturation matters.

---

### Network Storage
**Purpose:** Shared mounted filesystem endpoint.

**Key Configs:**
- `nfsProtocol`: `nfs`, `smb`, or `cephfs`
- `storageThroughputMbps`: Throughput cap
- `connectionLimit`: Maximum concurrent mounts/connections
- `objectSizeKb`: IO size
- `storageGb`: Provisioned storage

**What it models:** Shared-storage throughput limits, connection saturation, and protocol-specific latency.

**Usage:** Use for shared file systems, content pipelines, or mount-target bottlenecks.

---

### Worker Pool
**Purpose:** Background compute fleet that drains queued work.

**Key Configs:**
- `workerCount`: Number of workers
- `threadCount`: Threads per worker
- `taskDurationMs`: Average task processing time

**What it models:** Parallel task processing, queue depth growth, backlog, and latency under load.

**Usage:** Use behind Pub/Sub, cron, or internal job dispatchers.

---

## Infrastructure Containers

### Region
**Purpose:** Visual cloud-region boundary.

**Key Configs:**
- `regionName`: Region label
- `regionFailed`: Simulated full-region failure toggle
- `containerWidth`, `containerHeight`: Canvas sizing

**What it models:** Region-level failure domain and the source of cross-region edge latency.

**Usage:** Use to group AZs and regional resources inside a cloud region.

---

### Availability Zone
**Purpose:** Visual and failure-domain boundary inside a region.

**Key Configs:**
- `zoneName`: AZ label
- `zoneFailed`: Simulated AZ failure toggle
- `containerWidth`, `containerHeight`: Canvas sizing
- `regionId`: Region membership

**What it models:** AZ-level failure domain and the source of cross-AZ edge latency.

**Usage:** Use to pin zonal resources and simulate AZ failure scenarios.

---

### Public Subnet
**Purpose:** Visual container for internet-facing network space.

**Key Configs:**
- `subnetCidr`: Display-only CIDR block
- `containerWidth`, `containerHeight`: Canvas sizing

**What it models:** Layout and network intent only. It has no direct simulation effect.

**Usage:** Group load balancers, firewalls, NAT gateways, or other internet-facing resources.

---

### Private Subnet
**Purpose:** Visual container for internal-only network space.

**Key Configs:**
- `subnetCidr`: Display-only CIDR block
- `containerWidth`, `containerHeight`: Canvas sizing

**What it models:** Layout and network intent only. It has no direct simulation effect.

**Usage:** Group internal services, databases, caches, and worker nodes.

---

## Notes and Limitations

- Public Subnet and Private Subnet are visual grouping nodes only. They help explain topology but do not process traffic themselves.
- Region and Availability Zone are also structural containers, but unlike subnets they do affect simulation by driving placement, failure propagation, and cross-boundary latency.
- NAT Gateway metrics only appear when traffic is explicitly routed through a NAT node. Private-subnet egress is not inferred automatically.
- Database, cache, and worker-style nodes model logical capacity and pressure, not vendor-accurate internals.
- API Gateway and Service Mesh can both override downstream traffic weights. Their route tables are normalized by destination at simulation time.

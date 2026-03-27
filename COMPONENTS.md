# Component Details & Usage Guide

This document provides detailed descriptions and usage instructions for each simulation component in the System Design Simulator.

---

## Table of Contents
- [CDN](#cdn)
- [Load Balancer](#load-balancer)
- [App Server](#app-server)
- [Cache](#cache)
- [Database](#database)
- [Cloud Storage](#cloud-storage)
- [Pub/Sub](#pubsub)
- [Cloud Function](#cloud-function)
- [Cron Job](#cron-job)
- [Worker Pool](#worker-pool)
- [Traffic Generator](#traffic-generator)
- [Comment](#comment)

---

## CDN
**Purpose:** Caches static content close to users, reducing latency and offloading origin servers.

**Key Configs:**
- `pops`: Number of edge locations (affects capacity)
- `cacheablePct`: % of traffic that is cacheable

**Usage:** Place between users and origin servers to reduce load and latency. Tune `pops` for scale.

---

## Load Balancer
**Purpose:** Distributes incoming requests across backend servers.

**Key Configs:**
- `maxConnections`: Maximum concurrent connections
- `algorithm`: Load balancing strategy

**Usage:** Use to spread load and provide failover for app servers or databases.

---

## App Server
**Purpose:** Handles business logic and dynamic requests. Represents a scalable microservice or a pool of stateless service instances (not a single server).

**Key Configs:**
- `cpuCores`, `ramGb`: Per-instance resources
- `minInstances`, `maxInstances`, `warmPoolSize`: Autoscaling limits
- `scaleUpCpuPct`, `scaleDownCpuPct`: Scaling thresholds

**Usage:** Place behind a load balancer. Adjust scaling configs for desired elasticity and cost.

**Scaling Behavior:**
- The App Server component uses an autoscaling finite state machine (FSM).
- When CPU utilization exceeds the scale-up threshold, it first activates a "warm" instance from the warm pool (if available) for instant scaling with no cold start penalty.
- If no warm instances are available, it provisions a new (cold) instance, which becomes active after a short delay (cold start period).
- When CPU drops below the scale-down threshold, it decommissions an active instance and, if configured, refills the warm pool.
- Expect rapid scale-up when warm pool is available, but slower scale-up (with latency spike) when cold provisioning is required. Scaling down is gradual to avoid thrashing.
- All scaling state (active, pending, warm reserve, cooldowns) is tracked and visible in the simulation detail metrics.

---

## Cache
**Purpose:** In-memory cache for fast data retrieval, reducing database load.

**Key Configs:**
- `memoryGb`: Cache size

**Usage:** Place between app servers and databases for frequently accessed data.

**Note:** The Cache component (e.g., Redis) represents a single logical cache system, which can be either a standalone node or a Redis cluster, depending on your architecture. The simulation models aggregate cache capacity and hit/miss behavior, not individual node topology.

---

## Database
**Purpose:** Stores persistent data. Supports sharding and read replicas.

**Key Configs:**
- `shards`: Number of primary shards
- `readReplicas`: Number of read replicas
- `rpsPerShard`: Capacity per shard/replica

**Usage:** Use for durable storage. Scale with sharding and replicas for performance and availability.

**Note:** In this simulator, a single Database component represents an entire logical database or database cluster (not just a single table). It models aggregate capacity, sharding, and replication at the database level.

---

## Cloud Storage
**Purpose:** Object storage for files, images, and large blobs.

**Key Configs:**
- `storageThroughputMbps`: Bandwidth
- `objectSizeKb`: Typical object size
- `storageClass`: Standard, nearline, coldline, archive

**Usage:** Use for static assets, backups, and large file storage.

---

## Pub/Sub
**Purpose:** Asynchronous message delivery between producers and consumers. A pub/sub node represents a single Pub/Sub topic.

**Key Configs:**
- `partitions`: Parallelism/throughput

**Usage:** Decouple services, buffer spikes, and enable event-driven architectures.

---

## Cloud Function
**Purpose:** Serverless compute for event-driven or short-lived tasks.

**Key Configs:**
- `maxConcurrency`: Max parallel executions
- `avgExecutionMs`: Typical execution time
- `functionMemoryMb`: Memory per invocation

**Usage:** Use for background jobs, triggers, and microservices.

---

## Cron Job
**Purpose:** Scheduled task emitter.

**Key Configs:**
- `tasksPerRun`: Number of tasks per schedule
- `intervalMinutes`: Frequency

**Usage:** Use to trigger periodic jobs or batch processing.

---

## Worker Pool
**Purpose:** Processes background jobs from a queue.

**Key Configs:**
- `workerCount`: Number of workers
- `threadCount`: Threads per worker
- `taskDurationMs`: Avg task time

**Usage:** Use for parallel processing of jobs, tasks, or events.

**Note:** The Worker Pool component models a queue-based background processing system. It tracks the inflow of jobs (RPS), the number of jobs processed per second (based on worker and thread count), and the queue depth. If inflow exceeds processing capacity, the queue grows and task backlog increases. This helps simulate real-world bottlenecks and latency in asynchronous job processing systems.

---

## Traffic Generator
**Purpose:** Simulates incoming user or system traffic.

**Key Configs:**
- `generatorRps`: Requests per second
- `generatorPattern`: Traffic pattern (steady, ramp, spike, etc)
- `readRatioPct`: % of reads vs writes

**Usage:** Use to drive load into the system for testing and simulation.

---

## Comment
**Purpose:** Annotation node for documentation only.

**Usage:** Use to add notes or explanations to your architecture diagram.

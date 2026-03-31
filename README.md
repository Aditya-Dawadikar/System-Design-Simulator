# System Design Simulator

An interactive web simulator for visualizing, designing, and stress-testing distributed system architectures in real time.

---

![System Design Simulator Demo](demo.gif)

---

## Features

- **16 component types** — CDN, load balancers, app servers, caches, databases, object/block/network storage, pub/sub, cloud functions, cron jobs, worker pools, rate limiters, service mesh, and traffic generators
- **AWS-aligned infrastructure scopes** — Region and Availability Zone containers with zone failure simulation; zonal vs. regional vs. global component classification; cross-zone (+2 ms) and cross-region (+75 ms) latency penalties on edges
- **Live simulation** — 500 ms tick loop propagates RPS through the graph, computing load, latency, error rates, and component-specific detail metrics for every node
- **App server autoscaling** — full FSM with warm pool (instant scale), cold provisioning countdown, configurable scale-up/down thresholds and cooldowns, min/max instance clamping
- **Traffic patterns** — steady, ramp, spike, wave, and chaos modes with per-node traffic generators
- **Service mesh** — mTLS, per-hop proxy overhead, retry amplification, circuit breaking, and a weight-based routing table with automatic deduplication
- **Rate limiter algorithms** — token bucket, leaky bucket, fixed window, sliding window, sliding log — each with distinct burst and queuing behavior
- **Inspector panel** — per-component configuration with real-time field editing; scope-aware AZ / Region placement picker; per-edge protocol, timeout, retry, circuit breaker, and bandwidth settings
- **Metrics dashboard** — global stats, per-node ArcGauge load indicators, RPS sparklines, P99 latency, error rate, and component detail rows
- **Event log** — timestamped info / warn / error / k8s events with auto-scroll
- **Drag-and-drop canvas** — React Flow canvas with zoom, pan, duplicate, and delete; architecture persisted to localStorage
- **JSON import/export** — save and share architecture snapshots
- **Architecture templates** — pre-built scenarios including multi-AZ high availability and multi-region active-active

---

## Getting started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to use

1. **Drag components** from the left sidebar onto the canvas. Components are grouped by category: Infra (Region, AZ), Compute, Storage, Networking, and Utility.
2. **Place infrastructure containers** first if modeling multi-AZ or multi-region topologies. Drop a Region node, then one or more Availability Zone nodes inside it.
3. **Assign components to zones or regions** — select any resource node and use the inspector's AZ or Region dropdown to declare membership. Zonal components (App Server, Cache, Database, etc.) show an AZ picker; regional components (Load Balancer, Cloud Storage, etc.) show a Region picker.
4. **Connect nodes** by dragging from an output handle to an input handle. Each connection becomes a configurable edge with its own protocol, timeout, retry, and circuit breaker settings.
5. **Simulate zone failures** by selecting an Availability Zone node in the inspector and toggling "Zone Failed." All member nodes are immediately force-failed in the simulation.
6. **Run the simulation** using the controls at the bottom. Choose a peak RPS and a traffic pattern, then click Run.
7. **Read metrics** in the dashboard below the canvas — global stats update every 500 ms; per-node cards show load, RPS, latency, and component-specific details.
8. **Watch the event log** for overload events, recovery, autoscaling actions, and queue warnings.

---

## Component reference

### Infrastructure containers

| Icon | Name | Scope | Key Config | What it simulates |
|------|------|-------|-----------|-------------------|
| ⬡ | Region | — | Region name, canvas size | Visual grouping for a cloud region; +75 ms cross-region edge penalty |
| ◎ | Availability Zone | — | Zone name, failed toggle, canvas size | Visual grouping for an AZ; zone failure force-fails all member nodes |

### Resource components

| Icon | Name | Scope | Key Config | What it simulates |
|------|------|-------|-----------|-------------------|
| ◎ | CDN Edge | Global | POPs, cacheable %, bandwidth | Cache hit absorption; origin bypass on misses and writes; degraded hit rate under high load |
| ↯ | Traffic Generator | Global | RPS, pattern, read ratio | Injects traffic at configurable RPS with its own pattern; sets read/write ratio downstream |
| ⇌ | Load Balancer | Regional | Algorithm, max connections | Traffic distribution; connection tracking; scaling event signal above 75% load |
| ◫ | Cloud Storage | Regional | Throughput, storage class, object size | Bandwidth throttling; downstream event notifications; storage class latency tiers |
| ⊕ | Pub/Sub | Regional | Partitions, retention | Partition-limited throughput; stateful subscriber lag accumulation |
| ƒ | Cloud Function | Regional | Memory, concurrency, exec time | Serverless cold starts; concurrency throttling; IO wait inflation |
| ⊘ | Rate Limiter | Regional | Algorithm, RPS limit, burst, window | Five rate-limiting algorithms with distinct burst tolerance and queue/drop behavior |
| ⊛ | Service Mesh | Regional | mTLS, proxy overhead, retries, routing table | Sidecar proxy latency; retry amplification; circuit breaking; weight-based traffic routing |
| ◷ | Cron Job | Regional | Interval, tasks/run | Fixed-rate task emission; overlap detection when run duration exceeds interval |
| ◈ | App Server | Zonal | Instances, CPU/RAM, workload type, autoscaling | Compute capacity; IO wait back-pressure from downstream stores; FSM autoscaling with warm pool |
| ⚡ | Redis Cache | Zonal | Memory GB, TTL, eviction policy | Read absorption by hit rate; eviction rate under memory pressure; cluster mode |
| ▣ | Database | Zonal | Engine, shards, replicas, RPS/shard | Separate read/write load paths; connection pool exhaustion; query queue depth; slow query rate |
| ▤ | Block Storage | Zonal | Disk type, IOPS, IO size | IOPS cap with stateful queue depth; disk type latency (NVMe / SSD / HDD) |
| ⊜ | Network Storage | Zonal | Protocol, throughput, connection limit | Bandwidth-limited NFS/SMB/CephFS; connection saturation latency penalty |
| ⚙ | Worker Pool | Zonal | Workers, threads, task duration | Parallel task processing; stateful queue backlog with up to 5 s added latency |
| // | Comment | Global | Body text | Canvas annotation — no simulation effect |

**Scope** determines the inspector placement picker shown and which cross-boundary latency penalties apply. Zonal components show an Availability Zone dropdown; regional components show a Region dropdown; global components show neither.

---

## Traffic patterns

| Pattern | Behavior |
|---------|----------|
| Steady | Constant 1× baseline RPS |
| Ramp | Linearly grows to 1.6× over 30 seconds, then holds |
| Spike | 3.5× burst for 2.5 s every 15 s, drops to 0.35× between spikes |
| Wave | Sinusoidal oscillation between 0.5× and 1× on a 10-second cycle |
| Chaos | Random multiplier between 0.3× and 1.7× every 500 ms |

Traffic generators have their own independent pattern setting. The global pattern scales the overall peak RPS.

---

## Tech stack

| Technology | Role |
|------------|------|
| Next.js 16 | Framework and SSR |
| React 19 | UI rendering |
| React Flow 11 | Interactive graph canvas |
| Zustand 5 | State management (architecture + simulation stores) |
| Recharts 3 | Sparklines and time-series charts |
| TypeScript 5 | Type safety across engine and UI |
| Tailwind CSS 4 | Styling with dark terminal theme |

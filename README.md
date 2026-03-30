# System Design Simulator

An interactive web simulator for visualizing, designing, and stress-testing distributed system architectures in real time.

---

![System Design Simulator Demo](demo.gif)

---

## Features

- **16 component types** — CDN, load balancers, app servers, caches, databases, object/block/network storage, pub/sub, cloud functions, cron jobs, worker pools, rate limiters, service mesh, and traffic generators
- **Live simulation** — 500 ms tick loop propagates RPS through the graph, computing load, latency, error rates, and component-specific detail metrics for every node
- **App server autoscaling** — full FSM with warm pool (instant scale), cold provisioning countdown, configurable scale-up/down thresholds and cooldowns, min/max instance clamping
- **Traffic patterns** — steady, ramp, spike, wave, and chaos modes with per-node traffic generators
- **Service mesh** — mTLS, per-hop proxy overhead, retry amplification, circuit breaking, and a weight-based routing table with automatic deduplication
- **Rate limiter algorithms** — token bucket, leaky bucket, fixed window, sliding window, sliding log — each with distinct burst and queuing behavior
- **Inspector panel** — per-component configuration with real-time field editing; per-edge protocol, timeout, retry, circuit breaker, and bandwidth settings
- **Metrics dashboard** — global stats, per-node ArcGauge load indicators, RPS sparklines, P99 latency, error rate, and component detail rows
- **Event log** — timestamped info / warn / error / k8s events with auto-scroll
- **Drag-and-drop canvas** — React Flow canvas with zoom, pan, duplicate, and delete; architecture persisted to localStorage
- **JSON import/export** — save and share architecture snapshots

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

1. **Drag components** from the left sidebar onto the canvas.
2. **Connect nodes** by dragging from an output handle to an input handle. Each connection becomes a configurable edge.
3. **Configure nodes** by clicking a node to open the inspector on the right. Adjust capacity, latency, scaling behavior, and other parameters.
4. **Configure edges** by clicking an edge wire. Set protocol, timeout, retry count, circuit breaker, bandwidth cap, and traffic split percentage.
5. **Run the simulation** using the controls at the bottom. Choose a peak RPS and a traffic pattern, then click Run.
6. **Read metrics** in the dashboard below the canvas — global stats update every 500 ms; per-node cards show load, RPS, latency, and component-specific details.
7. **Watch the event log** for overload events, recovery, autoscaling actions, and queue warnings.

---

## Component reference

| Icon | Name | Key Config | What it simulates |
|------|------|-----------|-------------------|
| ◎ | CDN Edge | POPs, cacheable %, bandwidth | Cache hit absorption; origin bypass on misses and writes; degraded hit rate under high load |
| ⇌ | Load Balancer | Algorithm, max connections | Traffic distribution; connection tracking; scaling event signal above 75% load |
| ◈ | App Server | Instances, CPU/RAM, workload type, autoscaling | Compute capacity; IO wait back-pressure from downstream stores; FSM autoscaling with warm pool |
| ⚡ | Redis Cache | Memory GB, TTL, eviction policy | Read absorption by hit rate; eviction rate under memory pressure; cluster mode |
| ▣ | Database | Engine, shards, replicas, RPS/shard | Separate read/write load paths; connection pool exhaustion; query queue depth; slow query rate |
| ◫ | Cloud Storage | Throughput, storage class, object size | Bandwidth throttling; downstream event notifications; storage class latency tiers |
| ▤ | Block Storage | Disk type, IOPS, IO size | IOPS cap with stateful queue depth; disk type latency (NVMe / SSD / HDD) |
| ⊜ | Network Storage | Protocol, throughput, connection limit | Bandwidth-limited NFS/SMB/CephFS; connection saturation latency penalty |
| ⊕ | Pub/Sub | Partitions, retention | Partition-limited throughput; stateful subscriber lag accumulation |
| ƒ | Cloud Function | Memory, concurrency, exec time | Serverless cold starts; concurrency throttling; IO wait inflation |
| ◷ | Cron Job | Interval, tasks/run | Fixed-rate task emission; overlap detection when run duration exceeds interval |
| ⚙ | Worker Pool | Workers, threads, task duration | Parallel task processing; stateful queue backlog with up to 5 s added latency |
| ↯ | Traffic Generator | RPS, pattern, read ratio | Injects traffic at configurable RPS with its own pattern; sets read/write ratio downstream |
| ⊘ | Rate Limiter | Algorithm, RPS limit, burst, window | Five rate-limiting algorithms with distinct burst tolerance and queue/drop behavior |
| ⬡ | Service Mesh | mTLS, proxy overhead, retries, routing table | Sidecar proxy latency; retry amplification; circuit breaking; weight-based traffic routing |
| // | Comment | Body text | Canvas annotation — no simulation effect |

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

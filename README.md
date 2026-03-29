# System Design Simulator

An interactive web simulator for visualizing, designing, and stress-testing distributed system architectures in real time.

---

![System Design Simulator Demo](./views/sys_design_sim.gif)

---

## Features

- **Drag-and-drop canvas** — build architectures from 15 component types; connect them with configurable edges
- **Live simulation** — 500 ms tick loop models traffic propagation, queueing, failures, and autoscaling across the full graph
- **Per-node metrics** — RPS in/out, mean and P99 latency, load gauge, error rate, and component-specific detail metrics
- **Autoscaling FSM** — app servers scale warm (instant) or cold (countdown), with configurable thresholds and cooldowns
- **Stateful components** — pub/sub subscriber lag, worker pool queue depth, cloud function cold starts, and block storage IOPS queues all accumulate across ticks
- **Traffic patterns** — steady, ramp, spike, wave, and chaos multipliers applied per-tick
- **Read/write ratio propagation** — traffic generators seed a read ratio that flows downstream; databases compute separate read and write loads
- **Downstream IO back-pressure** — slow databases and storage nodes inflate app server and worker pool latency via Little's Law
- **Edge configuration** — protocol, timeout, retry, circuit breaker, and per-edge traffic split (%)
- **Event log** — real-time stream of info, warn, error, and k8s-level events with component context
- **Inspector panel** — click any node or edge to configure it; changes take effect on the next tick
- **Collapsible sidebar** — component library with drag handles for all node types
- **Draggable/resizable dashboard** — metrics panel floats over the canvas, resize vertically

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to use

1. **Drag** a component from the sidebar onto the canvas
2. **Connect** components by dragging from one node's handle to another
3. **Configure** any node or edge by clicking it — the inspector opens on the right
4. **Start** the simulation with the Run button in the controls bar
5. **Read metrics** in the dashboard panel: global RPS, E2E latency, error rate, and per-node cards with sparklines
6. **Watch the event log** for scaling events, overload alerts, and component-specific warnings

---

## Component reference

| Icon | Name | Key config | What it simulates |
|------|------|-----------|-------------------|
| ◎ | CDN Edge | POPs, cacheable %, bandwidth | Cache hit rate degrades under load; origin bypass RPS tracked |
| ⇌ | Load Balancer | Algorithm, max connections | Distributes traffic; signals scale-out when load > 75% |
| ◈ | App Server | Instances, CPU, RAM, autoscaling | Compute with optional warm/cold autoscaling FSM; IO wait back-pressure |
| ⚡ | Redis Cache | Memory GB, TTL, eviction policy | Hit rate absorbs reads; eviction rate degrades hit rate under load |
| ▣ | Database | Engine, shards, replicas, RPS/shard | Separate read/write loads; connection pool exhaustion; slow queries |
| ◫ | Cloud Storage | Throughput Mbps, object size, storage class | Throttled requests; bandwidth utilization; class-dependent latency |
| ▤ | Block Storage | Disk type, IOPS limit | Stateful IOPS queue depth; disk-type-dependent latency (NVMe/SSD/HDD) |
| ⊜ | Network Storage | Protocol, throughput, connection limit | Bandwidth-limited; connection saturation adds latency (NFS/SMB/CephFS) |
| ⊕ | Pub/Sub | Partitions, retention | Stateful subscriber lag accumulates when producers outpace consumers |
| ƒ | Cloud Function | Memory MB, concurrency, exec time | Cold starts on concurrency ramp; throttling at max concurrency |
| ◷ | Cron Job | Interval, tasks per run | Schedule-driven emitter; overlap count when runs exceed interval |
| ⚙ | Worker Pool | Workers, threads, task duration | Stateful queue depth; IO-inflated task duration; backlog latency |
| ↯ | Traffic Generator | RPS, pattern, read ratio % | Injects traffic with configurable pattern and read/write split |
| ⊘ | Rate Limiter | Algorithm, RPS limit, burst capacity, queue size | Five algorithms (token bucket, leaky bucket, fixed/sliding window, sliding log); stateful queue for bucket algos; throttle rate as error rate |
| // | Comment | Text body | Annotation only — no simulation effect |

---

## Traffic patterns

| Pattern | Behavior | Multiplier |
|---------|----------|-----------|
| Steady | Constant load | 1.0× |
| Ramp | Gradually increases to 1.6× over 30 seconds, then holds | 1.0× → 1.6× |
| Spike | 3.5× burst for 2.5 s every 15 s, drops to 0.35× between spikes | 3.5× / 0.35× |
| Wave | Sinusoidal oscillation between 0× and 1× | 0–1× |
| Chaos | Random multiplier each tick | 0.3×–1.7× |

Traffic generators have their own independent pattern setting.

---

## Tech stack

| Technology | Role |
|-----------|------|
| Next.js 16 (App Router) | Framework and server |
| React 19 | UI |
| React Flow 11 | Interactive canvas |
| Zustand 5 | State management (two stores) |
| Tailwind CSS v4 | Styling |
| TypeScript 5 | Language |
| Recharts 3 | Sparkline charts |

---

For full architecture documentation, simulation engine internals, and extension guides, see [CLAUDE.md](./CLAUDE.md).

For planned and in-progress work, see [TODO.md](./TODO.md).

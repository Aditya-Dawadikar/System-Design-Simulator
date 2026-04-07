# System Design Simulator

An interactive web simulator for visualizing, designing, and stress-testing distributed system architectures in real time.

---

![System Design Simulator Demo](demo.gif)

---

## Features

- **24 component types** — CDN, traffic generator, global accelerator, load balancer, API gateway, firewall, NAT gateway, public/private subnets, app servers, caches, databases, object/block/network storage, pub/sub, cloud functions, cron jobs, worker pools, rate limiters, service mesh, comments, regions, and availability zones
- **AWS-aligned infrastructure scopes** — Region and Availability Zone containers with zone and region failure simulation; zonal vs. regional vs. global component classification; cross-zone (+2 ms) and cross-region (+75 ms) latency penalties on edges
- **Live simulation** — 500 ms tick loop propagates RPS through the graph, computing load, latency, error rates, and component-specific detail metrics for every node
- **App server autoscaling** — full FSM with four strategies: threshold (CPU/load triggers), target tracking (desired utilization), scheduled (tick-based pre-scaling actions), and predictive (linear trend extrapolation with pre-provisioning); warm pool with automatic replenishment for instant scale-out; cold provisioning countdown; graceful scale-down drain countdown; min/max instance clamping
- **Traffic patterns** — steady, ramp, spike, wave, and chaos modes with per-node traffic generators
- **API gateway routing** — path-prefix route table with per-destination weight, gateway-level response caching, and optional auth overhead; enables per-microservice traffic shaping
- **Single-leader database replication** — assign each database node a role (standalone, primary, or replica); replicas are linked to a primary by node ID; writes are enforced to the primary only with write-rejection errors on replicas; replication lag tracks primary write load; linked replicas receive cross-zone/cross-region latency penalties on write routing
- **Service mesh** — mTLS, per-hop proxy overhead, retry amplification, circuit breaking, and a weight-based routing table with automatic deduplication
- **Rate limiter algorithms** — token bucket, leaky bucket, fixed window, sliding window, sliding log — each with distinct burst and queuing behavior
- **Inspector panel** — per-component configuration with real-time field editing; scope-aware AZ / Region placement picker; per-edge protocol, timeout, retry, circuit breaker, and bandwidth settings
- **Metrics dashboard** — global stats, per-node ArcGauge load indicators, RPS sparklines, P99 latency, error rate, component detail rows, and a live latency percentile chart (p50/p75/p90/p95/p99) per selected node
- **Event log** — timestamped info / warn / error / k8s events with auto-scroll
- **Drag-and-drop canvas** — React Flow canvas with zoom, pan, duplicate, and delete; architecture persisted to localStorage
- **IaC YAML editor** — declare entire topologies in a single YAML file using either classic flat `resources[]` style or K8s-style `services[]` + `deployments[]` blocks; Validate/Apply/Export actions; structured parse and semantic error surfacing; two built-in starter templates; round-trip stable export from any canvas state; canvas auto-syncs to the editor on every change
- **Service/Deployment abstraction** — define a logical service once in `services[]` and stamp it across multiple zones or regions via `deployments[]`; node IDs are generated automatically (`{serviceId}-{zoneId}`); database deployments support primary/replica topology out of the box; service `dependencies[]` auto-generate correctly typed edges with read/write split percentages; editing any instance of a service in the Inspector propagates config changes to all sibling instances automatically
- **JSON import/export** — save and share architecture snapshots
- **Architecture templates** — 11 pre-built scenarios including multi-AZ high availability, multi-region active-active with per-microservice traffic routing, and more

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

### Unit tests

```bash
# Run once
npm run test:unit

# Watch mode
npm run test:unit:watch

# Coverage report
npm run test:unit:coverage
```

Test file convention: one test file per feature under `tests/features/`.

---

## How to use

1. **Drag components** from the left sidebar onto the canvas. Components are grouped by category: Infra, Compute, Storage, Network, Async, and Other.
2. **Place infrastructure containers** first if modeling multi-AZ or multi-region topologies. Drop a Region node, then one or more Availability Zone nodes inside it.
3. **Assign components to zones or regions** — select any resource node and use the inspector's AZ or Region dropdown to declare membership. Zonal components (App Server, Cache, Database, etc.) show an AZ picker; regional components (Load Balancer, API Gateway, Cloud Storage, etc.) show a Region picker.
4. **Connect nodes** by dragging from an output handle to an input handle. Each connection becomes a configurable edge with its own protocol, timeout, retry, circuit breaker, and traffic split settings.
5. **Configure routing** — select an API Gateway or Service Mesh node and use the Route Table in the inspector to assign traffic weights to downstream services.
6. **Simulate failures** by selecting a Region or Availability Zone node and toggling "Region Failed" or "Zone Failed." All member nodes are immediately force-failed in the simulation.
7. **Run the simulation** using the controls at the bottom. Choose a peak RPS and a traffic pattern, then click Run.
8. **Read metrics** in the dashboard below the canvas — global stats update every 500 ms; per-node cards show load, RPS, latency, and component-specific details.
9. **Watch the event log** for overload events, recovery, autoscaling actions, health-check rerouting, and queue warnings.
10. **Use the IaC YAML editor** — click the **IAC** button in the header to open the editor. Write or paste a topology YAML, click **VALIDATE** to see parse and semantic errors, then **APPLY** to replace the canvas atomically. **EXPORT** writes the current canvas back to YAML. **STARTER** loads the built-in three-tier template; **SVC+DEPLOY** loads a K8s-style checkout platform using `services[]` + `deployments[]`. The editor auto-syncs whenever the canvas changes.
11. **Edit services uniformly** — when using the K8s-style authoring, clicking any instance of a service (e.g. `api-use1a` or `api-use1b`) and changing its config in the Inspector automatically propagates those changes to all other instances of the same service. Placement-specific fields (zone, region, DB role) are excluded from propagation.

---

## Current limitations

- **NAT Gateway modeling is partial** — the simulator can compute NAT Gateway metrics when traffic is explicitly routed through NAT nodes, but it does not automatically infer private-subnet egress paths. In the built-in Multi-Region Active-Active template, NAT Gateway nodes are included as visual outbound anchors only and are intentionally not connected to simulation edges.

---

## Component reference

### Infrastructure containers

| Icon | Name | Scope | Key Config | What it simulates |
|------|------|-------|-----------|-------------------|
| ⬡ | Region | — | Region name, failed toggle, canvas size | Visual grouping for a cloud region; region failure force-fails all member nodes; +75 ms cross-region edge penalty |
| ◎ | Availability Zone | — | Zone name, failed toggle, canvas size | Visual grouping for an AZ; zone failure force-fails all member nodes |
| ⬤ | Public Subnet | — | CIDR block, canvas size | Visual grouping for internet-facing resources such as load balancers, firewalls, and NAT gateways |
| ◯ | Private Subnet | — | CIDR block, canvas size | Visual grouping for internal resources; documents workloads that egress through NAT rather than directly to the internet |

### Resource components

| Icon | Name | Scope | Key Config | What it simulates |
|------|------|-------|-----------|-------------------|
| ◎ | CDN Edge | Global | POPs, cacheable %, bandwidth | Cache hit absorption; origin bypass on misses and writes; degraded hit rate under high load |
| ↯ | Traffic Generator | Global | RPS, pattern, read ratio | Injects traffic at configurable RPS with its own pattern; sets read/write ratio for downstream nodes |
| ⊙ | Global Accelerator | Global | Routing policy, failover | Anycast routing across regions; health-aware proportional failover weighted by active zone count |
| ⇌ | Load Balancer | Regional | Algorithm, health checks, max connections | Traffic distribution across AZs; connection tracking; health-check-based rerouting around failed targets; scaling event signal above 75% load |
| ⊞ | API Gateway | Regional | Route table (path + weight), auth, response cache | Weight-based microservice routing; gateway-level read caching; per-request auth overhead |
| ⊟ | Firewall | Regional | Rules, inspection mode, block rate | Stateful filtering with configurable blocking behavior, inspection overhead, and blocked-RPS metrics |
| ⇢ | NAT Gateway | Regional | Bandwidth, max connections | Outbound address translation with bandwidth and connection tracking metrics when traffic is explicitly routed through it |
| ◫ | Cloud Storage | Regional | Throughput, storage class, object size | Bandwidth throttling; downstream event notifications; storage class latency tiers |
| ⊕ | Pub/Sub | Regional | Partitions, retention | Partition-limited throughput; stateful subscriber lag accumulation under overload |
| ƒ | Cloud Function | Regional | Memory, concurrency, exec time | Serverless cold starts; concurrency throttling; IO wait inflation from downstream stores |
| ⊘ | Rate Limiter | Regional | Algorithm, RPS limit, burst, queue size | Five rate-limiting algorithms with distinct burst tolerance and queue/drop behavior |
| ⊛ | Service Mesh | Regional | mTLS, proxy overhead, retries, circuit breaker, routing table | Sidecar proxy latency; retry amplification; circuit breaking; weight-based traffic routing |
| ◷ | Cron Job | Regional | Interval, tasks/run | Fixed-rate task emission; overlap detection when run duration exceeds interval |
| ◈ | App Server | Zonal | Instances, CPU/RAM, workload type, autoscaling strategy, drain ticks | Compute capacity; IO wait back-pressure from downstream stores; FSM autoscaling with four strategies (threshold, target tracking, scheduled, predictive); warm pool with continuous replenishment; cold provisioning countdown; graceful scale-down drain before termination |
| ⚡ | Redis Cache | Zonal | Memory GB, TTL, eviction policy | Read absorption by hit rate; eviction rate under memory pressure |
| ▣ | Database | Zonal | Engine, shards, role (standalone/primary/replica), primary node link, RPS/shard | Separate read/write load paths; single-leader replication with write-only primary and read-only replicas; write rejection on misrouted traffic; replication lag tracks primary write pressure; connection pool exhaustion; query queue depth |
| ▤ | Block Storage | Zonal | Disk type, IOPS, IO size | IOPS cap with stateful queue depth; disk type latency (NVMe / SSD / HDD) |
| ⊜ | Network Storage | Zonal | Protocol, throughput, connection limit | Bandwidth-limited NFS/SMB/CephFS; connection saturation latency penalty |
| ⚙ | Worker Pool | Zonal | Workers, threads, task duration | Parallel task processing; stateful queue backlog with up to 5 s added latency |
| // | Comment | Global | Body text | Canvas annotation — no simulation effect |

**Scope** determines which placement picker is shown in the inspector and which cross-boundary latency penalties apply. Zonal components show an Availability Zone dropdown; regional components show a Region dropdown; global components show neither.

---

## Traffic patterns

| Pattern | Multiplier | Behavior |
|---------|-----------|----------|
| Steady | 1.0× | Constant baseline RPS |
| Ramp | 1.0× → 1.6× | Linearly grows to 1.6× over 30 seconds, then holds |
| Spike | 3.5× / 0.35× | 3.5× burst for 2.5 s every 15 s; drops to 0.35× between spikes |
| Wave | 0.5× → 1.0× | Sinusoidal oscillation on a 10-second cycle |
| Chaos | 0.3× – 1.7× | Random multiplier resampled every 500 ms |

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
| Zod 4 | IaC YAML schema validation |
| js-yaml 4 | YAML parsing and serialization |

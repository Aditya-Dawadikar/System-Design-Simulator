# TODO - System Design Simulator

Last refreshed: March 31, 2026

This file reflects the current codebase state. It replaces the older component list, which was stale and included duplicate or already-shipped items.

## Shipped Now

### Infrastructure and topology

- [x] Region container nodes
- [x] Availability Zone container nodes
- [x] Public Subnet container nodes
- [x] Private Subnet container nodes
- [x] Scope-aware placement for global, regional, and zonal resources
- [x] Cross-zone edge latency penalties
- [x] Cross-region edge latency penalties
- [x] Zone failure injection
- [x] Global Accelerator node with region-aware failover behavior

### Traffic and networking

- [x] CDN
- [x] Traffic Generator
- [x] Load Balancer
- [x] Firewall
- [x] NAT Gateway
- [x] Rate Limiter
- [x] Service Mesh
- [x] API Gateway

### Compute and async processing

- [x] App Server with autoscaling, warm pool, cold start, and cooldown tracking
- [x] Cloud Function
- [x] Cron Job
- [x] Worker Pool
- [x] Pub/Sub

### Data and storage

- [x] Cache
- [x] Database with shard and replica-aware load handling
- [x] Cloud Storage
- [x] Block Storage
- [x] Network Storage

### Utility and simulator UX

- [x] Comment node
- [x] Metrics dashboard
- [x] Event log
- [x] JSON import and export
- [x] Architecture templates and scenarios

## High Priority Next Work

- [ ] Expand automated SimulationEngine coverage for overload, failover, routing, and stateful component behavior.
- [ ] Refresh COMPONENTS.md so it documents all shipped nodes, including Firewall, NAT Gateway, Public Subnet, Private Subnet, Rate Limiter, Service Mesh, Global Accelerator, Region, Availability Zone, Block Storage, and Network Storage.

## Medium Priority Backlog

- [ ] Add Stream Processing with backpressure and checkpointing behavior.
- [ ] Add Search Engine / Index node with indexing vs query tradeoffs.
- [ ] Add Message Queue as a distinct point-to-point primitive separate from Pub/Sub.
- [ ] Add Data Lake / Warehouse for analytics-oriented throughput and slot contention.
- [ ] Add Monitoring / Alerting node for observability pipeline behavior.
- [ ] Add ML Inference node with CPU / GPU capacity and batch-latency tradeoffs.

## Ongoing Quality Tasks

- [ ] Keep README and TODO component counts and feature summaries aligned with the shipped node set.
- [ ] Keep traffic pattern documentation synchronized between the simulation engine and the simulation store.
- [ ] Add more architecture templates that exercise multi-region failover, queue-heavy workloads, and service-mesh routing.

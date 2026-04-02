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

- [ ] Define autoscaling strategy modes and behavior contracts: Target Tracking, Scheduled, and Predictive (inputs, trigger logic, cooldown interaction, and UI controls).
- [ ] Build a resource "Controller" UI for bulk multi-region/multi-zone management (Terraform-style UX): define a service by type once (for example, "Orders"), choose region and AZ span, and configure shared min/max node or resource counts that fan out to all generated instances. Phase 1 scope: manage app servers, storage types, and compute nodes; add other managers later.
- [ ] Enforce app server active-standby warm-capacity invariants: always maintain configured warm node count, and guarantee `activeInstances + warmReserve <= maxInstances` during scale-up, scale-down, and warm-pool refill.
- [ ] Enforce primary-only write routing for databases: all write traffic must route to the configured Primary DB (regardless of its zone), and in multi-region topologies all writes must always go to that primary while replicas remain read-only targets.
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

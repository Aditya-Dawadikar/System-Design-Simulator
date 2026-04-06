# TODO - System Design Simulator

Last refreshed: April 6, 2026

This file reflects the current codebase state and active delivery plan.
**Current priority is Phase 2: Terraform-like YAML infrastructure authoring.**
Any unfinished simulator work from the earlier milestone is now tracked under the Phase 1 backlog.


## Phase 2 Priority Todo List

Phase 2 focus: **Terraform-like YAML infrastructure authoring** for the simulator.

### P0 - Foundation (do first)

- [x] Define the YAML DSL contract and canonical example files for single-region and multi-region topologies.
- [x] Create the `src/iac/` foundation: `schema.ts`, `parser.ts`, `validate.ts`, `normalize.ts`, `toTopology.ts`, and `fromTopology.ts`.
- [x] Add YAML parsing with actionable error reporting, including line/path context where possible.
- [x] Add schema and semantic validation for duplicate IDs, unknown resource types, invalid placements, and broken connections.
- [x] Convert validated YAML into simulator `nodes`, `edges`, `nodeConfigs`, and `edgeConfigs`.
- [x] Add a safe `Apply YAML` flow that only updates the stores and canvas when validation passes.
- [x] Auto-generate simulator IaC whenever a topology is created or edited through drag-and-drop on the canvas.
- [ ] Add IaC coverage for all existing architecture templates and shipped starter architectures.
- [x] Ensure a brand-new screen starts with both the canvas and the IaC editor empty.
- [x] Keep the canvas and IaC in full two-way sync at all times, regardless of whether edits start in the editor or on the canvas.
- [x] Make auto-generated IaC capture the complete node state, including default-valued and previously untouched fields.
- [x] Scope IaC state per architecture so opening a different architecture/file only shows its own corresponding IaC.

### P1 - Authoring Experience

- [x] Build a YAML editor panel/drawer with starter template, `Validate`, `Apply`, and `Reset` actions.
- [x] Make the `STARTER` action load the template into the editor without mutating the canvas until `Apply` is clicked.
- [x] Auto-layout imported topologies so the first render is readable and usable.
- [x] Export the current canvas back to YAML with stable IDs and consistent field ordering.
- [x] Add example templates for `three-tier`, `multi-az`, and `event-driven` architectures.

### P2 - Quality and Polish

- [x] Add round-trip tests for import/export stability and config mapping correctness.
- [ ] Add friendly warnings for unsupported combinations and partial-fidelity exports.
- [ ] Add schema hints/autocomplete and an optional format action for the YAML editor.
- [ ] Document the YAML DSL and workflow in `README.md` with example usage.
- [ ] Create a dedicated IaC authoring tutorial document that walks users through writing simulator YAML step by step.


## Phase 1: Shipped Now

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

## Phase 1: Backlog

These are remaining pending items from the earlier simulator milestone. They stay important, but are no longer the active top priority.

### Carry-over simulator work

- [ ] Build a resource "Controller" UI for bulk multi-region/multi-zone management (Terraform-style UX): define a service by type once (for example, "Orders"), choose region and AZ span, and configure shared min/max node or resource counts that fan out to all generated instances. Phase 1 scope: manage app servers, storage types, and compute nodes; add other managers later.
- [x] Expand automated `SimulationEngine` coverage for overload, failover, routing, and stateful component behavior.
- [x] Refresh `COMPONENTS.md` so it documents all shipped nodes, including Firewall, NAT Gateway, Public Subnet, Private Subnet, Rate Limiter, Service Mesh, Global Accelerator, Region, Availability Zone, Block Storage, and Network Storage.

### Future component backlog

- [ ] Add Stream Processing with backpressure and checkpointing behavior.
- [ ] Add Search Engine / Index node with indexing vs query tradeoffs.
- [ ] Add Message Queue as a distinct point-to-point primitive separate from Pub/Sub.
- [ ] Add Data Lake / Warehouse for analytics-oriented throughput and slot contention.
- [ ] Add Monitoring / Alerting node for observability pipeline behavior.
- [ ] Add ML Inference node with CPU / GPU capacity and batch-latency tradeoffs.

### Ongoing quality tasks

- [ ] Keep `README.md` and `TODO.md` component counts and feature summaries aligned with the shipped node set.
- [ ] Keep traffic pattern documentation synchronized between the simulation engine and the simulation store.
- [ ] Add more architecture templates that exercise multi-region failover, queue-heavy workloads, and service-mesh routing.

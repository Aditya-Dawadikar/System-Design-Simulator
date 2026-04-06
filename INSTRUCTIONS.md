# System Design Simulator - Implementation Instructions
## Current Phase: Terraform-like YAML Infrastructure Authoring

---

## PRODUCT CONTEXT

Phase 1 is already in place: the simulator has a visual canvas, component library, inspector, simulation engine, dashboard, and scenario support.

The next phase is to add an **Infrastructure-as-Code authoring workflow** so a user can define an entire system in one YAML file and have the simulator build and configure the topology automatically.

This feature should feel inspired by Terraform, but tailored to the simulator:
- declarative
- human-readable
- single-file first
- strongly validated
- easy to round-trip between YAML and the canvas

The YAML will be used to describe infrastructure, service placement, connectivity, traffic behavior, and deployment settings inside the simulator.

---

## PHASE GOAL

Enable this core workflow:

1. User opens a YAML editor in the app
2. User writes or pastes one simulator YAML document
3. The app validates the document and shows clear errors if needed
4. On import/apply, the canvas is generated automatically
5. All node configs, edge configs, placement, scaling, and traffic settings are populated
6. The simulation can run immediately against the generated topology
7. Later, the current canvas can be exported back to YAML

If this loop works well, the app becomes both:
- a visual simulator
- a lightweight system-design IaC playground

---

## IMPORTANT PRODUCT RULE

This is **not** real Terraform execution against AWS, GCP, or Azure.

We are building a **Terraform-like YAML DSL for the simulator itself**.
It should model infrastructure and service deployment in the application, not provision real cloud resources.

Think:
- `terraform plan/apply` experience
- YAML syntax instead of HCL
- simulator-native resources and deployment semantics

---

## TECH STACK (CURRENT CODEBASE)

- **Framework**: `Next.js`
- **UI**: `React`
- **Canvas**: `React Flow`
- **State**: `Zustand`
- **Styling**: `Tailwind CSS`
- **Charts**: `Recharts`
- **Language**: `TypeScript`

The YAML pipeline should plug into the existing `architectureStore`, `simulationStore`, `SimulationEngine.ts`, and canvas/inspector workflow.

---

## PHASE SCOPE

### In scope
- YAML schema for simulator-defined infrastructure
- Parser + validator
- Transform YAML into `nodes`, `edges`, `nodeConfigs`, and `edgeConfigs`
- `Apply YAML` action that populates the canvas
- Structured error messages with line/context when possible
- Starter examples/templates
- Export current topology back into YAML
- Deterministic round-trip behavior where practical

### Nice to have in this phase, but not needed
- YAML live preview / diff before apply
- Format button
- Schema hints / autocomplete
- Import warnings for unsupported or invalid combinations

### Explicitly out of scope
- Real cloud provisioning
- Terraform provider compatibility
- HCL parsing
- Secrets management
- Remote state files / backend config
- Modules, workspaces, and interpolation parity with Terraform
- CI/CD deployment to real infrastructure

---

## DESIGN PRINCIPLES FOR THE YAML DSL

1. **Single file first**
   - One file should be enough to describe a working topology.

2. **Declarative, not imperative**
   - Users declare desired resources and connections.
   - The app builds the canvas from that state.

3. **Stable IDs**
   - Every resource must have a unique `id`.
   - Connections refer to resource IDs.

4. **Simulator-native vocabulary**
   - Use the current component types such as `cdn`, `load_balancer`, `app_server`, `cache`, `database`, etc.

5. **Explicit placement**
   - `global`, `region`, and `zone` placement should map cleanly to the simulator's scope model.

6. **Predictable mapping**
   - YAML fields should map directly to existing `NodeConfig` and `EdgeConfig` fields wherever possible.

7. **Human-readable errors**
   - Validation must explain what is wrong and how to fix it.

---

## PROPOSED YAML SHAPE

The first version should support these top-level sections:

```yaml
version: 1
name: checkout-platform
description: Multi-AZ API with cache and database

globals:
  peakRps: 4500
  trafficPattern: ramp

regions:
  - id: us-east-1
    label: us-east-1
    zones:
      - id: use1a
        label: us-east-1a
      - id: use1b
        label: us-east-1b

resources:
  - id: edge
    type: cdn
    label: Global CDN
    placement:
      scope: global
    spec:
      pops: 4
      cacheablePct: 70
      bandwidthGbps: 150

  - id: api-lb
    type: load_balancer
    label: Public API LB
    placement:
      region: us-east-1
    spec:
      algorithm: least_conn
      healthChecks: true

  - id: api-a
    type: app_server
    label: API Server A
    placement:
      zone: use1a
    deploy:
      instances: 3
      cpuCores: 4
      ramGb: 8
      rpsPerInstance: 600
      workloadType: io_bound
      autoscaling:
        enabled: true
        strategy: target_tracking
        minInstances: 2
        maxInstances: 10
        targetMetric: load
        targetValue: 70

  - id: api-b
    type: app_server
    label: API Server B
    placement:
      zone: use1b
    deploy:
      instances: 3
      cpuCores: 4
      ramGb: 8
      rpsPerInstance: 600

  - id: redis
    type: cache
    label: Session Cache
    placement:
      zone: use1a
    spec:
      memoryGb: 16
      ttlSeconds: 120
      evictionPolicy: lru

  - id: postgres-primary
    type: database
    label: Orders DB
    placement:
      zone: use1b
    spec:
      engine: PostgreSQL
      shards: 2
      storageGb: 500
      maxConnections: 400
      dbRole: primary

connections:
  - from: edge
    to: api-lb
    protocol: REST
    timeoutMs: 3000

  - from: api-lb
    to: api-a
    protocol: REST
    splitPct: 50

  - from: api-lb
    to: api-b
    protocol: REST
    splitPct: 50

  - from: api-a
    to: redis
    protocol: TCP

  - from: api-a
    to: postgres-primary
    protocol: TCP

scenarios:
  - type: steady_state
  - type: fail_zone
    target: use1a
    enabled: false
```

---

## YAML-TO-SIMULATOR MAPPING

| YAML concept | Maps to |
|---|---|
| `resources[]` | React Flow `nodes[]` |
| `connections[]` | React Flow `edges[]` |
| `placement.region` | `nodeConfig.regionId` |
| `placement.zone` | `nodeConfig.zoneId` |
| `spec.*` / `deploy.*` | `nodeConfigs[nodeId]` |
| `protocol`, `timeoutMs`, `retryCount`, `splitPct` | `edgeConfigs[edgeId]` |
| `globals.peakRps` | simulation control defaults |
| `globals.trafficPattern` | simulation pattern default |
| `scenarios[]` | later scenario/failure presets |

---

## MINIMUM SUPPORTED RESOURCE TYPES FOR V1

The initial YAML importer/exporter must support the existing simulator resource set, prioritizing:

- `traffic_generator`
- `cdn`
- `global_accelerator`
- `load_balancer`
- `api_gateway`
- `app_server`
- `cache`
- `database`
- `pubsub`
- `cloud_function`
- `worker_pool`
- `cloud_storage`
- `rate_limiter`
- `service_mesh`
- `nat_gateway`
- `firewall`
- `region`
- `availability_zone`

If a type already exists in the simulator, prefer enabling it in YAML rather than inventing a parallel model.

---

## VALIDATION RULES

The first validator should catch at least:

- Missing `version`
- Missing or duplicate resource IDs
- Unknown `type`
- Invalid `from` / `to` connection targets
- Zone references that do not exist
- Regional resources missing `placement.region`
- Zonal resources missing `placement.zone`
- Global resources incorrectly pinned to a zone
- Unsupported fields for a given resource type
- Invalid enum values
- Circular references or impossible topologies when they matter

Validation should return:
- Message
- Severity (`error` / `warning`)
- YAML path if available
- Line/column if available

---

## INTERNAL ARCHITECTURE FOR THIS FEATURE

Implement the feature as a small compiler pipeline:

```text
YAML text
  -> parse
  -> validate schema
  -> normalize defaults
  -> resolve placement / references
  -> convert to simulator topology
  -> apply to stores
  -> render on canvas
```

Recommended folder direction:

```text
src/
+-- iac/
|   +-- schema.ts              # types / zod schema / validation helpers
|   +-- parser.ts              # YAML parse + error handling
|   +-- validate.ts            # semantic validation
|   +-- normalize.ts           # fill defaults / ids / derived values
|   +-- toTopology.ts          # YAML model -> nodes/edges/config maps
|   +-- fromTopology.ts        # export current canvas -> YAML model
|   +-- examples/
|       +-- three-tier.yaml
|       +-- multi-az.yaml
|       +-- event-driven.yaml
```

Use small pure functions and keep the importer/exporter testable without UI.

---

## UI / UX REQUIREMENTS

Add a simple but polished authoring workflow:

### YAML editor experience
- A panel, modal, or drawer for editing YAML
- Starter template button
- `Apply` / `Validate` / `Reset` actions
- Clear error list when parsing fails
- Do not partially mutate the canvas on invalid apply

### Canvas sync behavior
- Applying valid YAML replaces or refreshes the current topology deterministically
- Node positions may be auto-laid out initially
- Users can still manually refine the canvas after import

### Export behavior
- Export current canvas into readable YAML
- Preserve stable IDs when possible
- Keep field ordering consistent for clean diffs

---

## INCREMENTAL IMPLEMENTATION PLAN

Build this phase in small, working steps:

```text
Step 1: Define the YAML DSL contract and examples in code
Step 2: Add YAML parsing with safe error handling
Step 3: Add schema + semantic validation
Step 4: Convert validated YAML into simulator topology data
Step 5: Add `Apply YAML` to populate the canvas/store
Step 6: Add a basic YAML editor UI with validation feedback
Step 7: Support export from current topology back to YAML
Step 8: Add round-trip tests and fixture coverage
Step 9: Add templates for common architectures
Step 10: Polish UX (formatting, docs, examples, diff/preview)
```

Each step should leave the app runnable and demonstrably improved.

---

## TESTING REQUIREMENTS

This feature must be implemented with real behavior tests, not mock-only UI tests.

Add focused tests for:
- Parse success / parse failure
- Duplicate IDs
- Invalid references
- Correct region/zone assignment
- Correct node and edge counts after import
- Config mapping for `app_server`, `database`, `load_balancer`, and `cdn`
- Round-trip export/import stability for representative templates

Prefer unit tests around pure YAML transformation functions plus a few integration tests for store application.

---

## WHAT SUCCESS LOOKS LIKE FOR THIS PHASE

A user should be able to:

1. Open the YAML authoring surface
2. Paste a valid simulator YAML file
3. Click `Apply`
4. See the full architecture appear on the canvas automatically
5. Run the simulation immediately with the imported topology
6. Export the current design back to YAML and get a clean, readable document

If that loop works reliably, the phase is successful.

---

## FUTURE PHASES AFTER THIS

Do not block this phase on these, but keep the design extensible for:

- Reusable modules
- Variables and environment overrides
- Schema-driven autocomplete
- Live plan/diff visualization
- Scenario bundles
- Kubernetes-style workload blocks
- Cost estimation from YAML
- AI-assisted YAML generation from prompts

---

## NOTES FOR IMPLEMENTATION

- Keep the YAML schema aligned with existing `ComponentType`, `NodeConfig`, and `EdgeConfig` shapes.
- Prefer a simulator-specific DSL over pretending to support full Terraform compatibility.
- Do not couple parsing logic to React components.
- Keep import/export code pure and testable.
- Favor deterministic output so exported YAML remains diff-friendly.
- Validation errors must be actionable and easy to understand.
- Build incrementally and keep the app working at every step.

Read the following files to understand the current state of the application:

1. `src/types/index.ts` — all types, NodeConfig fields, NodeMetrics, ComponentDetail union
2. `src/simulation/SimulationEngine.ts` — tick logic, per-component failure modes, autoscaling FSM
3. `src/constants/components.ts` — all component types, defaults, capacity constants
4. `src/store/architectureStore.ts` — canvas state, node/edge config persistence
5. `src/store/simulationStore.ts` — simulation loop, event generation, traffic patterns
6. `src/components/canvas/Canvas.tsx` — React Flow setup, node type registry
7. `src/components/inspector/` — all inspector field files (list with Glob if needed)
8. `src/components/simulation/` — NodeMetricCard, SimulationPanel, any other simulation UI
9. `src/components/shared/` — shared components (ArcGauge, Sparkline, etc.)
10. `package.json` — dependencies and scripts

Then update **both** of the following files to accurately reflect the current state:

---

## CLAUDE.md

Rewrite `CLAUDE.md` at the project root as a comprehensive technical reference for future Claude sessions. It must include:

- **Stack**: framework, key libraries with versions from package.json
- **Project structure**: directory tree with one-line descriptions of each folder
- **All component types**: list every `ComponentType` from constants, with their icon, color, and simulation behavior
- **NodeConfig fields**: full list organized by component type
- **NodeMetrics + ComponentDetail**: all metric fields and every `kind` variant of the detail union
- **SimulationEngine contract**: function signature, what `previousMetrics` is used for, p99 placement, load/failed/errorRate mutation pattern
- **Per-component tick behavior**: what each component type computes (failure modes, capacity limits, state carried forward)
- **Autoscaling FSM** (app_server): full state machine description — warm pool priority, cold provision countdown, cooldowns, min/max clamps
- **Capacity formulas**: CDN (RPS_PER_POP × pops), LB (LB_RPS_MAX), Cache (CACHE_RPS_MAX), App Server (instances × rpsPerInstance), DB (shards × rpsPerShard), etc.
- **Traffic patterns**: steady, ramp, spike, wave, chaos — what multiplier each produces
- **Adding a new component type**: step-by-step checklist (types, constants, SimulationEngine case, inspector fields, NodeMetricCard detail row)
- **Known gotchas**: Next.js 'use client' requirement, default exports only, CSS import order, React Flow node registration

Keep it concise and structured — this file is read by Claude at the start of every session.

---

## README.md

Rewrite `README.md` as a polished user-facing document. It must include:

- **Project title and one-line description**
- **Screenshot / demo** placeholder (keep existing gif reference if present)
- **Features list**: all component types with icons, simulation behaviors, autoscaling, traffic patterns, inspector panels
- **Getting started**: prerequisites, install, dev server command
- **How to use**: brief walkthrough — drag components, connect edges, configure inspector, run simulation, read metrics
- **Component reference table**: columns — Icon | Name | Key Config | What it simulates
- **Traffic patterns**: table of all 5 patterns with description
- **Tech stack**: Next.js, React Flow, Zustand, TypeScript

Do not add emojis unless they were already present. Keep tone professional.

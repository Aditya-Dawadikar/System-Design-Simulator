# System Design Simulator


An interactive web simulator for visualizing, designing, and experimenting with distributed system architectures. Built with Next.js 16 (App Router), React 19, Zustand 5, React Flow 11, and Tailwind CSS v4.

---

![System Design Simulator Demo](./views/sys_design_sim.gif)

## Features


## Features

- **Drag-and-drop Canvas:** Build architectures with a wide range of node types (App Server, Database, Cache, CDN, Load Balancer, Cloud Function, Pub/Sub, Worker Pool, Cron Job, Traffic Generator, and more). Connect them with edges.
- **Live Simulation:** Simulate traffic, failures, autoscaling, and observe real-time metrics (RPS, latency, error rate, load, scaling events, etc).
- **Metrics Dashboard:** View global and per-node metrics, sparklines, and event logs. Dashboard is draggable and resizable.
- **Context Menus:** Right-click nodes/edges for quick actions (delete, inspect, etc).
- **Customizable Nodes:** Node RPS and capacity depend on realistic parameters (RAM, CPU, concurrency, etc). Supports autoscaling FSM for app servers.
- **Event Log:** Track simulation events, warnings, errors, and component-specific events in real time.
- **Modern UI:** Dark terminal/datacenter aesthetic with glassy panels, JetBrains Mono, and smooth interactions.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
# or
yarn install
```

### Running the App
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure


## Architecture & Source Layout

```
src/
├── app/                        # Next.js App Router (layout, page, global styles)
├── components/
│   ├── canvas/                 # React Flow canvas, node & edge components
│   ├── inspector/              # Inspector panels for node configs
│   ├── shared/                 # ArcGauge, Sparkline, StatCell, Badge, etc.
│   ├── sidebar/                # ComponentLibrary drag-source
│   └── simulation/             # Metrics dashboard, event log, controls
├── constants/                  # Component definitions (icons, colors, defaults)
├── simulation/                 # Pure TypeScript simulation engine
├── store/                      # Zustand stores (architecture & simulation)
├── templates/                  # Default architecture templates
└── types/                      # All shared TypeScript types
```

### Key Conventions
- All interactive components must have `'use client'` at the top
- All components use **default exports**
- Path alias `@/` maps to `src/`
- `globals.css` must import Google Fonts **before** Tailwind
- Uses CSS variables for theming: `--bg-base`, `--bg-panel`, `--border`, `--text`, `--accent-*`
- All node types registered in `Canvas.tsx`; custom edge type is `'wire'`

## Customization

## Simulation Engine
- Pure TypeScript (no React imports)
- 500ms tick loop, stateful simulation (autoscaling, lag, cold starts, etc)
- All per-type logic in `SimulationEngine.ts` (see comments for extension points)
- Passes previous metrics for stateful components
- Autoscaling FSM for app servers (warm/cold pool, cooldowns, pending, etc)
- Capacity formulas per type (see CLAUDE.md for details)

## Contributing

## Extending the Simulator

To add a new component type:
1. Add the string literal to `ComponentType` in `types/index.ts`
2. Add a `ComponentDetail` variant if it has unique metrics
3. Add NodeConfig fields if configurable
4. Add a `ComponentDefinition` entry in `constants/components.ts`
5. Create `src/components/canvas/nodes/YourTypeNode.tsx`
6. Create `src/components/inspector/fields/YourTypeFields.tsx`
7. Register the node type in `Canvas.tsx`
8. Add the type to `Inspector.tsx` field dispatch
9. Add a `case 'your_type':` in the `switch(type)` in `SimulationEngine.ts`
10. Handle `computeCapacity` and `computeBaseLatency` for the new type

---

## Contributing
Pull requests and issues are welcome! Please open an issue to discuss major changes.

## License
MIT

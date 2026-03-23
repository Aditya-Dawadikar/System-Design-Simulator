# System Design Playground — Claude Code Prompt
## Phase 1: Drag & Drop Canvas + 3-Tier Simulation Dashboard

---

## PRODUCT VISION (context for all decisions)

We are building a **System Design Playground** — a visual tool where engineers and students can:
1. Drag and drop infrastructure components onto a canvas
2. Wire them together to form an architecture
3. Run traffic simulations on the designed topology
4. Observe failures, bottlenecks, and scaling behavior in real time

The long-term vision includes multi-layer views (Hardware → Network → K8s → Services → Data),
Terraform/Kubernetes YAML import to auto-generate topologies, node template configuration
(CPU/RAM/GPU), region/AZ modeling, and chaos engineering scenarios.

**Phase 1 scope: nail the foundation.** A polished drag-and-drop canvas with a 3-tier
architecture (CDN → Load Balancer → App Servers → Cache → Database) and a live simulation
dashboard. Everything else builds on top of this.

---

## TECH STACK

- **Framework**: React (Vite)
- **Canvas**: React Flow (https://reactflow.dev) — handles drag/drop, pan/zoom, edge wiring
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Charts/Metrics**: Recharts
- **Icons**: Lucide React
- **Language**: TypeScript

Install dependencies:
```bash
npm create vite@latest system-design-playground -- --template react-ts
cd system-design-playground
npm install reactflow zustand recharts lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## VISUAL DESIGN DIRECTION

Dark terminal/datacenter aesthetic. Think server room monitoring dashboard.

```
Background:     #05070b  (near black)
Panel:          #0b1016
Border:         #172030
Accent green:   #00ff88  (healthy/running)
Accent cyan:    #00ddff  (CDN/gateway)
Accent yellow:  #ffcc00  (warning/stressed)
Accent red:     #ff3355  (failed/critical)
Accent purple:  #bb66ff  (database)
Accent orange:  #ff8833  (cache)
Accent pink:    #ff55bb  (load balancer)
Text:           #b0c8e0
Text dim:       #a1b3bf
Font:           'JetBrains Mono', monospace (use Google Fonts)
```

Every component card should feel like a real monitoring widget — live metrics, sparklines,
status indicators, load gauges. NOT a generic flowchart box.

---

## APPLICATION STRUCTURE

```
src/
├── components/
│   ├── canvas/
│   │   ├── Canvas.tsx              # React Flow wrapper, pan/zoom
│   │   ├── ComponentNode.tsx       # Base node renderer
│   │   ├── EdgeWire.tsx            # Custom animated edge
│   │   └── nodes/
│   │       ├── CdnNode.tsx
│   │       ├── LoadBalancerNode.tsx
│   │       ├── AppServerNode.tsx
│   │       ├── CacheNode.tsx
│   │       └── DatabaseNode.tsx
│   ├── sidebar/
│   │   ├── ComponentLibrary.tsx    # Draggable component palette
│   │   └── ComponentItem.tsx       # Individual draggable item
│   ├── inspector/
│   │   ├── Inspector.tsx           # Right panel — selected node config
│   │   └── fields/                 # Config fields per component type
│   ├── simulation/
│   │   ├── SimulationEngine.ts     # Core sim logic (tick-based)
│   │   ├── SimulationControls.tsx  # RPS slider, pattern picker, run/stop
│   │   └── MetricsDashboard.tsx    # Bottom panel — live charts
│   └── shared/
│       ├── Sparkline.tsx
│       ├── ArcGauge.tsx
│       ├── Badge.tsx
│       └── StatCell.tsx
├── store/
│   ├── architectureStore.ts        # Nodes, edges, component configs
│   └── simulationStore.ts          # Running state, metrics, history
├── types/
│   └── index.ts                    # All shared TypeScript types
└── constants/
    └── components.ts               # Component definitions & defaults
```

---

## PHASE 1 COMPONENTS (the 3-tier stack)

These are the ONLY components needed for Phase 1. Build them well — they are templates
for every future component.

### 1. CDN
```typescript
{
  type: 'cdn',
  label: 'CDN Edge',
  icon: '◎',
  color: '#00ddff',
  defaults: {
    pops: 2,                    // Points of presence (1-4)
    cacheablePct: 60,           // % of traffic served from edge
    bandwidthGbps: 100,         // Total edge bandwidth
  },
  capacity: {
    rpsPerPop: 25000,
  }
}
```

### 2. Load Balancer
```typescript
{
  type: 'load_balancer',
  label: 'Load Balancer',
  icon: '⇌',
  color: '#ff55bb',
  defaults: {
    algorithm: 'round_robin',   // round_robin | least_conn | ip_hash | random | weighted
    healthChecks: true,
    maxConnections: 100000,
  },
  capacity: {
    rpsMax: 50000,
  }
}
```

### 3. App Server
```typescript
{
  type: 'app_server',
  label: 'App Server',
  icon: '◈',
  color: '#00ff88',
  defaults: {
    instances: 2,               // Horizontal replicas (1-16)
    cpuCores: 4,
    ramGb: 8,
    rpsPerInstance: 500,        // Throughput capacity per instance
    avgLatencyMs: 40,           // Base processing latency
  }
}
```

### 4. Cache (Redis)
```typescript
{
  type: 'cache',
  label: 'Redis Cache',
  icon: '⚡',
  color: '#ff8833',
  defaults: {
    memoryGb: 8,
    ttlSeconds: 60,
    evictionPolicy: 'lru',      // lru | lfu | noeviction
    clusterMode: false,
  },
  capacity: {
    rpsMax: 100000,
  }
}
```

### 5. Database
```typescript
{
  type: 'database',
  label: 'PostgreSQL',
  icon: '▣',
  color: '#bb66ff',
  defaults: {
    instanceType: 'db.m5.large',
    storageGb: 100,
    maxConnections: 200,
    readReplicas: 0,            // 0-4
    shards: 1,                  // 1-4
    rpsPerShard: 800,
  }
}
```

---

## CANVAS BEHAVIOR

### Drag from sidebar → canvas
- Component library on the left shows all available components
- User drags a component → it drops onto the canvas as a node
- Node immediately shows its label, icon, color, and default config
- Node is selectable (click to open inspector on right)

### Wiring
- Hover over a node → connection handles appear (React Flow standard)
- Drag from handle to handle to create a wire (edge)
- Edge shows: protocol label (REST/gRPC/TCP), animated flow dots when simulation running
- Edge color matches the source node color
- Click edge to configure: latency, bandwidth cap, protocol, timeout

### Canvas controls
- Mouse wheel / pinch to zoom
- Click + drag empty space to pan
- Right-click node → Delete, Duplicate, Configure
- Select multiple nodes → group them
- Keyboard: Delete to remove selected, Ctrl+Z to undo

### Pre-loaded starter template
When the app loads for the first time, the canvas is NOT empty. It loads a default
3-tier architecture so users immediately see the value:

```
[CDN] ──→ [Load Balancer] ──→ [App Server x2]
                                      │
                          [Redis Cache] ←→ [PostgreSQL]
```

This is the "hello world" of the playground. User can run simulation immediately
without configuring anything.

---

## SIMULATION ENGINE

The simulation engine is tick-based (runs every 500ms when active).

### Core algorithm (per tick):

```typescript
function simulateTick(topology: Topology, incomingRps: number): TickResult {
  // 1. Traverse the graph in topological order (BFS from source nodes)
  // 2. For each node, compute:
  //    - rpsIn: traffic arriving from upstream connections
  //    - capacity: based on node config (instances × rpsPerInstance, etc.)
  //    - load: rpsIn / capacity (0.0 to 1.2+)
  //    - failed: load > 1.05
  //    - latency: base + queueing factor (load²) + upstream latencies
  //    - errorRate: 0 when healthy, spikes when overloaded
  //    - rpsOut: rpsIn × (1 - dropRate) — what passes to downstream
  // 3. Special rules:
  //    - CDN: absorbs cacheablePct% of traffic, only originRps flows downstream
  //    - Cache: hitRate reduces DB load by up to 85%
  //    - LoadBalancer: distributes rpsOut evenly across connected App Servers
  //    - Database: total capacity = shards × rpsPerShard
  // 4. Return metrics for every node + edge
}
```

### Traffic patterns (same as our prototypes):
- STEADY: constant at peak
- RAMP: linear increase to 1.6× peak over 60s
- SPIKE: 3.5× every 30s, baseline 0.35×
- WAVE: sinusoidal
- CHAOS: random multiplier each tick

### What the simulation must handle:
- **Arbitrary topologies** — not hardcoded 3-tier. User might connect CDN → DB directly. Handle it.
- **Cascading failures** — if a node fails, downstream nodes receive 0 rps or error responses
- **Disconnected nodes** — nodes with no incoming connections get 0 traffic (they're idle)
- **Cycles** — detect and warn, don't infinite loop

---

## INSPECTOR PANEL (right sidebar)

When a node is selected, the Inspector shows its configuration form.

Each component type has its own field set:

**App Server inspector:**
```
Instances        [slider 1-16, shows instance squares like our v5]
CPU per instance [select: 2/4/8/16 cores]
RAM per instance [select: 4/8/16/32 GB]
RPS per instance [number input, default 500]
Base latency     [slider 5-500ms]
```

**Database inspector:**
```
Engine           [select: PostgreSQL / MySQL / MongoDB / Redis / Cassandra]
Shards           [slider 1-8, shows capacity = shards × 800]
Read Replicas    [slider 0-4]
Max Connections  [number 10-10000]
Storage          [slider 10-10000 GB]
```

**Edge (wire) inspector:**
```
Protocol         [REST / gRPC / TCP / WebSocket]
Timeout          [ms]
Retry count      [0-5]
Circuit breaker  [toggle]
  └── Error threshold [% 0-100]
  └── Recovery timeout [ms]
Bandwidth cap    [Mbps, 0 = unlimited]
```

Changes in inspector immediately affect the next simulation tick.

---

## METRICS DASHBOARD (bottom panel)

Always visible. Shows live metrics for the running simulation.

### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ ▶ SIMULATION  [STEADY ▾] Peak RPS: ████████ 3000  [RUN] [↺] │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ LIVE RPS │ E2E LAT  │ ERR RATE │ STATUS   │ [node selector] │
│  3,000   │   142ms  │  0.0%    │ HEALTHY  │                 │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                                                             │
│  [Per-node metric cards — one per node in topology]        │
│  Each shows: load gauge, RPS, latency, error%, sparkline   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  EVENT LOG  T+12s › CDN warmed up — 68% edge hit rate      │
│             T+15s ⚠ App servers at 82% — scaling up?       │
└─────────────────────────────────────────────────────────────┘
```

### Per-node metric card (in dashboard):
- Matches the color of the node on canvas
- Arc gauge showing load %
- RPS in/out
- Avg latency + P99
- Error rate (red when > 5%)
- 40-point sparkline of RPS history
- Status badge: OK / STRESSED / CRITICAL / FAILED

### The canvas nodes ALSO show live metrics:
When simulation is running, each node on the canvas updates in real time:
- Border color changes: green → yellow → red based on load
- Shows current RPS and load % inside the node
- Animated edge dots speed up with more traffic, turn red on failure

---

## EVENT LOG

A scrolling log at the bottom showing simulation events with timestamps:

```typescript
type LogEvent = {
  tick: number;         // simulation time in seconds
  level: 'info' | 'warn' | 'error' | 'k8s';
  message: string;
  nodeId?: string;      // highlight the relevant node
}
```

Examples:
```
T+0s   › Simulation started — 3,000 rps STEADY pattern
T+3s   › CDN warming up — 31% edge hit rate
T+8s   › CDN warmed — 68% edge hit rate, 2,040 rps absorbed
T+12s  ⚠ App Server load at 78% — approaching capacity
T+15s  ✕ Database OVERLOADED — 1,200 rps vs 800 capacity
T+15s  ✕ Cascade: App Server receiving DB errors
T+18s  › User scaled Database to 2 shards — capacity now 1,600 rps
T+19s  › Database recovered
```

---

## STATE MANAGEMENT (Zustand stores)

### architectureStore
```typescript
interface ArchitectureStore {
  nodes: Node[];                    // React Flow nodes
  edges: Edge[];                    // React Flow edges
  nodeConfigs: Record<string, NodeConfig>;  // Per-node settings
  selectedNodeId: string | null;

  addNode: (type: ComponentType, position: XYPosition) => void;
  removeNode: (id: string) => void;
  updateNodeConfig: (id: string, config: Partial<NodeConfig>) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (id: string) => void;
  updateEdgeConfig: (id: string, config: Partial<EdgeConfig>) => void;
  setSelectedNode: (id: string | null) => void;
  loadTemplate: (template: ArchitectureTemplate) => void;
  exportToJSON: () => string;
  importFromJSON: (json: string) => void;
}
```

### simulationStore
```typescript
interface SimulationStore {
  running: boolean;
  tick: number;
  peakRps: number;
  pattern: TrafficPattern;
  nodeMetrics: Record<string, NodeMetrics>;
  edgeMetrics: Record<string, EdgeMetrics>;
  events: LogEvent[];
  history: Record<string, number[]>;   // nodeId → last 40 RPS values

  start: () => void;
  stop: () => void;
  reset: () => void;
  setPeakRps: (rps: number) => void;
  setPattern: (pattern: TrafficPattern) => void;
  _tick: () => void;                   // internal, called by interval
}
```

---

## TYPESCRIPT TYPES

```typescript
type ComponentType =
  | 'cdn'
  | 'load_balancer'
  | 'app_server'
  | 'cache'
  | 'database';

type TrafficPattern = 'steady' | 'ramp' | 'spike' | 'wave' | 'chaos';

type LoadBalancerAlgorithm =
  | 'round_robin'
  | 'least_conn'
  | 'ip_hash'
  | 'random'
  | 'weighted';

interface NodeMetrics {
  rpsIn: number;
  rpsOut: number;
  load: number;           // 0.0 to 1.2+
  latencyMs: number;
  p99LatencyMs: number;
  errorRate: number;      // 0.0 to 1.0
  failed: boolean;
}

interface EdgeMetrics {
  rps: number;
  latencyMs: number;
  isBottleneck: boolean;
}

interface NodeConfig {
  // CDN
  pops?: number;
  cacheablePct?: number;
  // Load Balancer
  algorithm?: LoadBalancerAlgorithm;
  healthChecks?: boolean;
  // App Server
  instances?: number;
  cpuCores?: number;
  ramGb?: number;
  rpsPerInstance?: number;
  avgLatencyMs?: number;
  // Cache
  memoryGb?: number;
  ttlSeconds?: number;
  // Database
  shards?: number;
  readReplicas?: number;
  maxConnections?: number;
}

interface EdgeConfig {
  protocol: 'REST' | 'gRPC' | 'TCP' | 'WebSocket';
  timeoutMs: number;
  retryCount: number;
  circuitBreaker: boolean;
  circuitBreakerThreshold: number;
  bandwidthMbps: number;        // 0 = unlimited
}
```

---

## WHAT SUCCESS LOOKS LIKE FOR PHASE 1

A user opens the app and within 30 seconds can:

1. See a pre-loaded 3-tier architecture on the canvas
2. Hit RUN and watch live metrics appear on every component
3. Drag the RPS slider up until the database turns red
4. Click the database, increase shards from 1 to 2 in the inspector, watch it recover
5. Drag a second App Server from the library, drop it on canvas, wire it to the Load Balancer
6. Watch load distribute across both app servers

That's the core loop. Everything else is polish.

---

## EXPLICITLY OUT OF SCOPE FOR PHASE 1

Do NOT build these yet — they are future phases:
- K8s cluster view / pod management
- Node templates (CPU/RAM/GPU editor)
- Region / AZ / VPC hierarchy
- Terraform import/export
- Kafka / message queues
- Service mesh
- Chaos scenarios
- Cost estimator
- User accounts / saving to cloud
- Collaboration features
- Mobile layout

---

## IMPLEMENTATION ORDER

Build in this exact order to always have something runnable:

```
Step 1: Project setup + Tailwind + fonts + color tokens
Step 2: Empty canvas with React Flow (pan, zoom, empty)
Step 3: Component library sidebar (draggable items, no canvas drop yet)
Step 4: Drag from sidebar → drops onto canvas as styled node
Step 5: Wire two nodes together (React Flow edges)
Step 6: Inspector panel opens on node click (read-only first)
Step 7: Inspector fields are editable, updates node label/config
Step 8: Load default 3-tier template on startup
Step 9: Simulation engine (SimulationEngine.ts) — pure logic, no UI
Step 10: Simulation controls (RPS slider, pattern, run/stop)
Step 11: Node metrics update on canvas during simulation (color, load %)
Step 12: Metrics dashboard (bottom panel, per-node cards, sparklines)
Step 13: Event log
Step 14: Edge animation during simulation (flow dots, color changes)
Step 15: Polish — transitions, empty states, keyboard shortcuts
```

---

## NOTES FOR CLAUDE CODE

- Use React Flow's `nodeTypes` to register all custom node components
- Use React Flow's `onDrop` + `onDragOver` for sidebar-to-canvas drag
- The simulation engine should be a plain TypeScript class/module, NOT a React component
- Run simulation with `setInterval(store._tick, 500)` managed in simulationStore
- Keep simulation logic pure — takes topology + config as input, returns metrics as output
- Use `useCallback` and `useMemo` aggressively — simulation updates every 500ms
- All monetary values use USD, all latency in ms, all throughput in rps or Mbps
- Persist architecture to localStorage on every change (auto-save)
- The canvas should have a subtle grid background (React Flow has this built in)
- Custom edges should use `EdgeLabelRenderer` for the protocol label

Start with Step 1. Ask for confirmation before moving to the next step.
Each step should result in a working, runnable state before proceeding.
```
import type { Node, Edge } from 'reactflow';
import type { ArchitectureTemplate, NodeConfig, EdgeConfig } from '@/types';
import { COMPONENT_BY_TYPE, DEFAULT_EDGE_CONFIG } from '@/constants/components';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, type: string, x: number, y: number): Node {
  const def = COMPONENT_BY_TYPE[type as keyof typeof COMPONENT_BY_TYPE];
  return { id, type, position: { x, y }, data: { label: def.label } };
}

function makeEdge(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target, type: 'wire' };
}

function makeConfig(type: string, overrides: Partial<NodeConfig> = {}): NodeConfig {
  const def = COMPONENT_BY_TYPE[type as keyof typeof COMPONENT_BY_TYPE];
  return { ...def.defaults, label: def.label, ...overrides };
}

function edgeConfigs(edges: Edge[]): Record<string, EdgeConfig> {
  return Object.fromEntries(edges.map((e) => [e.id, { ...DEFAULT_EDGE_CONFIG }]));
}

// ---------------------------------------------------------------------------
// Metadata wrapper
// ---------------------------------------------------------------------------

export interface ArchitectureEntry {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  template: ArchitectureTemplate;
}

// ---------------------------------------------------------------------------
// 1. Three-Tier Web App
// ---------------------------------------------------------------------------

function buildThreeTier(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('t3-tgen', 'traffic_generator', 80, 220),
    makeNode('t3-app', 'app_server', 360, 220),
    makeNode('t3-db', 'database', 640, 220),
  ];
  const edges: Edge[] = [
    makeEdge('t3-tgen', 't3-app'),
    makeEdge('t3-app', 't3-db'),
  ];
  return {
    nodes,
    edges,
    nodeConfigs: {
      't3-tgen': makeConfig('traffic_generator', { generatorRps: 500 }),
      't3-app': makeConfig('app_server', { instances: 2, rpsPerInstance: 400 }),
      't3-db': makeConfig('database', { readReplicas: 0 }),
    },
    edgeConfigs: edgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 2. Load-Balanced Web App with Cache
// ---------------------------------------------------------------------------

function buildCachedWebApp(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('cw-tgen', 'traffic_generator', 60, 260),
    makeNode('cw-lb', 'load_balancer', 300, 260),
    makeNode('cw-app', 'app_server', 540, 260),
    makeNode('cw-cache', 'cache', 780, 140),
    makeNode('cw-db', 'database', 780, 380),
  ];
  const edges: Edge[] = [
    makeEdge('cw-tgen', 'cw-lb'),
    makeEdge('cw-lb', 'cw-app'),
    makeEdge('cw-app', 'cw-cache'),
    makeEdge('cw-app', 'cw-db'),
  ];
  return {
    nodes,
    edges,
    nodeConfigs: {
      'cw-tgen': makeConfig('traffic_generator', { generatorRps: 2000 }),
      'cw-lb': makeConfig('load_balancer', { algorithm: 'round_robin' }),
      'cw-app': makeConfig('app_server', { instances: 3, rpsPerInstance: 600 }),
      'cw-cache': makeConfig('cache', { memoryGb: 16, ttlSeconds: 120 }),
      'cw-db': makeConfig('database', { readReplicas: 1 }),
    },
    edgeConfigs: edgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 3. CDN-Accelerated Web App
// ---------------------------------------------------------------------------

function buildCdnWebApp(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('cdn-tgen', 'traffic_generator', 40, 260),
    makeNode('cdn-cdn', 'cdn', 280, 260),
    makeNode('cdn-lb', 'load_balancer', 520, 260),
    makeNode('cdn-app', 'app_server', 760, 260),
    makeNode('cdn-db', 'database', 1000, 260),
  ];
  const edges: Edge[] = [
    makeEdge('cdn-tgen', 'cdn-cdn'),
    makeEdge('cdn-cdn', 'cdn-lb'),
    makeEdge('cdn-lb', 'cdn-app'),
    makeEdge('cdn-app', 'cdn-db'),
  ];
  return {
    nodes,
    edges,
    nodeConfigs: {
      'cdn-tgen': makeConfig('traffic_generator', { generatorRps: 5000, generatorPattern: 'wave' }),
      'cdn-cdn': makeConfig('cdn', { pops: 4, cacheablePct: 75 }),
      'cdn-lb': makeConfig('load_balancer', { algorithm: 'least_conn' }),
      'cdn-app': makeConfig('app_server', { instances: 4, rpsPerInstance: 500 }),
      'cdn-db': makeConfig('database', { readReplicas: 2, shards: 2 }),
    },
    edgeConfigs: edgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 4. Event-Driven Pipeline
// ---------------------------------------------------------------------------

function buildEventDriven(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('ev-tgen', 'traffic_generator', 60, 260),
    makeNode('ev-app', 'app_server', 300, 260),
    makeNode('ev-ps', 'pubsub', 560, 260),
    makeNode('ev-wk', 'worker_pool', 820, 260),
    makeNode('ev-db', 'database', 1080, 260),
  ];
  const edges: Edge[] = [
    makeEdge('ev-tgen', 'ev-app'),
    makeEdge('ev-app', 'ev-ps'),
    makeEdge('ev-ps', 'ev-wk'),
    makeEdge('ev-wk', 'ev-db'),
  ];
  return {
    nodes,
    edges,
    nodeConfigs: {
      'ev-tgen': makeConfig('traffic_generator', { generatorRps: 1000, generatorPattern: 'spike' }),
      'ev-app': makeConfig('app_server', { instances: 2 }),
      'ev-ps': makeConfig('pubsub', { partitions: 8, messageRetentionHours: 48 }),
      'ev-wk': makeConfig('worker_pool', { workerCount: 8, threadCount: 4, taskDurationMs: 300 }),
      'ev-db': makeConfig('database', { engine: 'PostgreSQL', readReplicas: 1 }),
    },
    edgeConfigs: edgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 5. Microservices
// ---------------------------------------------------------------------------

function buildMicroservices(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('ms-tgen', 'traffic_generator', 60, 300),
    makeNode('ms-lb', 'load_balancer', 300, 300),
    makeNode('ms-api', 'app_server', 540, 300),
    makeNode('ms-svc1', 'app_server', 800, 160),
    makeNode('ms-svc2', 'app_server', 800, 440),
    makeNode('ms-db1', 'database', 1060, 160),
    makeNode('ms-db2', 'database', 1060, 440),
  ];
  const edges: Edge[] = [
    makeEdge('ms-tgen', 'ms-lb'),
    makeEdge('ms-lb', 'ms-api'),
    makeEdge('ms-api', 'ms-svc1'),
    makeEdge('ms-api', 'ms-svc2'),
    makeEdge('ms-svc1', 'ms-db1'),
    makeEdge('ms-svc2', 'ms-db2'),
  ];
  return {
    nodes,
    edges,
    nodeConfigs: {
      'ms-tgen': makeConfig('traffic_generator', { generatorRps: 3000 }),
      'ms-lb': makeConfig('load_balancer', { algorithm: 'round_robin' }),
      'ms-api': makeConfig('app_server', { instances: 2, label: 'API Gateway' }),
      'ms-svc1': makeConfig('app_server', { instances: 3, label: 'User Service' }),
      'ms-svc2': makeConfig('app_server', { instances: 3, label: 'Order Service' }),
      'ms-db1': makeConfig('database', { label: 'Users DB', engine: 'PostgreSQL' }),
      'ms-db2': makeConfig('database', { label: 'Orders DB', engine: 'PostgreSQL', shards: 2 }),
    },
    edgeConfigs: edgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 6. Serverless API
// ---------------------------------------------------------------------------

function buildServerless(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('sl-tgen', 'traffic_generator', 100, 260),
    makeNode('sl-fn', 'cloud_function', 380, 260),
    makeNode('sl-db', 'database', 660, 260),
  ];
  const edges: Edge[] = [
    makeEdge('sl-tgen', 'sl-fn'),
    makeEdge('sl-fn', 'sl-db'),
  ];
  return {
    nodes,
    edges,
    nodeConfigs: {
      'sl-tgen': makeConfig('traffic_generator', { generatorRps: 800, generatorPattern: 'wave' }),
      'sl-fn': makeConfig('cloud_function', { maxConcurrency: 200, functionMemoryMb: 512, avgExecutionMs: 150 }),
      'sl-db': makeConfig('database', { engine: 'PostgreSQL', readReplicas: 1 }),
    },
    edgeConfigs: edgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 7. High-Availability Platform
// ---------------------------------------------------------------------------

function buildHighAvailability(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('ha-tgen', 'traffic_generator', 40, 280),
    makeNode('ha-cdn', 'cdn', 270, 280),
    makeNode('ha-lb', 'load_balancer', 500, 280),
    makeNode('ha-app', 'app_server', 740, 280),
    makeNode('ha-cache', 'cache', 980, 160),
    makeNode('ha-db', 'database', 980, 400),
  ];
  const edges: Edge[] = [
    makeEdge('ha-tgen', 'ha-cdn'),
    makeEdge('ha-cdn', 'ha-lb'),
    makeEdge('ha-lb', 'ha-app'),
    makeEdge('ha-app', 'ha-cache'),
    makeEdge('ha-app', 'ha-db'),
  ];
  return {
    nodes,
    edges,
    nodeConfigs: {
      'ha-tgen': makeConfig('traffic_generator', { generatorRps: 8000, generatorPattern: 'ramp' }),
      'ha-cdn': makeConfig('cdn', { pops: 6, cacheablePct: 70 }),
      'ha-lb': makeConfig('load_balancer', { algorithm: 'least_conn', healthChecks: true }),
      'ha-app': makeConfig('app_server', {
        instances: 3,
        rpsPerInstance: 600,
        autoscalingEnabled: true,
        minInstances: 2,
        maxInstances: 12,
        warmPoolEnabled: true,
        warmPoolSize: 2,
        scaleUpCpuPct: 70,
        scaleDownCpuPct: 30,
      }),
      'ha-cache': makeConfig('cache', { memoryGb: 32, clusterMode: true, ttlSeconds: 300 }),
      'ha-db': makeConfig('database', { readReplicas: 3, shards: 4, rpsPerShard: 1200 }),
    },
    edgeConfigs: edgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 8. Read-Heavy with Rate Limiting
// ---------------------------------------------------------------------------

function buildReadHeavy(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('rh-tgen', 'traffic_generator', 60, 260),
    makeNode('rh-rl', 'rate_limiter', 300, 260),
    makeNode('rh-lb', 'load_balancer', 540, 260),
    makeNode('rh-app', 'app_server', 780, 260),
    makeNode('rh-cache', 'cache', 1020, 140),
    makeNode('rh-db', 'database', 1020, 380),
  ];
  const edges: Edge[] = [
    makeEdge('rh-tgen', 'rh-rl'),
    makeEdge('rh-rl', 'rh-lb'),
    makeEdge('rh-lb', 'rh-app'),
    makeEdge('rh-app', 'rh-cache'),
    makeEdge('rh-app', 'rh-db'),
  ];
  return {
    nodes,
    edges,
    nodeConfigs: {
      'rh-tgen': makeConfig('traffic_generator', { generatorRps: 4000, readRatioPct: 85, generatorPattern: 'wave' }),
      'rh-rl': makeConfig('rate_limiter', { label: 'Rate Limiter' }),
      'rh-lb': makeConfig('load_balancer', { algorithm: 'ip_hash' }),
      'rh-app': makeConfig('app_server', { instances: 4, workloadType: 'io_bound' }),
      'rh-cache': makeConfig('cache', { memoryGb: 64, ttlSeconds: 600, evictionPolicy: 'lru' }),
      'rh-db': makeConfig('database', { readReplicas: 4, shards: 2, rpsPerShard: 1000 }),
    },
    edgeConfigs: edgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 9. Microservices with Service Mesh
// ---------------------------------------------------------------------------

function buildServiceMesh(): ArchitectureTemplate {
  const nodes: Node[] = [
    // Ingress
    makeNode('sm-tgen',    'traffic_generator', 60,   300),
    makeNode('sm-lb',      'load_balancer',     280,  300),
    makeNode('sm-mesh',    'service_mesh',      720,  300),
    // Services
    makeNode('sm-user',    'app_server',        960,  80),
    makeNode('sm-order',   'app_server',        960,  240),
    makeNode('sm-payment', 'app_server',        960,  400),
    makeNode('sm-notify',  'app_server',        960,  545),
    // Backing stores
    makeNode('sm-ucache',  'cache',             1190, 30),
    makeNode('sm-udb',     'database',          1190, 150),
    makeNode('sm-odb',     'database',          1190, 270),
    makeNode('sm-pdb',     'database',          1190, 420),
  ];

  const edges: Edge[] = [
    // Ingress chain
    makeEdge('sm-tgen',    'sm-lb'),
    makeEdge('sm-lb',    'sm-mesh'),
    // Mesh → services (weights set in meshRoutes; splitPct resolved at tick time)
    makeEdge('sm-mesh',    'sm-user'),
    makeEdge('sm-mesh',    'sm-order'),
    makeEdge('sm-mesh',    'sm-payment'),
    makeEdge('sm-mesh',    'sm-notify'),
    // Service → backing stores
    makeEdge('sm-user',    'sm-ucache'),
    makeEdge('sm-user',    'sm-udb'),
    makeEdge('sm-order',   'sm-odb'),
    makeEdge('sm-payment', 'sm-pdb'),
  ];

  return {
    nodes,
    edges,
    nodeConfigs: {
      // ── Ingress ──────────────────────────────────────────────────────────
      'sm-tgen': makeConfig('traffic_generator', {
        label:            'Traffic Generator',
        generatorRps:     800,
        generatorPattern: 'spike',   // 3.5× burst → stresses Payment Service
        readRatioPct:     65,
      }),
      'sm-lb': makeConfig('load_balancer', {
        label:        'Edge LB',
        algorithm:    'round_robin',
        healthChecks: true,
      }),
      'sm-api': makeConfig('app_server', {
        label:          'API Gateway',
        instances:      2,
        rpsPerInstance: 1200,
        workloadType:   'io_bound',
        avgLatencyMs:   15,
      }),

      // ── Service Mesh ─────────────────────────────────────────────────────
      // mTLS on, full observability, 2 retries, CB at 50%.
      // Routing table splits traffic 50/30/15/5 across the four services.
      // During a spike Payment Service (200 RPS cap) will overload → errorRate
      // rises → mesh CB opens → callers see fast-fail until service recovers.
      'sm-mesh': makeConfig('service_mesh', {
        label:                       'Service Mesh',
        mtlsEnabled:                 true,
        proxyOverheadMs:             2,
        observabilityLevel:          'full',
        meshRetryCount:              2,
        meshCircuitBreakerEnabled:   true,
        meshCircuitBreakerThreshold: 50,
        meshRoutes: [
          { id: 'smr1', sourceNodeId: 'sm-api', destNodeId: 'sm-user',    weightPct: 50 },
          { id: 'smr2', sourceNodeId: 'sm-api', destNodeId: 'sm-order',   weightPct: 30 },
          { id: 'smr3', sourceNodeId: 'sm-api', destNodeId: 'sm-payment', weightPct: 15 },
          { id: 'smr4', sourceNodeId: 'sm-api', destNodeId: 'sm-notify',  weightPct: 5  },
        ],
      }),

      // ── Services ─────────────────────────────────────────────────────────
      // User Service: 2× instances, comfortably handles its 50% share at normal
      // load; slightly stressed during spike peaks.
      'sm-user': makeConfig('app_server', {
        label:          'User Service',
        instances:      2,
        rpsPerInstance: 600,
        workloadType:   'io_bound',
        avgLatencyMs:   30,
      }),
      // Order Service: 2× instances, handles write-heavy checkout traffic.
      'sm-order': makeConfig('app_server', {
        label:          'Order Service',
        instances:      2,
        rpsPerInstance: 500,
        workloadType:   'io_bound',
        avgLatencyMs:   55,
      }),
      // Payment Service: deliberately single instance / low cap (CPU-bound,
      // crypto ops). At spike: 15% × 2800 = 420 RPS against a 200 RPS cap
      // → load > 2× → failed → mesh CB opens. Lower rpsPerInstance to see
      // the circuit breaker trip; raise it to see retries absorb the errors.
      'sm-payment': makeConfig('app_server', {
        label:          'Payment Service',
        instances:      1,
        rpsPerInstance: 200,
        workloadType:   'cpu_bound',
        avgLatencyMs:   80,
      }),
      // Notification Service: fire-and-forget, very low traffic share, never
      // a bottleneck — demonstrates a healthy path alongside failing ones.
      'sm-notify': makeConfig('app_server', {
        label:          'Notification Svc',
        instances:      2,
        rpsPerInstance: 400,
        workloadType:   'io_bound',
        avgLatencyMs:   20,
      }),

      // ── Backing stores ───────────────────────────────────────────────────
      'sm-ucache': makeConfig('cache', {
        label:          'Session Cache',
        memoryGb:       16,
        ttlSeconds:     300,
        evictionPolicy: 'lru',
      }),
      'sm-udb': makeConfig('database', {
        label:        'Users DB',
        engine:       'PostgreSQL',
        readReplicas: 1,
        rpsPerShard:  600,
      }),
      'sm-odb': makeConfig('database', {
        label:        'Orders DB',
        engine:       'PostgreSQL',
        readReplicas: 1,
        rpsPerShard:  450,
      }),
      // Payment DB: no read replicas, lower cap — a second potential bottleneck
      // once Payment Service eventually recovers or CB resets.
      'sm-pdb': makeConfig('database', {
        label:        'Payment DB',
        engine:       'PostgreSQL',
        readReplicas: 0,
        rpsPerShard:  250,
      }),
    },
    edgeConfigs: edgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 10. Multi-AZ High Availability
// ---------------------------------------------------------------------------

function buildMultiAzHA(): ArchitectureTemplate {
  // Layout:
  //   Global Accelerator sits in front and routes directly to app servers in
  //   each AZ. When an AZ fails the accelerator detects the unhealthy endpoint
  //   (previous-tick metrics) and shifts all traffic to the surviving AZ.
  //
  //   us-east-1 (region container)
  //   ├── us-east-1a:  App-a (4 inst) → Cache-a → DB-a (primary)
  //   └── us-east-1b:  App-b (4 inst) → Cache-b → DB-b (read replica)
  //
  //   DB-a replicates cross-AZ to DB-b (+2 ms penalty on that edge).
  //
  //   Capacity sizing (N+1 model):
  //     Each AZ: 4 inst × 600 rps = 2 400 rps capacity
  //     Normal  (50 / 50 split, 2 000 rps total): ~42 % load — OK
  //     Failover (one AZ down, 2 000 rps to survivor):  ~83 % load — CRITICAL
  //
  //   To simulate:
  //     1. Start the simulation and observe ~42 % load on both AZs.
  //     2. Select AZ-a → "Simulate Zone Failure" → ON.
  //     3. Watch the Global Accelerator reroute 100 % of traffic to AZ-b.
  //     4. AZ-b climbs to ~83 % (critical) — functioning, but at the limit.
  //     5. Scale AZ-b app instances up to 6+ to absorb the extra load.

  const nodes: Node[] = [
    // ── Global ingress ────────────────────────────────────────────────────
    makeNode('maz-tgen', 'traffic_generator',  -200, 330),
    makeNode('maz-ga',   'global_accelerator',   10, 330),
    // ── Region container ──────────────────────────────────────────────────
    makeNode('maz-region', 'region',            230,  60),
    // ── AZ containers (inside region) ────────────────────────────────────
    makeNode('maz-az-a', 'availability_zone',   265, 125),
    makeNode('maz-az-b', 'availability_zone',   720, 125),
    // ── AZ-a resources ───────────────────────────────────────────────────
    makeNode('maz-app-a',   'app_server', 300, 220),
    makeNode('maz-cache-a', 'cache',      300, 390),
    makeNode('maz-db-a',    'database',   300, 520),
    // ── AZ-b resources ───────────────────────────────────────────────────
    makeNode('maz-app-b',   'app_server', 755, 220),
    makeNode('maz-cache-b', 'cache',      755, 390),
    makeNode('maz-db-b',    'database',   755, 520),
  ];

  const edges: Edge[] = [
    makeEdge('maz-tgen',    'maz-ga'),
    makeEdge('maz-ga',      'maz-app-a'),     // 50 % to AZ-a
    makeEdge('maz-ga',      'maz-app-b'),     // 50 % to AZ-b
    makeEdge('maz-app-a',   'maz-cache-a'),
    makeEdge('maz-app-a',   'maz-db-a'),
    makeEdge('maz-app-b',   'maz-cache-b'),
    makeEdge('maz-app-b',   'maz-db-b'),
    makeEdge('maz-db-a',    'maz-db-b'),      // cross-AZ replication (+2 ms)
  ];

  return {
    nodes,
    edges,
    nodeConfigs: {
      'maz-tgen': makeConfig('traffic_generator', {
        generatorRps:     2000,
        generatorPattern: 'steady',
        readRatioPct:     70,
      }),
      'maz-ga': makeConfig('global_accelerator', {
        label:           'Global Accelerator',
        routingPolicy:   'latency',
        failoverEnabled: true,
      }),
      'maz-region': makeConfig('region', {
        regionName:      'us-east-1',
        regionFailed:    false,
        containerWidth:  970,
        containerHeight: 590,
      }),
      'maz-az-a': makeConfig('availability_zone', {
        zoneName:        'us-east-1a',
        regionId:        'maz-region',
        zoneFailed:      false,
        containerWidth:  400,
        containerHeight: 510,
      }),
      'maz-az-b': makeConfig('availability_zone', {
        zoneName:        'us-east-1b',
        regionId:        'maz-region',
        zoneFailed:      false,
        containerWidth:  400,
        containerHeight: 510,
      }),
      'maz-app-a': makeConfig('app_server', {
        label:           'App Server (AZ-a)',
        instances:       4,
        rpsPerInstance:  600,
        workloadType:    'io_bound',
        zoneId:          'maz-az-a',
      }),
      'maz-cache-a': makeConfig('cache', {
        label:           'Cache (AZ-a)',
        memoryGb:        8,
        ttlSeconds:      60,
        evictionPolicy:  'lru',
        zoneId:          'maz-az-a',
      }),
      'maz-db-a': makeConfig('database', {
        label:        'Primary DB (AZ-a)',
        engine:       'PostgreSQL',
        readReplicas: 0,
        shards:       1,
        rpsPerShard:  1500,
        zoneId:       'maz-az-a',
      }),
      'maz-app-b': makeConfig('app_server', {
        label:           'App Server (AZ-b)',
        instances:       4,
        rpsPerInstance:  600,
        workloadType:    'io_bound',
        zoneId:          'maz-az-b',
      }),
      'maz-cache-b': makeConfig('cache', {
        label:           'Cache (AZ-b)',
        memoryGb:        8,
        ttlSeconds:      60,
        evictionPolicy:  'lru',
        zoneId:          'maz-az-b',
      }),
      'maz-db-b': makeConfig('database', {
        label:        'Read Replica (AZ-b)',
        engine:       'PostgreSQL',
        readReplicas: 0,
        shards:       1,
        rpsPerShard:  1500,
        zoneId:       'maz-az-b',
      }),
    },
    edgeConfigs: {
      ...edgeConfigs(edges),
      // Global Accelerator splits 50 / 50 under normal conditions
      'maz-ga->maz-app-a': { ...DEFAULT_EDGE_CONFIG, splitPct: 50 },
      'maz-ga->maz-app-b': { ...DEFAULT_EDGE_CONFIG, splitPct: 50 },
    },
  };
}

// ---------------------------------------------------------------------------
// 11. Multi-Region Active-Active
// ---------------------------------------------------------------------------

function buildMultiRegion(): ArchitectureTemplate {
  // Layout (updated to include Firewall, NAT Gateway, and Subnet containers):
  //
  //   Traffic → CDN → Global Accelerator
  //     ├── us-east-1 (Region)
  //     │   ├── [Public Subnet]  LB → Firewall → API GW
  //     │   │                    NAT Gateway (outbound path, no sim edges)
  //     │   ├── [Private Subnet AZ-a]  Users, Orders, Primary DB
  //     │   ├── [Private Subnet AZ-b]  Users, Orders, Read Replica
  //     │   └── Regional Cache
  //     └── us-west-2
  //         ├── [Private Subnet AZ-a]  Users, Orders, Read Replica
  //         ├── [Private Subnet AZ-b]  Users, Orders, Read Replica
  //         └── Regional Cache
  //
  //   Security path (inbound):
  //     GA → LB (public subnet) → Firewall (L4 stateful, 50k RPS) → API GW → App Servers
  //   App-server autoscaling default in this setup: target tracking.
  //     Users services track load at ~72%; Orders services at ~75%.
  //
  //   NAT Gateway (public subnet) handles outbound internet traffic from private
  //   subnets. It is not connected to simulation edges — it's a visual anchor
  //   showing where outbound traffic exits the VPC.
  //
  //   Capacity sizing (active-active N-1 model, 12 000 rps):
  //     Firewall at 12 000 rps total: ~24 % load (50 000 RPS cap, basic mode)
  //     Normal (50/50 per region, 6 000 rps each):
  //       Users per AZ:  30 % × 6 000 = 1 800 rps → 4 inst × 600 = 75 % load
  //       Orders per AZ: 20 % × 6 000 = 1 200 rps → 3 inst × 600 = 66.7 % load
  //     Failover (one region down, 12 000 rps to survivor):
  //       Users per AZ:  30 % × 12 000 = 3 600 rps → 150 % load pre-scale
  //       Orders per AZ: 20 % × 12 000 = 2 400 rps → 133 % load pre-scale
  //       Autoscaling and warm pools absorb burst while cold instances provision
  //
  //   Experiment ideas:
  //     • Set Firewall block rate > 0 to simulate a WAF blocking bad traffic
  //     • Switch Firewall to "deep" inspection mode to see latency impact
  //     • Toggle region failure → GA reroutes; firewall in survivor handles 2× traffic
  //     • Toggle AZ failure → GW health-checks reroute to surviving AZ

  // ── Coordinate constants ──────────────────────────────────────────────────
  // Each region block is 940px wide. West region starts 60px to the right of east.
  const EX = 50;   // east region x
  const WX = 1050; // west region x  (EX + 940 + 60)
  const RY = 210;  // region y (both)
  const RW = 940;  // region width
  const RH = 1020; // region height

  // Within each region (all coordinates are absolute):
  // Row 1 – public subnet band (y=235..y=395): LB, Firewall, NAT GW, then GW at boundary
  // Row 2 – private subnet AZ-a (y=420..y=930): inner AZ container + app servers + DB
  // Row 2 – private subnet AZ-b (same y range, shifted right)
  // Row 3 – regional cache nodes (y=960)

  function eastX(dx: number) { return EX + dx; }
  function westX(dx: number) { return WX + dx; }

  const nodes: Node[] = [
    // ── Global ingress ────────────────────────────────────────────────────
    makeNode('mr-tgen', 'traffic_generator',  940, -140),
    makeNode('mr-cdn',  'cdn',                940,  -20),
    makeNode('mr-ga',   'global_accelerator', 940,  110),

    // ── us-east-1 ─────────────────────────────────────────────────────────
    makeNode('mr-reg-east',          'region',          eastX(0),   RY),
    // Public subnet: contains LB, Firewall, NAT GW
    makeNode('mr-pub-east',          'public_subnet',   eastX(20),  235),
    makeNode('mr-lb-east',           'load_balancer',   eastX(40),  268),
    makeNode('mr-fw-east',           'firewall',        eastX(310), 268),
    makeNode('mr-nat-east',          'nat_gateway',     eastX(590), 268),
    // API GW sits at the public/private boundary (regional, no subnet)
    makeNode('mr-gw-east',           'api_gateway',     eastX(310), 420),
    // Private subnet AZ-a
    makeNode('mr-priv-east-a',       'private_subnet',  eastX(20),  468),
    makeNode('mr-az-east-a',         'availability_zone', eastX(30), 483),
    makeNode('mr-users-east-a',      'app_server',      eastX(50),  518),
    makeNode('mr-orders-east-a',     'app_server',      eastX(50),  682),
    makeNode('mr-db-east-a',         'database',        eastX(50),  826),
    // Private subnet AZ-b
    makeNode('mr-priv-east-b',       'private_subnet',  eastX(490), 468),
    makeNode('mr-az-east-b',         'availability_zone', eastX(500), 483),
    makeNode('mr-users-east-b',      'app_server',      eastX(520), 518),
    makeNode('mr-orders-east-b',     'app_server',      eastX(520), 682),
    makeNode('mr-db-east-b',         'database',        eastX(520), 826),
    // Shared regional cache
    makeNode('mr-cache-east',        'cache',           eastX(265), 980),

    // ── us-west-2 ─────────────────────────────────────────────────────────
    makeNode('mr-reg-west',          'region',          westX(0),   RY),
    makeNode('mr-pub-west',          'public_subnet',   westX(20),  235),
    makeNode('mr-lb-west',           'load_balancer',   westX(40),  268),
    makeNode('mr-fw-west',           'firewall',        westX(310), 268),
    makeNode('mr-nat-west',          'nat_gateway',     westX(590), 268),
    makeNode('mr-gw-west',           'api_gateway',     westX(310), 420),
    makeNode('mr-priv-west-a',       'private_subnet',  westX(20),  468),
    makeNode('mr-az-west-a',         'availability_zone', westX(30), 483),
    makeNode('mr-users-west-a',      'app_server',      westX(50),  518),
    makeNode('mr-orders-west-a',     'app_server',      westX(50),  682),
    makeNode('mr-db-west-a',         'database',        westX(50),  826),
    makeNode('mr-priv-west-b',       'private_subnet',  westX(490), 468),
    makeNode('mr-az-west-b',         'availability_zone', westX(500), 483),
    makeNode('mr-users-west-b',      'app_server',      westX(520), 518),
    makeNode('mr-orders-west-b',     'app_server',      westX(520), 682),
    makeNode('mr-db-west-b',         'database',        westX(520), 826),
    makeNode('mr-cache-west',        'cache',           westX(265), 980),
  ];

  const edges: Edge[] = [
    makeEdge('mr-tgen',          'mr-cdn'),
    makeEdge('mr-cdn',           'mr-ga'),
    makeEdge('mr-ga',            'mr-lb-east'),   // 50 % to east
    makeEdge('mr-ga',            'mr-lb-west'),   // 50 % to west

    // East: LB → Firewall → API GW → 4 app server instances (30/30/20/20)
    makeEdge('mr-lb-east',       'mr-fw-east'),
    makeEdge('mr-fw-east',       'mr-gw-east'),
    makeEdge('mr-gw-east',       'mr-users-east-a'),
    makeEdge('mr-gw-east',       'mr-users-east-b'),
    makeEdge('mr-gw-east',       'mr-orders-east-a'),
    makeEdge('mr-gw-east',       'mr-orders-east-b'),
    makeEdge('mr-users-east-a',  'mr-cache-east'),
    makeEdge('mr-users-east-a',  'mr-db-east-a'),
    makeEdge('mr-users-east-b',  'mr-cache-east'),
    makeEdge('mr-users-east-b',  'mr-db-east-b'),
    makeEdge('mr-users-east-b',  'mr-db-east-a'),
    makeEdge('mr-orders-east-a', 'mr-cache-east'),
    makeEdge('mr-orders-east-a', 'mr-db-east-a'),
    makeEdge('mr-orders-east-b', 'mr-cache-east'),
    makeEdge('mr-orders-east-b', 'mr-db-east-b'),
    makeEdge('mr-orders-east-b', 'mr-db-east-a'),

    // West: same topology
    makeEdge('mr-lb-west',       'mr-fw-west'),
    makeEdge('mr-fw-west',       'mr-gw-west'),
    makeEdge('mr-gw-west',       'mr-users-west-a'),
    makeEdge('mr-gw-west',       'mr-users-west-b'),
    makeEdge('mr-gw-west',       'mr-orders-west-a'),
    makeEdge('mr-gw-west',       'mr-orders-west-b'),
    makeEdge('mr-users-west-a',  'mr-cache-west'),
    makeEdge('mr-users-west-a',  'mr-db-west-a'),
    makeEdge('mr-users-west-a',  'mr-db-east-a'),
    makeEdge('mr-users-west-b',  'mr-cache-west'),
    makeEdge('mr-users-west-b',  'mr-db-west-b'),
    makeEdge('mr-users-west-b',  'mr-db-east-a'),
    makeEdge('mr-orders-west-a', 'mr-cache-west'),
    makeEdge('mr-orders-west-a', 'mr-db-west-a'),
    makeEdge('mr-orders-west-a', 'mr-db-east-a'),
    makeEdge('mr-orders-west-b', 'mr-cache-west'),
    makeEdge('mr-orders-west-b', 'mr-db-west-b'),
    makeEdge('mr-orders-west-b', 'mr-db-east-a'),

    // Replication from east primary to all replicas (+2 ms cross-AZ, +75 ms cross-region)
    makeEdge('mr-db-east-a',     'mr-db-east-b'),
    makeEdge('mr-db-east-a',     'mr-db-west-a'),
    makeEdge('mr-db-east-a',     'mr-db-west-b'),
  ];

  return {
    nodes,
    edges,
    nodeConfigs: {
      'mr-tgen': makeConfig('traffic_generator', {
        generatorRps:     100000,
        generatorPattern: 'steady',
        readRatioPct:     65,
      }),
      'mr-cdn': makeConfig('cdn', {
        pops:          8,
        cacheablePct:  50,
        bandwidthGbps: 200,
      }),
      'mr-ga': makeConfig('global_accelerator', {
        label:           'Global Accelerator',
        routingPolicy:   'latency',
        failoverEnabled: true,
      }),

      // ── East region ──────────────────────────────────────────────────────
      'mr-reg-east': makeConfig('region', {
        regionName:      'us-east-1',
        regionFailed:    false,
        containerWidth:  RW,
        containerHeight: RH,
      }),
      'mr-pub-east': makeConfig('public_subnet', {
        label:           'Public Subnet (east)',
        subnetCidr:      '10.0.0.0/24',
        containerWidth:  900,
        containerHeight: 160,
      }),
      'mr-lb-east': makeConfig('load_balancer', {
        label:        'ALB (us-east-1)',
        algorithm:    'least_conn',
        healthChecks: true,
        regionId:     'mr-reg-east',
      }),
      'mr-fw-east': makeConfig('firewall', {
        label:                  'Firewall (east)',
        firewallRules:          20,
        firewallInspectionMode: 'basic',
        firewallBlockRatePct:   0,
        regionId:               'mr-reg-east',
      }),
      'mr-nat-east': makeConfig('nat_gateway', {
        label:             'NAT GW (east)',
        natBandwidthGbps:  10,
        maxConnections:    55000,
        regionId:          'mr-reg-east',
      }),
      'mr-gw-east': makeConfig('api_gateway', {
        label:               'API GW (us-east-1)',
        regionId:            'mr-reg-east',
        gatewayAuthEnabled:  false,
        gatewayCacheEnabled: true,
        gatewayCacheHitPct:  25,
        gatewayRoutes: [
          { id: 'gwe-r1', path: '/api/users',  destNodeId: 'mr-users-east-a',  weightPct: 30 },
          { id: 'gwe-r2', path: '/api/users',  destNodeId: 'mr-users-east-b',  weightPct: 30 },
          { id: 'gwe-r3', path: '/api/orders', destNodeId: 'mr-orders-east-a', weightPct: 20 },
          { id: 'gwe-r4', path: '/api/orders', destNodeId: 'mr-orders-east-b', weightPct: 20 },
        ],
      }),
      'mr-priv-east-a': makeConfig('private_subnet', {
        label:           'Private Subnet (east-1a)',
        subnetCidr:      '10.0.1.0/24',
        containerWidth:  430,
        containerHeight: 510,
      }),
      'mr-az-east-a': makeConfig('availability_zone', {
        zoneName:        'us-east-1a',
        regionId:        'mr-reg-east',
        zoneFailed:      false,
        containerWidth:  410,
        containerHeight: 490,
      }),
      'mr-users-east-a': makeConfig('app_server', {
        label:          'Users (east-1a)',
        instances:      4,
        autoscalingEnabled: true,
        autoscalingStrategy: 'target_tracking',
        targetMetric:   'load',
        targetValue:    72,
        minInstances:   4,
        maxInstances:   128,
        warmPoolEnabled: true,
        warmPoolSize:   4,
        ttScaleOutCooldownTicks: 4,
        ttScaleInCooldownTicks: 10,
        coldProvisionTicks: 6,
        rpsPerInstance: 600,
        workloadType:   'io_bound',
        zoneId:         'mr-az-east-a',
      }),
      'mr-orders-east-a': makeConfig('app_server', {
        label:          'Orders (east-1a)',
        instances:      3,
        autoscalingEnabled: true,
        autoscalingStrategy: 'target_tracking',
        targetMetric:   'load',
        targetValue:    75,
        minInstances:   3,
        maxInstances:   128,
        warmPoolEnabled: true,
        warmPoolSize:   3,
        ttScaleOutCooldownTicks: 4,
        ttScaleInCooldownTicks: 12,
        coldProvisionTicks: 6,
        rpsPerInstance: 600,
        workloadType:   'cpu_bound',
        zoneId:         'mr-az-east-a',
      }),
      'mr-priv-east-b': makeConfig('private_subnet', {
        label:           'Private Subnet (east-1b)',
        subnetCidr:      '10.0.2.0/24',
        containerWidth:  430,
        containerHeight: 510,
      }),
      'mr-az-east-b': makeConfig('availability_zone', {
        zoneName:        'us-east-1b',
        regionId:        'mr-reg-east',
        zoneFailed:      false,
        containerWidth:  410,
        containerHeight: 490,
      }),
      'mr-users-east-b': makeConfig('app_server', {
        label:          'Users (east-1b)',
        instances:      4,
        autoscalingEnabled: true,
        autoscalingStrategy: 'target_tracking',
        targetMetric:   'load',
        targetValue:    72,
        minInstances:   4,
        maxInstances:   128,
        warmPoolEnabled: true,
        warmPoolSize:   4,
        ttScaleOutCooldownTicks: 4,
        ttScaleInCooldownTicks: 10,
        coldProvisionTicks: 6,
        rpsPerInstance: 600,
        workloadType:   'io_bound',
        zoneId:         'mr-az-east-b',
      }),
      'mr-orders-east-b': makeConfig('app_server', {
        label:          'Orders (east-1b)',
        instances:      3,
        autoscalingEnabled: true,
        autoscalingStrategy: 'target_tracking',
        targetMetric:   'load',
        targetValue:    75,
        minInstances:   3,
        maxInstances:   128,
        warmPoolEnabled: true,
        warmPoolSize:   3,
        ttScaleOutCooldownTicks: 4,
        ttScaleInCooldownTicks: 12,
        coldProvisionTicks: 6,
        rpsPerInstance: 600,
        workloadType:   'cpu_bound',
        zoneId:         'mr-az-east-b',
      }),
      'mr-db-east-a': makeConfig('database', {
        label:        'Primary DB (east-1a)',
        engine:       'PostgreSQL',
        dbRole:       'primary',
        readReplicas: 0,
        shards:       32,
        rpsPerShard:  1500,
        zoneId:       'mr-az-east-a',
      }),
      'mr-db-east-b': makeConfig('database', {
        label:        'Read Replica (east-1b)',
        engine:       'PostgreSQL',
        dbRole:       'replica',
        primaryNodeId: 'mr-db-east-a',
        readReplicas: 0,
        shards:       32,
        rpsPerShard:  1500,
        zoneId:       'mr-az-east-b',
      }),
      'mr-cache-east': makeConfig('cache', {
        label:          'Cache (East)',
        memoryGb:       16,
        ttlSeconds:     90,
        evictionPolicy: 'lru',
        regionId:       'mr-reg-east',
      }),

      // ── West region ──────────────────────────────────────────────────────
      'mr-reg-west': makeConfig('region', {
        regionName:      'us-west-2',
        regionFailed:    false,
        containerWidth:  RW,
        containerHeight: RH,
      }),
      'mr-pub-west': makeConfig('public_subnet', {
        label:           'Public Subnet (west)',
        subnetCidr:      '10.1.0.0/24',
        containerWidth:  900,
        containerHeight: 160,
      }),
      'mr-lb-west': makeConfig('load_balancer', {
        label:        'ALB (us-west-2)',
        algorithm:    'least_conn',
        healthChecks: true,
        regionId:     'mr-reg-west',
      }),
      'mr-fw-west': makeConfig('firewall', {
        label:                  'Firewall (west)',
        firewallRules:          20,
        firewallInspectionMode: 'basic',
        firewallBlockRatePct:   0,
        regionId:               'mr-reg-west',
      }),
      'mr-nat-west': makeConfig('nat_gateway', {
        label:             'NAT GW (west)',
        natBandwidthGbps:  10,
        maxConnections:    55000,
        regionId:          'mr-reg-west',
      }),
      'mr-gw-west': makeConfig('api_gateway', {
        label:               'API GW (us-west-2)',
        regionId:            'mr-reg-west',
        gatewayAuthEnabled:  false,
        gatewayCacheEnabled: true,
        gatewayCacheHitPct:  25,
        gatewayRoutes: [
          { id: 'gww-r1', path: '/api/users',  destNodeId: 'mr-users-west-a',  weightPct: 30 },
          { id: 'gww-r2', path: '/api/users',  destNodeId: 'mr-users-west-b',  weightPct: 30 },
          { id: 'gww-r3', path: '/api/orders', destNodeId: 'mr-orders-west-a', weightPct: 20 },
          { id: 'gww-r4', path: '/api/orders', destNodeId: 'mr-orders-west-b', weightPct: 20 },
        ],
      }),
      'mr-priv-west-a': makeConfig('private_subnet', {
        label:           'Private Subnet (west-2a)',
        subnetCidr:      '10.1.1.0/24',
        containerWidth:  430,
        containerHeight: 510,
      }),
      'mr-az-west-a': makeConfig('availability_zone', {
        zoneName:        'us-west-2a',
        regionId:        'mr-reg-west',
        zoneFailed:      false,
        containerWidth:  410,
        containerHeight: 490,
      }),
      'mr-users-west-a': makeConfig('app_server', {
        label:          'Users (west-2a)',
        instances:      4,
        autoscalingEnabled: true,
        autoscalingStrategy: 'target_tracking',
        targetMetric:   'load',
        targetValue:    72,
        minInstances:   4,
        maxInstances:   128,
        warmPoolEnabled: true,
        warmPoolSize:   4,
        ttScaleOutCooldownTicks: 4,
        ttScaleInCooldownTicks: 10,
        coldProvisionTicks: 6,
        rpsPerInstance: 600,
        workloadType:   'io_bound',
        zoneId:         'mr-az-west-a',
      }),
      'mr-orders-west-a': makeConfig('app_server', {
        label:          'Orders (west-2a)',
        instances:      3,
        autoscalingEnabled: true,
        autoscalingStrategy: 'target_tracking',
        targetMetric:   'load',
        targetValue:    75,
        minInstances:   3,
        maxInstances:   128,
        warmPoolEnabled: true,
        warmPoolSize:   3,
        ttScaleOutCooldownTicks: 4,
        ttScaleInCooldownTicks: 12,
        coldProvisionTicks: 6,
        rpsPerInstance: 600,
        workloadType:   'cpu_bound',
        zoneId:         'mr-az-west-a',
      }),
      'mr-priv-west-b': makeConfig('private_subnet', {
        label:           'Private Subnet (west-2b)',
        subnetCidr:      '10.1.2.0/24',
        containerWidth:  430,
        containerHeight: 510,
      }),
      'mr-az-west-b': makeConfig('availability_zone', {
        zoneName:        'us-west-2b',
        regionId:        'mr-reg-west',
        zoneFailed:      false,
        containerWidth:  410,
        containerHeight: 490,
      }),
      'mr-users-west-b': makeConfig('app_server', {
        label:          'Users (west-2b)',
        instances:      4,
        autoscalingEnabled: true,
        autoscalingStrategy: 'target_tracking',
        targetMetric:   'load',
        targetValue:    72,
        minInstances:   4,
        maxInstances:   128,
        warmPoolEnabled: true,
        warmPoolSize:   4,
        ttScaleOutCooldownTicks: 4,
        ttScaleInCooldownTicks: 10,
        coldProvisionTicks: 6,
        rpsPerInstance: 600,
        workloadType:   'io_bound',
        zoneId:         'mr-az-west-b',
      }),
      'mr-orders-west-b': makeConfig('app_server', {
        label:          'Orders (west-2b)',
        instances:      3,
        autoscalingEnabled: true,
        autoscalingStrategy: 'target_tracking',
        targetMetric:   'load',
        targetValue:    75,
        minInstances:   3,
        maxInstances:   128,
        warmPoolEnabled: true,
        warmPoolSize:   3,
        ttScaleOutCooldownTicks: 4,
        ttScaleInCooldownTicks: 12,
        coldProvisionTicks: 6,
        rpsPerInstance: 600,
        workloadType:   'cpu_bound',
        zoneId:         'mr-az-west-b',
      }),
      'mr-db-west-a': makeConfig('database', {
        label:        'Read Replica (west-2a)',
        engine:       'PostgreSQL',
        dbRole:       'replica',
        primaryNodeId: 'mr-db-east-a',
        readReplicas: 0,
        shards:       32,
        rpsPerShard:  1500,
        zoneId:       'mr-az-west-a',
      }),
      'mr-db-west-b': makeConfig('database', {
        label:        'Read Replica (west-2b)',
        engine:       'PostgreSQL',
        dbRole:       'replica',
        primaryNodeId: 'mr-db-east-a',
        readReplicas: 0,
        shards:       32,
        rpsPerShard:  1500,
        zoneId:       'mr-az-west-b',
      }),
      'mr-cache-west': makeConfig('cache', {
        label:          'Cache (West)',
        memoryGb:       16,
        ttlSeconds:     90,
        evictionPolicy: 'lru',
        regionId:       'mr-reg-west',
      }),
    },
    edgeConfigs: {
      ...edgeConfigs(edges),
      // Global Accelerator: 50/50 split across regions (failover overrides this)
      'mr-ga->mr-lb-east':             { ...DEFAULT_EDGE_CONFIG, splitPct: 50 },
      'mr-ga->mr-lb-west':             { ...DEFAULT_EDGE_CONFIG, splitPct: 50 },
      // Gateway routes: 30 % each to users replicas, 20 % each to orders replicas
      'mr-gw-east->mr-users-east-a':   { ...DEFAULT_EDGE_CONFIG, splitPct: 30 },
      'mr-gw-east->mr-users-east-b':   { ...DEFAULT_EDGE_CONFIG, splitPct: 30 },
      'mr-gw-east->mr-orders-east-a':  { ...DEFAULT_EDGE_CONFIG, splitPct: 20 },
      'mr-gw-east->mr-orders-east-b':  { ...DEFAULT_EDGE_CONFIG, splitPct: 20 },
      'mr-gw-west->mr-users-west-a':   { ...DEFAULT_EDGE_CONFIG, splitPct: 30 },
      'mr-gw-west->mr-users-west-b':   { ...DEFAULT_EDGE_CONFIG, splitPct: 30 },
      'mr-gw-west->mr-orders-west-a':  { ...DEFAULT_EDGE_CONFIG, splitPct: 20 },
      'mr-gw-west->mr-orders-west-b':  { ...DEFAULT_EDGE_CONFIG, splitPct: 20 },
      // App servers keep the original 50 % cache share.
      // For DB traffic, reads can use local replicas while writes always go to the primary.
      'mr-users-east-a->mr-cache-east':   { ...DEFAULT_EDGE_CONFIG, splitPct: 50 },
      'mr-users-east-a->mr-db-east-a':    { ...DEFAULT_EDGE_CONFIG, splitPct: 50 },
      'mr-orders-east-a->mr-cache-east':  { ...DEFAULT_EDGE_CONFIG, splitPct: 50 },
      'mr-orders-east-a->mr-db-east-a':   { ...DEFAULT_EDGE_CONFIG, splitPct: 50 },
      'mr-users-east-b->mr-cache-east':   { ...DEFAULT_EDGE_CONFIG, splitPct: 50, writeSplitPct: 50 },
      'mr-users-east-b->mr-db-east-b':    { ...DEFAULT_EDGE_CONFIG, splitPct: 32.5, writeSplitPct: 0 },
      'mr-users-east-b->mr-db-east-a':    { ...DEFAULT_EDGE_CONFIG, splitPct: 17.5, writeSplitPct: 50 },
      'mr-orders-east-b->mr-cache-east':  { ...DEFAULT_EDGE_CONFIG, splitPct: 50, writeSplitPct: 50 },
      'mr-orders-east-b->mr-db-east-b':   { ...DEFAULT_EDGE_CONFIG, splitPct: 32.5, writeSplitPct: 0 },
      'mr-orders-east-b->mr-db-east-a':   { ...DEFAULT_EDGE_CONFIG, splitPct: 17.5, writeSplitPct: 50 },
      'mr-users-west-a->mr-cache-west':   { ...DEFAULT_EDGE_CONFIG, splitPct: 50, writeSplitPct: 50 },
      'mr-users-west-a->mr-db-west-a':    { ...DEFAULT_EDGE_CONFIG, splitPct: 32.5, writeSplitPct: 0 },
      'mr-users-west-a->mr-db-east-a':    { ...DEFAULT_EDGE_CONFIG, splitPct: 17.5, writeSplitPct: 50 },
      'mr-orders-west-a->mr-cache-west':  { ...DEFAULT_EDGE_CONFIG, splitPct: 50, writeSplitPct: 50 },
      'mr-orders-west-a->mr-db-west-a':   { ...DEFAULT_EDGE_CONFIG, splitPct: 32.5, writeSplitPct: 0 },
      'mr-orders-west-a->mr-db-east-a':   { ...DEFAULT_EDGE_CONFIG, splitPct: 17.5, writeSplitPct: 50 },
      'mr-users-west-b->mr-cache-west':   { ...DEFAULT_EDGE_CONFIG, splitPct: 50, writeSplitPct: 50 },
      'mr-users-west-b->mr-db-west-b':    { ...DEFAULT_EDGE_CONFIG, splitPct: 32.5, writeSplitPct: 0 },
      'mr-users-west-b->mr-db-east-a':    { ...DEFAULT_EDGE_CONFIG, splitPct: 17.5, writeSplitPct: 50 },
      'mr-orders-west-b->mr-cache-west':  { ...DEFAULT_EDGE_CONFIG, splitPct: 50, writeSplitPct: 50 },
      'mr-orders-west-b->mr-db-west-b':   { ...DEFAULT_EDGE_CONFIG, splitPct: 32.5, writeSplitPct: 0 },
      'mr-orders-west-b->mr-db-east-a':   { ...DEFAULT_EDGE_CONFIG, splitPct: 17.5, writeSplitPct: 50 },
    },
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const ARCHITECTURE_LIBRARY: ArchitectureEntry[] = [
  {
    id: 'three-tier',
    name: 'Three-Tier Web App',
    description: 'Classic presentation, logic, and data layers. The foundation of most web applications.',
    difficulty: 'beginner',
    tags: ['App Server', 'Database', 'Web'],
    template: buildThreeTier(),
  },
  {
    id: 'cached-web-app',
    name: 'Load-Balanced App + Cache',
    description: 'Add a load balancer and Redis cache to reduce database pressure on read-heavy traffic.',
    difficulty: 'beginner',
    tags: ['Load Balancer', 'Cache', 'Database'],
    template: buildCachedWebApp(),
  },
  {
    id: 'cdn-web-app',
    name: 'CDN-Accelerated Web App',
    description: 'Push static assets to edge POPs worldwide. Dramatically reduces origin load and latency.',
    difficulty: 'intermediate',
    tags: ['CDN', 'Load Balancer', 'Database'],
    template: buildCdnWebApp(),
  },
  {
    id: 'event-driven',
    name: 'Event-Driven Pipeline',
    description: 'Decouple producers from consumers via a message bus. Great for async workloads and fan-out.',
    difficulty: 'intermediate',
    tags: ['Pub/Sub', 'Worker Pool', 'Async'],
    template: buildEventDriven(),
  },
  {
    id: 'microservices',
    name: 'Microservices Architecture',
    description: 'Split the domain into independent services with isolated databases. Each service owns its data.',
    difficulty: 'intermediate',
    tags: ['Load Balancer', 'Microservices', 'Multiple DBs'],
    template: buildMicroservices(),
  },
  {
    id: 'serverless',
    name: 'Serverless API',
    description: 'Zero-server compute — functions scale to zero and spin up on demand. Low ops overhead.',
    difficulty: 'beginner',
    tags: ['Cloud Functions', 'Database', 'Serverless'],
    template: buildServerless(),
  },
  {
    id: 'high-availability',
    name: 'High-Availability Platform',
    description: 'CDN + autoscaling app servers + clustered cache + sharded replicated DB. Production-grade.',
    difficulty: 'advanced',
    tags: ['CDN', 'Autoscaling', 'Cache', 'Sharding'],
    template: buildHighAvailability(),
  },
  {
    id: 'read-heavy',
    name: 'Read-Heavy API + Rate Limiting',
    description: 'Protect the origin with a rate limiter and serve 85%+ reads from cache with replica fan-out.',
    difficulty: 'advanced',
    tags: ['Rate Limiter', 'Cache', 'Read Replicas'],
    template: buildReadHeavy(),
  },
  {
    id: 'service-mesh',
    name: 'Microservices + Service Mesh',
    description: 'Four services behind an Istio-style mesh with mTLS, retries, and circuit breaking. Spike traffic overloads the Payment Service — watch the circuit breaker open and propagate errors back through the mesh.',
    difficulty: 'advanced',
    tags: ['Service Mesh', 'Circuit Breaker', 'Microservices', 'mTLS'],
    template: buildServiceMesh(),
  },
  {
    id: 'multi-az-ha',
    name: 'Multi-AZ High Availability',
    description: 'Global Accelerator routes 50/50 across two AZs in us-east-1. Each AZ has 4 app-server instances (2 400 rps capacity) so the survivor can absorb full traffic at ~83 % load. Toggle "Simulate Zone Failure" on AZ-a to watch the accelerator reroute in real time.',
    difficulty: 'intermediate',
    tags: ['Global Accelerator', 'Availability Zone', 'Region', 'HA', 'Zone Failure', 'Failover'],
    template: buildMultiAzHA(),
  },
  {
    id: 'multi-region-active-active',
    name: 'Multi-Region Active-Active',
    description: 'CDN → Global Accelerator fans traffic 50/50 across us-east-1 and us-west-2. Each region has a public subnet (ALB → Firewall → API GW + NAT Gateway) and private subnets per AZ (Users + Orders services). App servers default to target-tracking autoscaling in this setup. PostgreSQL runs with a single primary in us-east-1a and read replicas in the other three AZs. Firewall provides stateful L4 inspection inline; NAT Gateway anchors outbound VPC traffic. Toggle "Simulate Region Failure" to watch GA shift all traffic to the survivor, or raise the Firewall block rate to simulate a WAF blocking attack traffic.',
    difficulty: 'advanced',
    tags: ['Global Accelerator', 'Region', 'Availability Zone', 'CDN', 'API Gateway', 'Firewall', 'NAT Gateway', 'Subnet', 'Microservices', 'Cross-Region', 'Read Replicas', 'Failover'],
    template: buildMultiRegion(),
  },
];

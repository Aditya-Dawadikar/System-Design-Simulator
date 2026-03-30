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
];

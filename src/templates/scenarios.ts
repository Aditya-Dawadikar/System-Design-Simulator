import type { Node, Edge } from 'reactflow';
import type { ArchitectureTemplate, NodeConfig, EdgeConfig } from '@/types';
import { COMPONENT_BY_TYPE, DEFAULT_EDGE_CONFIG } from '@/constants/components';

// ---------------------------------------------------------------------------
// Helpers (same pattern as architectures.ts)
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

function buildEdgeConfigs(edges: Edge[]): Record<string, EdgeConfig> {
  return Object.fromEntries(edges.map((e) => [e.id, { ...DEFAULT_EDGE_CONFIG }]));
}

// ---------------------------------------------------------------------------
// Metadata wrapper
// ---------------------------------------------------------------------------

export interface ScenarioEntry {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  template: ArchitectureTemplate;
}

// ---------------------------------------------------------------------------
// 1. Payment Processing System
// ---------------------------------------------------------------------------
// Spike traffic hits a token-bucket rate limiter, flows through a load balancer
// to the Payment API which fans out to a Fraud Detection engine (CPU-bound,
// deliberately under-provisioned) and a Transaction DB. The API also publishes
// settlement events to a Pub/Sub bus consumed by a Notification worker pool.
// Run with "spike" pattern to watch the Fraud Engine saturate and the rate
// limiter queue fill up.
// ---------------------------------------------------------------------------

function buildPaymentProcessing(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('pay-tgen',   'traffic_generator', 60,  280),
    makeNode('pay-rl',     'rate_limiter',      300, 280),
    makeNode('pay-lb',     'load_balancer',     540, 280),
    makeNode('pay-api',    'app_server',        780, 280),
    makeNode('pay-fraud',  'app_server',        1020, 120),
    makeNode('pay-txdb',   'database',          1020, 440),
    makeNode('pay-ps',     'pubsub',            1260, 280),
    makeNode('pay-notif',  'worker_pool',       1500, 280),
  ];

  const edges: Edge[] = [
    makeEdge('pay-tgen',  'pay-rl'),
    makeEdge('pay-rl',    'pay-lb'),
    makeEdge('pay-lb',    'pay-api'),
    makeEdge('pay-api',   'pay-fraud'),
    makeEdge('pay-api',   'pay-txdb'),
    makeEdge('pay-api',   'pay-ps'),
    makeEdge('pay-ps',    'pay-notif'),
  ];

  return {
    nodes,
    edges,
    nodeConfigs: {
      'pay-tgen': makeConfig('traffic_generator', {
        label:            'Payment Traffic',
        generatorRps:     2000,
        generatorPattern: 'spike',
        readRatioPct:     20,   // mostly writes (payment requests)
      }),
      'pay-rl': makeConfig('rate_limiter', {
        label:              'Rate Limiter',
        rateLimitAlgorithm: 'token_bucket',
        requestsPerSecond:  1500,
        burstCapacity:      400,
        maxQueueSize:       800,
      }),
      'pay-lb': makeConfig('load_balancer', {
        label:        'Payments LB',
        algorithm:    'round_robin',
        healthChecks: true,
      }),
      'pay-api': makeConfig('app_server', {
        label:          'Payment API',
        instances:      3,
        cpuCores:       8,
        ramGb:          16,
        rpsPerInstance: 600,
        workloadType:   'cpu_bound',
        avgLatencyMs:   35,
      }),
      // Deliberately single-instance, CPU-bound — will saturate under spike
      'pay-fraud': makeConfig('app_server', {
        label:          'Fraud Detection',
        instances:      1,
        cpuCores:       4,
        ramGb:          8,
        rpsPerInstance: 250,
        workloadType:   'cpu_bound',
        avgLatencyMs:   120,
      }),
      'pay-txdb': makeConfig('database', {
        label:        'Transaction DB',
        engine:       'PostgreSQL',
        shards:       2,
        rpsPerShard:  600,
        readReplicas: 0,
        maxConnections: 300,
      }),
      'pay-ps': makeConfig('pubsub', {
        label:                 'Settlement Events',
        partitions:            8,
        messageRetentionHours: 72,
        maxMessageSizeKb:      64,
      }),
      'pay-notif': makeConfig('worker_pool', {
        label:          'Notification Workers',
        workerCount:    6,
        threadCount:    4,
        taskDurationMs: 200,
      }),
    },
    edgeConfigs: buildEdgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 2. High-Frequency Trading (HFT) Platform
// ---------------------------------------------------------------------------
// Chaos-pattern traffic (8 000 RPS bursts) hits a least-connections load
// balancer feeding an Order Matching Engine (CPU-bound, 4 instances). The
// engine writes the order book to NVMe block storage (ultra-low latency) and
// persists trades to a sharded database. A Pub/Sub bus fans out market-data
// events to a Risk Engine (CPU-bound) and a Market Data Feed (IO-bound).
// The matching engine is deliberately sized at the edge of capacity so that
// chaos bursts create visible queueing on the NVMe block device.
// ---------------------------------------------------------------------------

function buildHighFrequencyTrading(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('hft-tgen',    'traffic_generator', 60,  300),
    makeNode('hft-lb',      'load_balancer',     300, 300),
    makeNode('hft-match',   'app_server',        540, 300),
    makeNode('hft-book',    'block_storage',     780, 140),
    makeNode('hft-tradedb', 'database',          780, 460),
    makeNode('hft-ps',      'pubsub',            780, 300),
    makeNode('hft-risk',    'app_server',        1040, 160),
    makeNode('hft-mdfeed',  'app_server',        1040, 440),
  ];

  const edges: Edge[] = [
    makeEdge('hft-tgen',   'hft-lb'),
    makeEdge('hft-lb',     'hft-match'),
    makeEdge('hft-match',  'hft-book'),
    makeEdge('hft-match',  'hft-tradedb'),
    makeEdge('hft-match',  'hft-ps'),
    makeEdge('hft-ps',     'hft-risk'),
    makeEdge('hft-ps',     'hft-mdfeed'),
  ];

  return {
    nodes,
    edges,
    nodeConfigs: {
      'hft-tgen': makeConfig('traffic_generator', {
        label:            'Market Orders',
        generatorRps:     8000,
        generatorPattern: 'chaos',
        readRatioPct:     40,
      }),
      'hft-lb': makeConfig('load_balancer', {
        label:         'Ingress LB',
        algorithm:     'least_conn',
        healthChecks:  true,
        maxConnections: 200000,
      }),
      'hft-match': makeConfig('app_server', {
        label:          'Order Matching Engine',
        instances:      4,
        cpuCores:       16,
        ramGb:          32,
        rpsPerInstance: 1200,
        workloadType:   'cpu_bound',
        avgLatencyMs:   2,
      }),
      'hft-book': makeConfig('block_storage', {
        label:       'Order Book (NVMe)',
        diskType:    'nvme',
        iops:        100000,
        storageGb:   500,
        objectSizeKb: 4,
      }),
      'hft-tradedb': makeConfig('database', {
        label:        'Trade Ledger',
        engine:       'PostgreSQL',
        shards:       4,
        rpsPerShard:  1500,
        readReplicas: 1,
        maxConnections: 500,
      }),
      'hft-ps': makeConfig('pubsub', {
        label:                 'Market Data Bus',
        partitions:            16,
        messageRetentionHours: 2,
        maxMessageSizeKb:      4,
      }),
      'hft-risk': makeConfig('app_server', {
        label:          'Risk Engine',
        instances:      2,
        cpuCores:       8,
        ramGb:          16,
        rpsPerInstance: 800,
        workloadType:   'cpu_bound',
        avgLatencyMs:   8,
      }),
      'hft-mdfeed': makeConfig('app_server', {
        label:          'Market Data Feed',
        instances:      3,
        cpuCores:       4,
        ramGb:          8,
        rpsPerInstance: 1500,
        workloadType:   'io_bound',
        avgLatencyMs:   5,
      }),
    },
    edgeConfigs: buildEdgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 3. Audio / Video Processing Pipeline
// ---------------------------------------------------------------------------
// Steady upload traffic hits a load balancer → Upload Service which writes raw
// media to Cloud Storage. Storage events enqueue jobs on a Pub/Sub bus. A
// Worker Pool (CPU-bound, high thread count) consumes jobs, transcodes the
// media, writes output to NVMe Block Storage and pushes finished assets to a
// CDN for global playback. Ramp the RPS to see transcoder workers queue up as
// the pipeline backs up.
// ---------------------------------------------------------------------------

function buildAvProcessingPipeline(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('av-tgen',    'traffic_generator', 60,  260),
    makeNode('av-lb',      'load_balancer',     300, 260),
    makeNode('av-upload',  'app_server',        540, 260),
    makeNode('av-raw',     'cloud_storage',     780, 260),
    makeNode('av-ps',      'pubsub',            1020, 260),
    makeNode('av-xcode',   'worker_pool',       1260, 260),
    makeNode('av-output',  'block_storage',     1500, 120),
    makeNode('av-cdn',     'cdn',               1500, 400),
  ];

  const edges: Edge[] = [
    makeEdge('av-tgen',   'av-lb'),
    makeEdge('av-lb',     'av-upload'),
    makeEdge('av-upload', 'av-raw'),
    makeEdge('av-raw',    'av-ps'),
    makeEdge('av-ps',     'av-xcode'),
    makeEdge('av-xcode',  'av-output'),
    makeEdge('av-xcode',  'av-cdn'),
  ];

  return {
    nodes,
    edges,
    nodeConfigs: {
      'av-tgen': makeConfig('traffic_generator', {
        label:            'Upload Traffic',
        generatorRps:     400,
        generatorPattern: 'ramp',
        readRatioPct:     10,  // nearly all writes
      }),
      'av-lb': makeConfig('load_balancer', {
        label:     'Upload LB',
        algorithm: 'least_conn',
      }),
      'av-upload': makeConfig('app_server', {
        label:          'Upload Service',
        instances:      4,
        cpuCores:       4,
        ramGb:          8,
        rpsPerInstance: 150,
        workloadType:   'io_bound',
        avgLatencyMs:   60,
      }),
      'av-raw': makeConfig('cloud_storage', {
        label:                 'Raw Media Store',
        storageThroughputMbps: 5000,
        objectSizeKb:          512000, // ~500 MB average video chunk
        storageClass:          'standard',
        storageGb:             100000,
      }),
      'av-ps': makeConfig('pubsub', {
        label:                 'Encode Job Queue',
        partitions:            12,
        messageRetentionHours: 48,
        maxMessageSizeKb:      10,
      }),
      // CPU-heavy transcoding — deliberately constrained to show backlog growth
      'av-xcode': makeConfig('worker_pool', {
        label:          'Transcoder Workers',
        workerCount:    8,
        threadCount:    8,
        taskDurationMs: 3000,   // 3 s per transcode job
      }),
      'av-output': makeConfig('block_storage', {
        label:        'Encoded Output (NVMe)',
        diskType:     'nvme',
        iops:         50000,
        storageGb:    50000,
        objectSizeKb: 256,
      }),
      'av-cdn': makeConfig('cdn', {
        label:         'Media Delivery CDN',
        pops:          8,
        cacheablePct:  95,
        bandwidthGbps: 400,
      }),
    },
    edgeConfigs: buildEdgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 4. Real-Time Chat Application
// ---------------------------------------------------------------------------
// Wave-pattern traffic flows into a WebSocket gateway backed by Redis for
// session / presence data. Outbound messages are published to a fan-out
// Pub/Sub bus consumed by a Delivery Worker Pool (push to mobile / web).
// Message history is persisted to a MongoDB database. Spike the RPS to
// watch Pub/Sub subscriber lag and worker queue depth grow.
// ---------------------------------------------------------------------------

function buildRealTimeChat(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('chat-tgen',    'traffic_generator', 60,  280),
    makeNode('chat-lb',      'load_balancer',     300, 280),
    makeNode('chat-gw',      'app_server',        540, 280),
    makeNode('chat-cache',   'cache',             780, 120),
    makeNode('chat-ps',      'pubsub',            780, 280),
    makeNode('chat-db',      'database',          780, 440),
    makeNode('chat-deliver', 'worker_pool',       1040, 280),
  ];

  const edges: Edge[] = [
    makeEdge('chat-tgen',    'chat-lb'),
    makeEdge('chat-lb',      'chat-gw'),
    makeEdge('chat-gw',      'chat-cache'),
    makeEdge('chat-gw',      'chat-ps'),
    makeEdge('chat-gw',      'chat-db'),
    makeEdge('chat-ps',      'chat-deliver'),
  ];

  return {
    nodes,
    edges,
    nodeConfigs: {
      'chat-tgen': makeConfig('traffic_generator', {
        label:            'Chat Traffic',
        generatorRps:     3500,
        generatorPattern: 'wave',
        readRatioPct:     55,
      }),
      'chat-lb': makeConfig('load_balancer', {
        label:     'WebSocket LB',
        algorithm: 'ip_hash',   // sticky sessions for WebSocket
      }),
      'chat-gw': makeConfig('app_server', {
        label:          'WebSocket Gateway',
        instances:      5,
        cpuCores:       4,
        ramGb:          16,
        rpsPerInstance: 800,
        workloadType:   'io_bound',
        avgLatencyMs:   12,
        autoscalingEnabled:   true,
        minInstances:         3,
        maxInstances:         16,
        warmPoolEnabled:      true,
        warmPoolSize:         2,
        scaleUpCpuPct:        70,
        scaleDownCpuPct:      25,
      }),
      'chat-cache': makeConfig('cache', {
        label:          'Session & Presence',
        memoryGb:       32,
        ttlSeconds:     300,
        evictionPolicy: 'lru',
        clusterMode:    true,
      }),
      'chat-ps': makeConfig('pubsub', {
        label:                 'Message Fan-out',
        partitions:            16,
        messageRetentionHours: 24,
        maxMessageSizeKb:      10,
      }),
      'chat-db': makeConfig('database', {
        label:        'Message History',
        engine:       'MongoDB',
        shards:       4,
        rpsPerShard:  700,
        readReplicas: 2,
      }),
      'chat-deliver': makeConfig('worker_pool', {
        label:          'Delivery Workers',
        workerCount:    12,
        threadCount:    4,
        taskDurationMs: 80,
      }),
    },
    edgeConfigs: buildEdgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// 5. Ride-Sharing / Geo-Matching Platform
// ---------------------------------------------------------------------------
// Spike-pattern traffic (ride requests + driver location updates) flows
// through a CDN edge (caches map tiles) → load balancer → Location Service
// which reads hot driver locations from Redis and writes to a geo-indexed DB.
// The service publishes match-request events to Pub/Sub; a Worker Pool runs
// the geospatial matching algorithm (CPU-bound) and finally invokes a Cloud
// Function to push notifications to drivers and riders.
// Spike the traffic to trigger autoscaling on the Location Service and
// observe the Matching Worker Pool queue depth climb.
// ---------------------------------------------------------------------------

function buildRideSharingPlatform(): ArchitectureTemplate {
  const nodes: Node[] = [
    makeNode('rs-tgen',   'traffic_generator', 60,  280),
    makeNode('rs-cdn',    'cdn',               300, 280),
    makeNode('rs-lb',     'load_balancer',     540, 280),
    makeNode('rs-loc',    'app_server',        780, 280),
    makeNode('rs-cache',  'cache',             1020, 120),
    makeNode('rs-db',     'database',          1020, 440),
    makeNode('rs-ps',     'pubsub',            1260, 280),
    makeNode('rs-match',  'worker_pool',       1500, 160),
    makeNode('rs-notif',  'cloud_function',    1500, 400),
  ];

  const edges: Edge[] = [
    makeEdge('rs-tgen',  'rs-cdn'),
    makeEdge('rs-cdn',   'rs-lb'),
    makeEdge('rs-lb',    'rs-loc'),
    makeEdge('rs-loc',   'rs-cache'),
    makeEdge('rs-loc',   'rs-db'),
    makeEdge('rs-loc',   'rs-ps'),
    makeEdge('rs-ps',    'rs-match'),
    makeEdge('rs-ps',    'rs-notif'),
  ];

  return {
    nodes,
    edges,
    nodeConfigs: {
      'rs-tgen': makeConfig('traffic_generator', {
        label:            'Ride Requests',
        generatorRps:     5000,
        generatorPattern: 'spike',
        readRatioPct:     60,
      }),
      'rs-cdn': makeConfig('cdn', {
        label:         'Map Tile CDN',
        pops:          4,
        cacheablePct:  80,
        bandwidthGbps: 200,
      }),
      'rs-lb': makeConfig('load_balancer', {
        label:     'Request LB',
        algorithm: 'least_conn',
      }),
      'rs-loc': makeConfig('app_server', {
        label:               'Location Service',
        instances:           4,
        cpuCores:            4,
        ramGb:               8,
        rpsPerInstance:      700,
        workloadType:        'io_bound',
        avgLatencyMs:        25,
        autoscalingEnabled:  true,
        minInstances:        2,
        maxInstances:        12,
        warmPoolEnabled:     true,
        warmPoolSize:        2,
        scaleUpCpuPct:       65,
        scaleDownCpuPct:     20,
      }),
      'rs-cache': makeConfig('cache', {
        label:          'Driver Location Cache',
        memoryGb:       24,
        ttlSeconds:     10,   // very short TTL — location data is stale fast
        evictionPolicy: 'lru',
        clusterMode:    true,
      }),
      'rs-db': makeConfig('database', {
        label:        'Geo / Trips DB',
        engine:       'PostgreSQL',
        shards:       3,
        rpsPerShard:  900,
        readReplicas: 2,
      }),
      'rs-ps': makeConfig('pubsub', {
        label:                 'Match Request Bus',
        partitions:            12,
        messageRetentionHours: 1,
        maxMessageSizeKb:      4,
      }),
      'rs-match': makeConfig('worker_pool', {
        label:          'Matching Engine',
        workerCount:    8,
        threadCount:    4,
        taskDurationMs: 150,
      }),
      'rs-notif': makeConfig('cloud_function', {
        label:            'Push Notifier',
        maxConcurrency:   300,
        functionMemoryMb: 256,
        avgExecutionMs:   80,
      }),
    },
    edgeConfigs: buildEdgeConfigs(edges),
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const SCENARIO_LIBRARY: ScenarioEntry[] = [
  {
    id: 'payment-processing',
    name: 'Payment Processing System',
    description:
      'Spike traffic hits a token-bucket rate limiter before reaching the Payment API. A CPU-bound Fraud Detection engine is deliberately under-provisioned — watch it saturate and the rate limiter queue fill during bursts.',
    difficulty: 'advanced',
    tags: ['Payments', 'Rate Limiter', 'Fraud Detection', 'Pub/Sub'],
    template: buildPaymentProcessing(),
  },
  {
    id: 'high-frequency-trading',
    name: 'High-Frequency Trading Platform',
    description:
      'Chaotic 8 000 RPS order flow through a CPU-bound Order Matching Engine writing to NVMe block storage. Market-data events fan out to a Risk Engine and a Market Data Feed via Pub/Sub.',
    difficulty: 'advanced',
    tags: ['HFT', 'Block Storage', 'Pub/Sub', 'CPU-Bound'],
    template: buildHighFrequencyTrading(),
  },
  {
    id: 'av-processing-pipeline',
    name: 'Audio / Video Processing Pipeline',
    description:
      'Upload service writes raw media to Cloud Storage, which enqueues transcoding jobs. A CPU-intensive Worker Pool converts assets and writes to NVMe storage, then pushes finished content to a global CDN.',
    difficulty: 'intermediate',
    tags: ['Video', 'Worker Pool', 'CDN', 'Cloud Storage'],
    template: buildAvProcessingPipeline(),
  },
  {
    id: 'realtime-chat',
    name: 'Real-Time Chat Application',
    description:
      'WebSocket gateway with sticky load balancing, Redis for presence/session, Pub/Sub fan-out to delivery workers, and MongoDB for message history. Autoscaling gateway responds to wave-pattern traffic.',
    difficulty: 'intermediate',
    tags: ['WebSocket', 'Pub/Sub', 'Cache', 'Autoscaling'],
    template: buildRealTimeChat(),
  },
  {
    id: 'ride-sharing',
    name: 'Ride-Sharing / Geo-Matching Platform',
    description:
      'Spike traffic flows through a CDN (map tiles) → Location Service (autoscaling) backed by a short-TTL driver-location cache and a geo-indexed DB. Match requests are queued via Pub/Sub and processed by a geospatial Worker Pool.',
    difficulty: 'advanced',
    tags: ['Geolocation', 'Autoscaling', 'CDN', 'Pub/Sub', 'Serverless'],
    template: buildRideSharingPlatform(),
  },
];

# TODO — System Design Simulator Components

Track implementation progress here. Strike through a title to mark it as implemented.

---

## ~~Implemented Components~~

| Status | Component | Description |
|--------|-----------|-------------|
| ~~Done~~ | ~~**CDN**~~ | ~~Caches static content close to users, reducing latency and offloading origin servers. Configurable PoPs and cacheable percentage.~~ |
| ~~Done~~ | ~~**Load Balancer**~~ | ~~Distributes incoming requests across backend servers. Supports multiple algorithms and tracks active connections.~~ |
| ~~Done~~ | ~~**App Server**~~ | ~~Handles business logic and dynamic requests. Represents a scalable microservice or pool of stateless instances. Full autoscaling FSM with warm pool, cold start, and cooldown tracking.~~ |
| ~~Done~~ | ~~**Cache**~~ | ~~In-memory cache (e.g. Redis) for fast data retrieval. Represents a logical cache system (standalone or cluster). Tracks hit rate, eviction rate, and memory usage.~~ |
| ~~Done~~ | ~~**Database**~~ | ~~Stores persistent data. Represents an entire logical database or cluster. Supports sharding and read replicas with separate read/write load tracking.~~ |
| ~~Done~~ | ~~**Cloud Storage**~~ | ~~Object storage for files, images, and large blobs. Configurable throughput, object size, and storage class (standard/nearline/coldline/archive).~~ |
| ~~Done~~ | ~~**Block Storage**~~ | ~~Persistent block volume (NVMe/SSD/HDD). Stateful queue depth and IOPS-limited throughput behavior are implemented.~~ |
| ~~Done~~ | ~~**Network Storage**~~ | ~~Shared network filesystem storage (NFS/SMB/CephFS). Models throughput limits and connection saturation effects.~~ |
| ~~Done~~ | ~~**Pub/Sub**~~ | ~~Asynchronous message delivery. Represents a single topic. Stateful: accumulates subscriber lag when producers outpace consumers. Configurable partitions.~~ |
| ~~Done~~ | ~~**Cloud Function**~~ | ~~Serverless compute for event-driven or short-lived tasks. Stateful: tracks cold starts triggered by concurrency growth. Configurable memory and concurrency.~~ |
| ~~Done~~ | ~~**Cron Job**~~ | ~~Schedule-driven task emitter. Tracks overlap count and run duration. Configurable interval and tasks per run.~~ |
| ~~Done~~ | ~~**Worker Pool**~~ | ~~Processes background jobs from a queue. Stateful: queue depth accumulates when inflow exceeds capacity. Configurable worker count, threads, and task duration.~~ |
| ~~Done~~ | ~~**Traffic Generator**~~ | ~~Simulates incoming user/system traffic. Configurable RPS, traffic pattern (steady/ramp/spike/wave/chaos), and read/write ratio.~~ |
| ~~Done~~ | ~~**Rate Limiter**~~ | ~~Protects downstream services using token bucket / leaky bucket / fixed window / sliding window / sliding log behavior. Tracks throttling and queue depth where applicable.~~ |
| ~~Done~~ | ~~**Comment**~~ | ~~Annotation-only node for adding notes and labels to architecture diagrams. No simulation effect.~~ |

---

## ~~Recent Progress (Mar 29, 2026)~~

- [x] Landing page vertical scrolling fixed
- [x] Landing page top bar made sticky
- [x] App Server node card updated to show autoscaling instance changes (active/pending)
- [x] Traffic graph enhanced with error-rate curve overlay

---

## Planned Components

| Status | Component | Description & Implementation Notes |
|--------|-----------|--------------------------------------|
| [ ] | **API Gateway** | Entry point for all client requests. Handles routing, authentication, SSL termination, and request validation. Key configs: 
outesCount, uthEnabled, 
ateLimitRps, vgLatencyMs. Failure mode: overload drops requests; auth failures emit errors. |
| [ ] | **Service Mesh** | Manages service-to-service communication with mTLS, retries, circuit breaking, and observability (e.g. Istio, Linkerd). Key configs: 
etryCount, circuitBreakerThreshold, mtlsEnabled. Failure mode: circuit opens on error threshold; retries add latency. |
| [ ] | **Firewall / WAF** | Filters and blocks unwanted or malicious traffic (e.g. DDoS, SQL injection). Key configs: 
ulesCount, lockRatePct, inspectionLatencyMs. Failure mode: overload degrades inspection, increasing pass-through of bad traffic. |
| [ ] | **NAT Gateway** | Provides outbound internet access for private subnet resources. Key configs: andwidthMbps, maxConnections. Failure mode: bandwidth saturation causes packet loss; connection limits cause drops. |
| [ ] | **Blob Storage** | Scalable unstructured object storage (e.g. S3, Azure Blob, GCS). Distinct from Cloud Storage in allowing multi-part uploads and lifecycle policies. Key configs: 	hroughputMbps, objectSizeKb, 	ieringEnabled. Failure mode: throttled requests on bandwidth saturation. |
| [ ] | **Stream Processing** | Real-time data processing engine. Dropdown to select engine: Flink, Kafka Streams, Spark Streaming, AWS Kinesis. Key configs: parallelism, windowSizeMs, checkpointIntervalMs. Failure mode: stateful; backpressure accumulates when processing lag grows. |
| [ ] | **Search Engine** | Full-text search and analytics index (e.g. Elasticsearch, OpenSearch, Typesense). Key configs: shards, 
eplicaCount, vgQueryMs, indexingRps. Failure mode: shard overload degrades query latency; write amplification from indexing. |
| [ ] | **Message Queue** | Traditional point-to-point or competing-consumer queue (e.g. RabbitMQ, AWS SQS, ActiveMQ). Distinct from Pub/Sub: messages are consumed once. Key configs: queueDepthLimit, consumers, vgMsgProcessingMs. Failure mode: stateful; dead-letter queue fills on consumer failure. |
| [ ] | **Data Lake / Warehouse** | Centralized storage for analytics and big data workloads (e.g. Snowflake, BigQuery, Redshift, Delta Lake). Key configs: storageGb, querySlots, vgQueryMs. Failure mode: slot exhaustion queues analytical queries; scan costs spike on large datasets. |
| [ ] | **Monitoring / Alert Node** | Observability component simulating metrics collection, aggregation, and alerting (e.g. Prometheus, Datadog, Grafana). Key configs: scrapeIntervalMs, lertRules, 
etentionDays. Failure mode: high cardinality causes memory pressure; alert storms on cascade failures. |
| [ ] | **ML Inference Node** | Serves machine learning model predictions. GPU type selectable via dropdown: T4, A10G, A100, H100, CPU-only. Key configs: gpuType, atchSize, vgInferenceMs, modelMemoryGb. Failure mode: GPU memory exhaustion causes OOM errors; batching queue grows under load. |

---

> See [COMPONENTS.md](./COMPONENTS.md) for full usage and configuration details for implemented components.

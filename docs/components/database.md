# Database

**Scope:** `zonal`

This component models a persistent data store with separate read/write pressure and optional primary/replica behavior.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `engine` | `PostgreSQL` | `PostgreSQL`, `MySQL`, `MongoDB`, `Redis`, `Cassandra` | Storage engine label. |
| `instanceType` | `db.m5.large` | string | Display-oriented instance class. |
| `storageGb` | `100` | number `>= 0` | Provisioned storage size. |
| `readReplicas` | `0` | integer `>= 0` | Extra read capacity in `standalone` mode. |
| `shards` | `1` | integer `>= 1` | Number of shards modeled by the node. |
| `rpsPerShard` | `800` | number `> 0` | Throughput per shard or replica. |
| `maxConnections` | `200` | integer `>= 1` | Connection pool ceiling. |
| `dbRole` | `standalone` | `standalone`, `primary`, `replica` | Replication role. |
| `primaryNodeId` | — | existing database node ID | Used when `dbRole: replica`. |
| `zoneId` | — | existing zone node ID | Required zonal placement field. |

## Role behavior

| Role | Behavior |
|---|---|
| `standalone` | One logical DB plus optional virtual read replicas |
| `primary` | Handles reads and writes directly |
| `replica` | Serves reads and forwards writes to `primaryNodeId` |

## Simulation notes

- Standalone read capacity is `shards × rpsPerShard + readReplicas × rpsPerShard`.
- Replicas add routing latency for writes and can expose replication lag.
- Metrics include connection pool usage, queue depth, slow-query rate, and write rejection data.

## YAML example

```yaml
- id: db-primary
  type: database
  label: Orders DB
  placement:
    zone: use1a
  spec:
    engine: PostgreSQL
    dbRole: primary
    shards: 2
    rpsPerShard: 1000
    maxConnections: 400
```

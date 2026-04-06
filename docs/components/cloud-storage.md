# Cloud Storage

**Scope:** `regional`

A regional object store for assets, blobs, backups, and event-driven storage workflows.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `storageThroughputMbps` | `1000` | number `> 0` | Throughput used to estimate ops/sec. |
| `objectSizeKb` | `512` | number `> 0` | Average object size for throughput math. |
| `storageClass` | `standard` | `standard`, `nearline`, `coldline`, `archive` | Changes latency characteristics. |
| `storageGb` | `1000` | number `>= 0` | Logical storage size for documentation/visuals. |
| `regionId` | — | existing region node ID | Required regional placement field. |

## Storage class behavior

| Class | Base latency |
|---|---:|
| `standard` | `20 ms` |
| `nearline` | `50 ms` |
| `coldline` | `100 ms` |
| `archive` | `500 ms` |

## Simulation notes

- Approximate throughput formula: `(throughputMbps × 1000 / 8) / objectSizeKb` operations per second.
- About 10% of output traffic can appear as storage-triggered downstream events.

## YAML example

```yaml
- id: assets
  type: cloud_storage
  label: Asset Bucket
  placement:
    region: us-east-1
  spec:
    storageThroughputMbps: 1500
    objectSizeKb: 256
    storageClass: standard
    storageGb: 2500
```

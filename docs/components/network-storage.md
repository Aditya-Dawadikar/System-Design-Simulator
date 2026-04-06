# Network Storage

**Scope:** `zonal`

This component models a shared mounted filesystem with throughput and connection limits.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `nfsProtocol` | `nfs` | `nfs`, `smb`, `cephfs` | Protocol label that affects base latency. |
| `storageThroughputMbps` | `500` | number `> 0` | Main throughput limit. |
| `connectionLimit` | `100` | integer `>= 1` | Maximum concurrent mounts/connections. |
| `objectSizeKb` | `64` | number `> 0` | Average IO size used in throughput math. |
| `storageGb` | `1000` | number `>= 0` | Provisioned capacity. |
| `zoneId` | — | existing zone node ID | Required zonal placement field. |

## Protocol behavior

| Protocol | Base latency |
|---|---:|
| `nfs` | `5 ms` |
| `smb` | `8 ms` |
| `cephfs` | `3 ms` |

## Simulation notes

- Approximate throughput formula: `(throughputMbps × 1000 / 8) / objectSizeKb`.
- Near connection saturation adds extra latency.
- Metrics include active connections and bandwidth used.

## YAML example

```yaml
- id: shared-fs
  type: network_storage
  label: Shared Filesystem
  placement:
    zone: use1a
  spec:
    nfsProtocol: cephfs
    storageThroughputMbps: 900
    connectionLimit: 250
    objectSizeKb: 64
```

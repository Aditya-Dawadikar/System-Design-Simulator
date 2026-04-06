# Block Storage

**Scope:** `zonal`

Use this node to represent attached block volumes where IOPS and disk type matter.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `diskType` | `ssd` | `nvme`, `ssd`, `hdd` | Changes base latency characteristics. |
| `iops` | `3000` | number `> 0` | Main throughput limit. |
| `storageGb` | `100` | number `>= 0` | Provisioned volume size. |
| `objectSizeKb` | `64` | number `> 0` | Average IO size for throughput reporting. |
| `zoneId` | — | existing zone node ID | Required zonal placement field. |

## Disk behavior

| Disk type | Base latency |
|---|---:|
| `nvme` | `0.2 ms` |
| `ssd` | `1 ms` |
| `hdd` | `5 ms` |

## Simulation notes

- Queue depth grows when incoming IOPS exceed the limit.
- Metrics include IOPS used, queue depth, and effective throughput.

## YAML example

```yaml
- id: ebs-volume
  type: block_storage
  label: DB Volume
  placement:
    zone: use1a
  spec:
    diskType: nvme
    iops: 12000
    storageGb: 500
    objectSizeKb: 32
```

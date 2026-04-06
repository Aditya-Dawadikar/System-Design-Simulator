# Simulator IaC Authoring Guide

This document is the starting point for writing a simulator YAML file.

## Tutorial goals

The full tutorial should teach users how to:

1. define `version`, `name`, and `globals`
2. declare `regions` and `zones`
3. add `resources` with the correct placement scope
4. wire `connections` between resources
5. validate and apply the topology in the editor
6. troubleshoot common validation errors

## Recommended tutorial structure

### 1. Minimal first example
Start with a tiny topology such as:
- one `traffic_generator`
- one `load_balancer`
- one `app_server`
- one `database`

### 2. Placement rules
Explain the three placement scopes:

| Scope | Use for | YAML field |
|---|---|---|
| `global` | CDN, comments, generators, global routing | no region/zone needed |
| `regional` | gateways, load balancers, storage, pub/sub | `placement.region` |
| `zonal` | app servers, databases, caches, workers | `placement.zone` |

### 3. Component-specific tuning
Link to `docs/components/` for defaults, valid enum options, and behavior notes.

### 4. Validation checklist
- IDs must be unique
- `from` and `to` references must exist
- zonal resources need a valid zone
- regional resources need a valid region
- enum values must match the supported options

> Expand this guide over time into the full end-user tutorial requested in `TODO.md`.

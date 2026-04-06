# Comment

**Scope:** `global`

This is a documentation-only node used to annotate the canvas.

## Configuration reference

| Property | Default | Range / Options | Notes |
|---|---:|---|---|
| `commentBody` | `""` | free text | Stores the note shown in the comment box. |

## Simulation notes

| Item | Value |
|---|---|
| Processes traffic | No |
| Generates metrics | No |
| Best use | Document assumptions, ownership, warnings, or deployment notes |

## YAML example

```yaml
- id: note-auth
  type: comment
  label: Auth note
  placement:
    scope: global
  spec:
    commentBody: "JWT validation happens in the gateway tier"
```

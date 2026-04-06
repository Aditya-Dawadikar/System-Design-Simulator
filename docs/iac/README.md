# IaC Documentation

This folder is reserved for the simulator's Terraform-like YAML authoring docs.

## Contents

- [`authoring-guide.md`](./authoring-guide.md) — step-by-step onboarding for writing a simulator IaC file
- [`reference.md`](./reference.md) — quick reference for top-level YAML structure and common fields

## How this connects to component docs

When writing YAML, use the files in `docs/components/` to answer questions like:

- which properties belong to a component
- what default values apply if a field is omitted
- what enum values or algorithms are accepted
- what behavior the simulator models for that resource

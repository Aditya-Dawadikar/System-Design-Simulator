/**
 * src/iac/normalize.ts
 *
 * Fills in defaults and normalizes an IacDocument after schema validation.
 * Does not perform validation — run validateDocument first.
 *
 * Pure module — no React imports, no store imports.
 */

import type { IacDocument, IacResource } from './schema';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a new IacDocument with sensible defaults filled in.
 * - resources without explicit placement get a default placement object
 * - empty arrays are normalized to undefined (keeps YAML output clean)
 */
export function normalizeDocument(doc: IacDocument): IacDocument {
  return {
    ...doc,
    regions: doc.regions?.length ? doc.regions : undefined,
    resources: doc.resources.map(normalizeResource),
    connections: doc.connections?.length ? doc.connections : undefined,
    scenarios: doc.scenarios?.length ? doc.scenarios : undefined,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeResource(resource: IacResource): IacResource {
  return {
    ...resource,
    spec: resource.spec && Object.keys(resource.spec).length > 0 ? resource.spec : undefined,
    deploy: resource.deploy ? normalizeDeployDefaults(resource.deploy) : undefined,
  };
}

function normalizeDeployDefaults(deploy: IacResource['deploy']): IacResource['deploy'] {
  if (!deploy) return undefined;

  const autoscaling = deploy.autoscaling;
  if (!autoscaling) return deploy;

  // If autoscaling is disabled and has no other fields, strip it
  if (!autoscaling.enabled) {
    const { enabled: _enabled, ...rest } = autoscaling;
    void _enabled;
    const hasOtherFields = Object.keys(rest).length > 0;
    if (!hasOtherFields) {
      const { autoscaling: _unused, ...deployWithout } = deploy;
      void _unused;
      return deployWithout;
    }
  }

  return deploy;
}

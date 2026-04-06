/**
 * src/iac/validate.ts
 *
 * Semantic validation for a parsed IacDocument.
 * Runs AFTER the Zod schema check in parser.ts.
 * Catches constraints that are not expressible in the schema alone.
 *
 * Pure module — no React imports, no store imports.
 */

import { COMPONENT_BY_TYPE } from '@/constants/components';
import {
  ZONAL_COMPONENT_TYPES,
  REGIONAL_COMPONENT_TYPES,
  CONTAINER_COMPONENT_TYPES,
} from './schema';
import type { IacDocument, ValidationIssue } from './schema';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run semantic checks against a structurally-valid IacDocument.
 * Returns an array of issues — empty means valid.
 */
export function validateDocument(doc: IacDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const regionIds = new Set<string>();
  const zoneIds = new Set<string>();
  const resourceIds = new Set<string>();

  // --- Collect declared region/zone IDs ---
  for (const region of doc.regions ?? []) {
    regionIds.add(region.id);
    for (const zone of region.zones ?? []) {
      zoneIds.add(zone.id);
    }
  }

  // --- Resource-level checks ---
  for (let i = 0; i < doc.resources.length; i++) {
    const resource = doc.resources[i];
    const path = `resources[${i}]`;

    // Duplicate resource IDs
    if (resourceIds.has(resource.id)) {
      issues.push({
        severity: 'error',
        message: `Duplicate resource id "${resource.id}"`,
        path: `${path}.id`,
      });
    } else {
      resourceIds.add(resource.id);
    }

    // Container types should not appear in resources[]
    if (CONTAINER_COMPONENT_TYPES.has(resource.type)) {
      issues.push({
        severity: 'warning',
        message: `Type "${resource.type}" is an infrastructure container — declare it in regions[] instead of resources[]`,
        path: `${path}.type`,
      });
      continue; // skip placement checks for containers
    }

    const scope = COMPONENT_BY_TYPE[resource.type]?.scope;
    const placement = resource.placement;

    if (scope === 'zonal') {
      // Must have zone placement
      if (!placement?.zone) {
        issues.push({
          severity: 'error',
          message: `Resource "${resource.id}" (type "${resource.type}") is zonal and requires placement.zone`,
          path: `${path}.placement`,
        });
      } else if (!zoneIds.has(placement.zone)) {
        issues.push({
          severity: 'error',
          message: `Resource "${resource.id}" references zone "${placement.zone}" which is not declared in regions[]`,
          path: `${path}.placement.zone`,
        });
      }
      // Warn if also has region (region is inferred from zone)
      if (placement?.region) {
        issues.push({
          severity: 'warning',
          message: `Resource "${resource.id}" is zonal — placement.region is redundant when placement.zone is set`,
          path: `${path}.placement.region`,
        });
      }
    } else if (scope === 'regional') {
      // Must have region placement
      if (!placement?.region) {
        issues.push({
          severity: 'error',
          message: `Resource "${resource.id}" (type "${resource.type}") is regional and requires placement.region`,
          path: `${path}.placement`,
        });
      } else if (!regionIds.has(placement.region)) {
        issues.push({
          severity: 'error',
          message: `Resource "${resource.id}" references region "${placement.region}" which is not declared in regions[]`,
          path: `${path}.placement.region`,
        });
      }
      // Zone placement is not valid for regional types
      if (placement?.zone) {
        issues.push({
          severity: 'error',
          message: `Resource "${resource.id}" (type "${resource.type}") is regional and cannot have placement.zone`,
          path: `${path}.placement.zone`,
        });
      }
    } else if (scope === 'global') {
      // Global types should NOT be pinned to a zone or region
      if (placement?.zone) {
        issues.push({
          severity: 'error',
          message: `Resource "${resource.id}" (type "${resource.type}") is global and cannot have placement.zone`,
          path: `${path}.placement.zone`,
        });
      }
      if (placement?.region) {
        issues.push({
          severity: 'error',
          message: `Resource "${resource.id}" (type "${resource.type}") is global and cannot have placement.region`,
          path: `${path}.placement.region`,
        });
      }
    }

    // Self-referencing connections are caught below, but check deploy/spec type mismatch
    if (resource.deploy && !ZONAL_COMPONENT_TYPES.has(resource.type) && !REGIONAL_COMPONENT_TYPES.has(resource.type)) {
      if (!['app_server', 'cloud_function', 'worker_pool'].includes(resource.type)) {
        issues.push({
          severity: 'warning',
          message: `Resource "${resource.id}" (type "${resource.type}") uses a deploy block but this type typically uses spec`,
          path: `${path}.deploy`,
        });
      }
    }
  }

  // --- Duplicate check across region/zone IDs vs resource IDs ---
  for (const regionId of regionIds) {
    if (resourceIds.has(regionId)) {
      issues.push({
        severity: 'error',
        message: `ID "${regionId}" is used by both a region and a resource`,
      });
    }
  }
  for (const zoneId of zoneIds) {
    if (resourceIds.has(zoneId)) {
      issues.push({
        severity: 'error',
        message: `ID "${zoneId}" is used by both a zone and a resource`,
      });
    }
  }

  // --- Duplicate region IDs ---
  const seenRegionIds = new Set<string>();
  for (const region of doc.regions ?? []) {
    if (seenRegionIds.has(region.id)) {
      issues.push({
        severity: 'error',
        message: `Duplicate region id "${region.id}"`,
        path: 'regions',
      });
    }
    seenRegionIds.add(region.id);

    const seenZoneIds = new Set<string>();
    for (const zone of region.zones ?? []) {
      if (seenZoneIds.has(zone.id)) {
        issues.push({
          severity: 'error',
          message: `Duplicate zone id "${zone.id}" in region "${region.id}"`,
          path: `regions[id=${region.id}].zones`,
        });
      }
      seenZoneIds.add(zone.id);
    }
  }

  // --- Connection-level checks ---
  const allIds = new Set([...regionIds, ...zoneIds, ...resourceIds]);

  for (let i = 0; i < (doc.connections ?? []).length; i++) {
    const conn = doc.connections![i];
    const path = `connections[${i}]`;

    if (conn.from === conn.to) {
      issues.push({
        severity: 'error',
        message: `Connection at index ${i} is self-referencing (from === to = "${conn.from}")`,
        path,
      });
    }

    if (!resourceIds.has(conn.from) && !allIds.has(conn.from)) {
      issues.push({
        severity: 'error',
        message: `Connection from "${conn.from}" references an unknown resource id`,
        path: `${path}.from`,
      });
    } else if (!resourceIds.has(conn.from)) {
      issues.push({
        severity: 'warning',
        message: `Connection from "${conn.from}" references a region/zone id rather than a resource id`,
        path: `${path}.from`,
      });
    }

    if (!resourceIds.has(conn.to) && !allIds.has(conn.to)) {
      issues.push({
        severity: 'error',
        message: `Connection to "${conn.to}" references an unknown resource id`,
        path: `${path}.to`,
      });
    } else if (!resourceIds.has(conn.to)) {
      issues.push({
        severity: 'warning',
        message: `Connection to "${conn.to}" references a region/zone id rather than a resource id`,
        path: `${path}.to`,
      });
    }
  }

  return issues;
}

/**
 * Returns true if an issues array contains at least one error (not just warnings).
 */
export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}

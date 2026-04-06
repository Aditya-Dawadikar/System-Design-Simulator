/**
 * src/iac/parser.ts
 *
 * Parses a YAML string into an IacDocument.
 * Runs Zod schema validation after YAML parsing.
 * Returns structured errors with line/path context where possible.
 *
 * Pure module — no React imports, no store imports.
 */

import yaml from 'js-yaml';
import { IacDocumentSchema } from './schema';
import type { IacDocument, ValidationIssue } from './schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParseSuccess {
  ok: true;
  document: IacDocument;
}

export interface ParseFailure {
  ok: false;
  issues: ValidationIssue[];
}

export type ParseResult = ParseSuccess | ParseFailure;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a YAML string into a validated IacDocument.
 *
 * Returns `{ ok: true, document }` on success.
 * Returns `{ ok: false, issues }` on any syntax or schema error.
 */
export function parseDocument(text: string): ParseResult {
  // --- 1. YAML syntax parsing ---
  let raw: unknown;
  try {
    raw = yaml.load(text);
  } catch (err) {
    const yamlErr = err as yaml.YAMLException;
    return {
      ok: false,
      issues: [
        {
          severity: 'error',
          message: `YAML syntax error: ${yamlErr.reason ?? yamlErr.message}`,
          line: yamlErr.mark?.line != null ? yamlErr.mark.line + 1 : undefined,
        },
      ],
    };
  }

  if (raw === null || raw === undefined) {
    return {
      ok: false,
      issues: [{ severity: 'error', message: 'Document is empty' }],
    };
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      issues: [{ severity: 'error', message: 'Document must be a YAML mapping (object), not a scalar or list' }],
    };
  }

  // --- 2. Zod schema validation ---
  const result = IacDocumentSchema.safeParse(raw);
  if (!result.success) {
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      severity: 'error' as const,
      message: issue.message,
      path: issue.path.length > 0 ? issue.path.join('.') : undefined,
    }));
    return { ok: false, issues };
  }

  return { ok: true, document: result.data };
}

/**
 * Parse raw YAML into an unknown JS value without schema validation.
 * Useful for inspecting the raw structure before validation.
 */
export function parseRaw(text: string): { ok: true; data: unknown } | { ok: false; message: string; line?: number } {
  try {
    const data = yaml.load(text);
    return { ok: true, data };
  } catch (err) {
    const yamlErr = err as yaml.YAMLException;
    return {
      ok: false,
      message: `YAML syntax error: ${yamlErr.reason ?? yamlErr.message}`,
      line: yamlErr.mark?.line != null ? yamlErr.mark.line + 1 : undefined,
    };
  }
}

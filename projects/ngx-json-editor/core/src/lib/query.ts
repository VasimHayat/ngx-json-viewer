import { search } from 'jmespath';
import { JsonValue, Result, err, ok } from './types';

/**
 * Run a JMESPath expression against a document. This is the default
 * `QUERY_ENGINE` implementation; hosts can swap in another engine via the
 * adapter token. Errors (invalid expressions) are returned, never thrown.
 */
export function queryJmespath(data: JsonValue, expression: string): Result<JsonValue, Error> {
  try {
    // jmespath is untyped at the value boundary; we constrain to JsonValue.
    const result = search(data as unknown as object, expression) as JsonValue;
    return ok(result ?? null);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

/** Comparison operators supported by the transform builder UI. */
export type FilterOperator =
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'contains'
  | 'starts_with'
  | 'ends_with';

/** A single filter clause (field + operator + value). */
export interface TransformFilter {
  /** Field path relative to each array element; empty/undefined = the element. */
  readonly field?: string;
  readonly operator: FilterOperator;
  readonly value: string;
}

/** Sort clause for the transform builder. */
export interface TransformSort {
  readonly field?: string;
  readonly direction: 'asc' | 'desc';
}

/**
 * The JSONEditorOnline-style transform: filter, then sort, then project a
 * subset of fields. All parts optional; assembled into one JMESPath pipeline.
 */
export interface TransformOptions {
  readonly filter?: TransformFilter;
  readonly sort?: TransformSort;
  /** Fields to keep on each element (projection). Empty = keep whole element. */
  readonly projection?: readonly string[];
}

/**
 * Build a JMESPath expression (operating on an array document) from a
 * {@link TransformOptions} description. Mirrors the filter→sort→project builder
 * in jsoneditoronline.org's Transform dialog.
 */
export function buildJmespathQuery(options: TransformOptions): string {
  // Compose with the pipe operator rather than nesting `sort_by(<filter>, …)`:
  // JMESPath mis-parses a filter projection passed as a function argument, but
  // the piped form (`<filter> | sort_by(@, …) | [].{…}`) is correct and also
  // mirrors jsoneditoronline.org's Transform builder.
  const stages: string[] = [];

  let head = '@';
  if (options.filter && options.filter.value !== '') {
    const field = fieldRef(options.filter.field);
    const literal = formatLiteral(options.filter.value);
    const op = options.filter.operator;
    head =
      op === 'contains' || op === 'starts_with' || op === 'ends_with'
        ? `@[?${op}(${field}, ${literal})]`
        : `@[?${field} ${op} ${literal}]`;
  }
  stages.push(head);

  if (options.sort) {
    const ref = options.sort.field ? `&${options.sort.field}` : '&@';
    stages.push(
      options.sort.direction === 'desc' ? `reverse(sort_by(@, ${ref}))` : `sort_by(@, ${ref})`,
    );
  }

  if (options.projection && options.projection.length > 0) {
    const proj = options.projection.map((f) => `${jsonKey(f)}: ${f}`).join(', ');
    stages.push(`[].{${proj}}`);
  }

  return stages.join(' | ');
}

/** Apply a transform builder description directly to a document. */
export function applyTransform(
  data: JsonValue,
  options: TransformOptions,
): Result<JsonValue, Error> {
  return queryJmespath(data, buildJmespathQuery(options));
}

function fieldRef(field: string | undefined): string {
  return field && field.length > 0 ? field : '@';
}

/** Format a user-supplied value as a JMESPath literal (number, bool, or string). */
function formatLiteral(value: string): string {
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return `\`${value}\``;
  }
  if (value === 'true' || value === 'false' || value === 'null') {
    return `\`${value}\``;
  }
  // Raw string literal (single-quoted) — escape embedded single quotes.
  return `'${value.replace(/'/g, "\\'")}'`;
}

/** Quote a projection key if it isn't a bare identifier. */
function jsonKey(field: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(field) ? field : JSON.stringify(field);
}

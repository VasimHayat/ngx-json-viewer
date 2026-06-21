/**
 * Framework-free type system shared by every layer of ngx-json-editor.
 *
 * Nothing in `core/` may import Angular or touch the DOM — these types are the
 * contract between the pure logic engine and the Angular UI layer.
 */

/** A JSON scalar. */
export type JsonPrimitive = string | number | boolean | null;

/** Any value that can appear in a JSON document. */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/** A JSON object node. */
export interface JsonObject {
  [key: string]: JsonValue;
}

/** A JSON array node. */
export type JsonArray = JsonValue[];

/**
 * A location within a JSON document expressed as a sequence of segments.
 * Object members are addressed by string key, array elements by numeric index.
 * The empty array `[]` addresses the document root.
 */
export type JsonPath = readonly (string | number)[];

/** The six value kinds the editor distinguishes for type-aware rendering/editing. */
export type JsonValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

/**
 * A result wrapper. Public/core APIs return errors as values rather than
 * throwing (per the guardrails in the spec); `ok` discriminates the union.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Construct a successful {@link Result}. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Construct a failed {@link Result}. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Zero-based source position used for parse/validation diagnostics. */
export interface SourceLocation {
  /** Byte/character offset from the start of the text. */
  readonly offset: number;
  /** 1-based line number. */
  readonly line: number;
  /** 1-based column number. */
  readonly column: number;
}

/** A JSON parse failure with a human-readable message and source location. */
export interface JsonParseError {
  readonly kind: 'parse';
  readonly message: string;
  readonly location: SourceLocation;
}

/** Severity for a validation finding. */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * A schema or custom-validator finding, addressed by {@link JsonPath} so the UI
 * can surface it on the offending tree node, table cell, or text gutter.
 */
export interface ValidationError {
  readonly path: JsonPath;
  readonly message: string;
  readonly severity: ValidationSeverity;
  /** Originating validator, e.g. `'schema'`, `'parse'`, or a custom id. */
  readonly source?: string;
  /** Optional machine-readable code (e.g. an Ajv keyword like `required`). */
  readonly code?: string;
}

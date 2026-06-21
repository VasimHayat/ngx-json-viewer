import { JsonValue, ValidationError } from '@vasimhayat007/ngx-json-editor/core';

/**
 * A JSON Schema document (draft-07 / 2019-09 / 2020-12 — whichever the injected
 * Ajv instance is configured for). Kept structurally open; we never introspect
 * the schema ourselves beyond handing it to the validator adapter.
 */
export type JsonSchema = boolean | Readonly<Record<string, unknown>>;

/**
 * Custom validation hook. Receives the parsed document and returns findings.
 * Returns `[]` for a valid document. Must not throw — return errors as values.
 */
export type ValidatorFn = (value: JsonValue) => readonly ValidationError[];

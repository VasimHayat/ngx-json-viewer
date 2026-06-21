import {
  JsonPatch,
  JsonPath,
  JsonValue,
  RepairResult,
  ValidationError,
} from 'ngx-json-editor/core';

/** The three runtime-switchable editor modes. */
export type EditorMode = 'tree' | 'text' | 'table';

/**
 * Two-way bindable editor content. Supply EITHER a parsed `json` value OR raw
 * `text`. Text content can be invalid JSON (it round-trips verbatim); json
 * content is always well-formed. Switching modes converts between the two.
 */
export type JsonEditorContent =
  | { readonly json: JsonValue; readonly text?: undefined }
  | { readonly text: string; readonly json?: undefined };

/** Type guard: content carries a parsed `json` value. */
export function isJsonContent(c: JsonEditorContent): c is { json: JsonValue; text?: undefined } {
  return (c as { json?: unknown }).json !== undefined || !('text' in c);
}

/** Type guard: content carries raw `text`. */
export function isTextContent(c: JsonEditorContent): c is { text: string; json?: undefined } {
  return (
    (c as { text?: unknown }).text !== undefined && (c as { json?: unknown }).json === undefined
  );
}

/** Re-exported from core so consumers can import it from the main entry point. */
export type { RepairResult };

/**
 * Emitted on every content change. `patch` is the RFC 6902 diff that produced
 * this change (absent for whole-document replacements such as text re-parse).
 */
export interface OnChangeStatus {
  readonly content: JsonEditorContent;
  readonly errors: readonly ValidationError[];
  readonly patch?: JsonPatch;
}

/** Re-exported so consumers get the path type without importing `/core`. */
export type { JsonPath, ValidationError };

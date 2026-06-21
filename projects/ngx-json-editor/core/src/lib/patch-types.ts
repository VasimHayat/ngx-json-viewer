import { JsonValue } from './types';

/** RFC 6902 operation verbs. */
export type JsonPatchOp = 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';

/** A single RFC 6902 JSON Patch operation. `path`/`from` are RFC 6901 pointers. */
export interface JsonPatchOperation {
  readonly op: JsonPatchOp;
  readonly path: string;
  readonly value?: JsonValue;
  readonly from?: string;
}

/** An ordered list of patch operations applied atomically. */
export type JsonPatch = readonly JsonPatchOperation[];

/**
 * The outcome of applying a patch: the resulting document plus the inverse
 * patch that exactly undoes it (the basis of the undo/redo history stack).
 */
export interface PatchResult {
  readonly doc: JsonValue;
  readonly applied: JsonPatch;
  readonly inverse: JsonPatch;
}

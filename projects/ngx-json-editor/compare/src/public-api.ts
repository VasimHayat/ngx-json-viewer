/*
 * Secondary entry point `ngx-json-editor/compare`.
 *
 * The framework-free structural diff logic (compare two documents), importable
 * on its own.
 */
export { diffStructural, diffToPatch, summarizeDiff } from 'ngx-json-editor/core';
export type { DiffNode, DiffStatus, DiffSummary } from 'ngx-json-editor/core';

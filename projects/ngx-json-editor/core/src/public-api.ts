/*
 * Public API surface of `ngx-json-editor/core`.
 *
 * Framework-free JSON logic: types, value classification, JSON Pointer/path
 * utilities, and (added in later phases) parse, repair, patch, diff, sort,
 * schema validation, and query. Contains zero Angular or DOM imports so it can
 * be unit-tested and reused in isolation (including inside a Web Worker).
 */
export * from './lib/types';
export * from './lib/value-type';
export * from './lib/json-pointer';
export * from './lib/patch-types';

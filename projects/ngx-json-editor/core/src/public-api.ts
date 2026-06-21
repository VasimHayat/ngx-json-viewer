/*
 * Public API surface of `ngx-json-editor/core`.
 *
 * Framework-free JSON logic: types, value classification, JSON Pointer/path
 * utilities, parser (with located errors), repair, RFC 6902 patch apply/invert,
 * structural diff, sort, JMESPath query/transform, and Ajv schema validation.
 * Contains zero Angular or DOM imports so it can be unit-tested and reused in
 * isolation (including inside a Web Worker).
 */
export * from './lib/types';
export * from './lib/value-type';
export * from './lib/json-pointer';
export * from './lib/patch-types';
export * from './lib/parse';
export * from './lib/repair';
export * from './lib/patch';
export * from './lib/diff';
export * from './lib/sort';
export * from './lib/query';
export * from './lib/schema';

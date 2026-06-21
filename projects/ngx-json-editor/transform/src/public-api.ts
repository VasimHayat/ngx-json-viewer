/*
 * Secondary entry point `ngx-json-editor/transform`.
 *
 * The framework-free JMESPath query + builder logic, importable on its own when
 * a consumer only needs transform capabilities (no Angular, no editor UI).
 */
export { queryJmespath, buildJmespathQuery, applyTransform } from '@vasimhayat007/ngx-json-editor/core';
export type {
  FilterOperator,
  TransformFilter,
  TransformSort,
  TransformOptions,
} from '@vasimhayat007/ngx-json-editor/core';

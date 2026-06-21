/*
 * Public API surface of `ngx-json-editor`.
 *
 * The primary entry point exports the editor component, its configuration and
 * model types, the injectable adapters/tokens, and a convenience re-export of
 * the most commonly needed framework-free types from `ngx-json-editor/core`.
 */

// Primary component
export { NgxJsonEditorComponent } from './lib/components/editor/ngx-json-editor.component';

// Public models / configuration
export * from './lib/models';

// Convenience re-exports of core types so consumers needn't import `/core`
export type {
  JsonValue,
  JsonObject,
  JsonArray,
  JsonPrimitive,
  JsonPath,
  JsonValueType,
  ValidationError,
  ValidationSeverity,
  SourceLocation,
  JsonParseError,
  JsonPatch,
  JsonPatchOperation,
} from 'ngx-json-editor/core';

import { JsonArray, JsonObject, JsonValue, JsonValueType } from './types';

/** Narrowing guard: is `value` a plain JSON object (not array, not null)? */
export function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Narrowing guard: is `value` a JSON array? */
export function isJsonArray(value: JsonValue): value is JsonArray {
  return Array.isArray(value);
}

/** Is `value` an object or array (i.e. has children)? */
export function isContainer(value: JsonValue): value is JsonObject | JsonArray {
  return typeof value === 'object' && value !== null;
}

/** Classify a JSON value into one of the six {@link JsonValueType} kinds. */
export function getValueType(value: JsonValue): JsonValueType {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  switch (typeof value) {
    case 'object':
      return 'object';
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      // Programmer error: undefined/function/symbol/bigint are not JSON.
      throw new TypeError(`Value of type "${typeof value}" is not valid JSON`);
  }
}

/**
 * Produce a sensible default value for a target type, preserving information
 * where possible (used when the user changes a node's type via the dropdown).
 */
export function coerceToType(value: JsonValue, target: JsonValueType): JsonValue {
  switch (target) {
    case 'string':
      return value === null || isContainer(value) ? '' : String(value);
    case 'number': {
      const n = typeof value === 'string' ? Number(value) : value;
      return typeof n === 'number' && Number.isFinite(n) ? n : 0;
    }
    case 'boolean':
      return Boolean(value) && value !== 'false';
    case 'null':
      return null;
    case 'object':
      return isJsonObject(value) ? value : {};
    case 'array':
      return isJsonArray(value) ? value : isContainer(value) ? Object.values(value) : [];
    default:
      return value;
  }
}

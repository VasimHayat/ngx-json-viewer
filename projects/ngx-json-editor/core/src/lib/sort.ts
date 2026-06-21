import { JsonArray, JsonObject, JsonValue } from './types';
import { getValueType, isJsonArray, isJsonObject } from './value-type';

/** What to sort an object/array by. */
export type SortBy = 'key' | 'value';

/** Options for {@link sortJson}. */
export interface SortOptions {
  /** Objects: `'key'` (default) or `'value'`. Arrays always sort by value. */
  readonly by?: SortBy;
  /** Sort direction. */
  readonly direction?: 'asc' | 'desc';
  /** Recurse into nested containers. */
  readonly recursive?: boolean;
  /** For arrays of objects, the property to sort elements by. */
  readonly property?: string | null;
}

const TYPE_RANK: Readonly<Record<string, number>> = {
  null: 0,
  boolean: 1,
  number: 2,
  string: 3,
  array: 4,
  object: 5,
};

/**
 * Total ordering over JSON values: by type rank, then within a type
 * (numbers numerically, strings lexicographically, booleans false<true).
 * Containers compare by size as a stable, predictable fallback.
 */
export function compareValues(a: JsonValue, b: JsonValue): number {
  const ta = getValueType(a);
  const tb = getValueType(b);
  if (ta !== tb) {
    return TYPE_RANK[ta] - TYPE_RANK[tb];
  }
  switch (ta) {
    case 'number':
      return (a as number) - (b as number);
    case 'string':
      return (a as string) < (b as string) ? -1 : (a as string) > (b as string) ? 1 : 0;
    case 'boolean':
      return Number(a) - Number(b);
    case 'array':
      return (a as JsonArray).length - (b as JsonArray).length;
    case 'object':
      return Object.keys(a as JsonObject).length - Object.keys(b as JsonObject).length;
    default:
      return 0;
  }
}

/**
 * Return a sorted copy of `value`. Objects sort their members (by key or
 * value); arrays sort their elements (optionally by a property). Pure — the
 * input is never mutated.
 */
export function sortJson(value: JsonValue, options: SortOptions = {}): JsonValue {
  const direction = options.direction ?? 'asc';
  const factor = direction === 'desc' ? -1 : 1;
  const by = options.by ?? 'key';
  const recursive = options.recursive ?? false;
  const property = options.property ?? null;

  const sortRec = (node: JsonValue): JsonValue => {
    if (isJsonObject(node)) {
      const entries = Object.entries(node).map(
        ([k, v]) => [k, recursive ? sortRec(v) : v] as const,
      );
      entries.sort((x, y) =>
        by === 'value' ? factor * compareValues(x[1], y[1]) : factor * compareKeys(x[0], y[0]),
      );
      const out: JsonObject = {};
      for (const [k, v] of entries) {
        out[k] = v;
      }
      return out;
    }
    if (isJsonArray(node)) {
      const items = node.map((v) => (recursive ? sortRec(v) : v));
      items.sort(
        (x, y) => factor * compareValues(pickSortKey(x, property), pickSortKey(y, property)),
      );
      return items;
    }
    return node;
  };

  return sortRec(value);
}

function pickSortKey(value: JsonValue, property: string | null): JsonValue {
  if (property && isJsonObject(value) && Object.prototype.hasOwnProperty.call(value, property)) {
    return value[property];
  }
  return value;
}

function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

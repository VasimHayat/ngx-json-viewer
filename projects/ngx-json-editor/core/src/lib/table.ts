import { JsonArray, JsonValue } from './types';
import { isJsonArray, isJsonObject } from './value-type';

/**
 * Column model for table mode. The columns are the union of keys across all
 * object items, in first-seen order. Primitive or array items are shown under a
 * synthetic single column.
 */
export interface TableModel {
  /** Object keys (union) or `['value']` when items aren't objects. */
  readonly columns: readonly string[];
  /** Number of rows (array length). */
  readonly rowCount: number;
  /** True when every (non-null) item is an object — the ideal tabular shape. */
  readonly objectRows: boolean;
}

/** Is `value` an array suitable for table mode (a non-empty array)? */
export function isTabular(value: JsonValue): value is JsonArray {
  return isJsonArray(value) && value.length > 0;
}

/** Compute the column model for an array document. */
export function tableModel(value: JsonValue): TableModel {
  if (!isJsonArray(value)) {
    return { columns: [], rowCount: 0, objectRows: false };
  }
  const seen = new Set<string>();
  const columns: string[] = [];
  let objectRows = value.length > 0;
  for (const item of value) {
    if (isJsonObject(item)) {
      for (const key of Object.keys(item)) {
        if (!seen.has(key)) {
          seen.add(key);
          columns.push(key);
        }
      }
    } else {
      objectRows = false;
    }
  }
  return {
    columns: objectRows ? columns : ['value'],
    rowCount: value.length,
    objectRows,
  };
}

import {
  JsonPath,
  JsonValue,
  JsonValueType,
  getValueType,
  isContainer,
  pathToPointer,
} from '@vasimhayat007/ngx-json-editor/core';

/**
 * A single visible row in the flattened tree projection. The tree virtualizes
 * over an array of these; collapsed subtrees are never traversed, so a fully
 * collapsed 25 MB document flattens to a handful of rows.
 */
export interface TreeRow {
  readonly path: JsonPath;
  readonly pointer: string;
  /** Object key or array index; `null` for the document root. */
  readonly key: string | number | null;
  readonly value: JsonValue;
  readonly type: JsonValueType;
  readonly depth: number;
  readonly expandable: boolean;
  readonly expanded: boolean;
  /** Number of direct children (object properties or array items). */
  readonly childCount: number;
}

/** Options controlling flattening. */
export interface FlattenOptions {
  /** Cap children rendered per container before a "show more" row (paging). */
  readonly pageSize?: number;
}

/**
 * Flatten a JSON document into the list of currently-visible tree rows, given
 * the set of expanded pointers. Pure and allocation-light per visible node.
 */
export function flattenTree(
  root: JsonValue,
  expanded: ReadonlySet<string>,
  options: FlattenOptions = {},
): TreeRow[] {
  const rows: TreeRow[] = [];
  const pageSize = options.pageSize ?? Infinity;
  visit(root, [], null, 0, rows, expanded, pageSize);
  return rows;
}

function visit(
  value: JsonValue,
  path: JsonPath,
  key: string | number | null,
  depth: number,
  rows: TreeRow[],
  expanded: ReadonlySet<string>,
  pageSize: number,
): void {
  const pointer = pathToPointer(path);
  const type = getValueType(value);
  const container = isContainer(value);
  const entries = container ? childEntries(value) : [];
  // The root is always expanded; deeper containers expand only when their
  // pointer is in the expanded set.
  const isExpanded = container && (depth === 0 || expanded.has(pointer));

  rows.push({
    path,
    pointer,
    key,
    value,
    type,
    depth,
    expandable: container && entries.length > 0,
    expanded: isExpanded,
    childCount: entries.length,
  });

  if (container && isExpanded) {
    const limit = Math.min(entries.length, pageSize);
    for (let i = 0; i < limit; i++) {
      const [childKey, childValue] = entries[i];
      visit(childValue, [...path, childKey], childKey, depth + 1, rows, expanded, pageSize);
    }
  }
}

/** Direct children as [key, value] pairs (array index or object key). */
function childEntries(value: JsonValue): [string | number, JsonValue][] {
  if (Array.isArray(value)) {
    return value.map((v, i) => [i, v]);
  }
  return Object.entries(value as Record<string, JsonValue>);
}

/**
 * Build the set of pointers for every expandable container, used by
 * "expand all". The root is always expanded (it is not stored in the set).
 */
export function allContainerPointers(root: JsonValue): Set<string> {
  const out = new Set<string>();
  const walk = (value: JsonValue, path: JsonPath): void => {
    if (!isContainer(value)) {
      return;
    }
    if (path.length > 0) {
      out.add(pathToPointer(path));
    }
    for (const [k, v] of childEntries(value)) {
      walk(v, [...path, k]);
    }
  };
  walk(root, []);
  return out;
}

/** A short summary shown next to a collapsed container (e.g. "{3}" / "[5]"). */
export function containerSummary(row: TreeRow): string {
  if (row.type === 'array') {
    return `[${row.childCount}]`;
  }
  if (row.type === 'object') {
    return `{${row.childCount}}`;
  }
  return '';
}

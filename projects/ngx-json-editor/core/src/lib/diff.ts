import { JsonPatchOperation } from './patch-types';
import { JsonPath, JsonValue } from './types';
import { deepEqual } from './patch';
import { isJsonArray, isJsonObject } from './value-type';
import { pathToPointer } from './json-pointer';

/** Per-node comparison status for the side-by-side compare view. */
export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

/**
 * A node in the structural diff tree (NOT a line diff). `left` is the value in
 * document A, `right` the value in document B. `changed` containers carry
 * `children` describing exactly which members differ.
 */
export interface DiffNode {
  readonly path: JsonPath;
  readonly key: string | number | null;
  readonly status: DiffStatus;
  readonly left?: JsonValue;
  readonly right?: JsonValue;
  readonly children?: readonly DiffNode[];
}

/** Aggregate counts for a diff (shown in the compare dialog header). */
export interface DiffSummary {
  readonly added: number;
  readonly removed: number;
  readonly changed: number;
}

/**
 * Compute a structural diff tree between two documents. Containers recurse;
 * scalars compare by value. Arrays are compared positionally (index-based).
 */
export function diffStructural(left: JsonValue, right: JsonValue): DiffNode {
  return diffNode([], null, left, right, true, true);
}

function diffNode(
  path: JsonPath,
  key: string | number | null,
  left: JsonValue | undefined,
  right: JsonValue | undefined,
  hasLeft: boolean,
  hasRight: boolean,
): DiffNode {
  if (!hasLeft) {
    return { path, key, status: 'added', right };
  }
  if (!hasRight) {
    return { path, key, status: 'removed', left };
  }
  const l = left as JsonValue;
  const r = right as JsonValue;

  if (isJsonObject(l) && isJsonObject(r)) {
    const children: DiffNode[] = [];
    let changed = false;
    const keys = unionKeys(Object.keys(l), Object.keys(r));
    for (const k of keys) {
      const child = diffNode(
        [...path, k],
        k,
        l[k],
        r[k],
        Object.prototype.hasOwnProperty.call(l, k),
        Object.prototype.hasOwnProperty.call(r, k),
      );
      if (child.status !== 'unchanged') {
        changed = true;
      }
      children.push(child);
    }
    return { path, key, status: changed ? 'changed' : 'unchanged', left: l, right: r, children };
  }

  if (isJsonArray(l) && isJsonArray(r)) {
    const children: DiffNode[] = [];
    let changed = false;
    const max = Math.max(l.length, r.length);
    for (let i = 0; i < max; i++) {
      const child = diffNode([...path, i], i, l[i], r[i], i < l.length, i < r.length);
      if (child.status !== 'unchanged') {
        changed = true;
      }
      children.push(child);
    }
    return { path, key, status: changed ? 'changed' : 'unchanged', left: l, right: r, children };
  }

  // Scalars, or a type change between container/scalar.
  return deepEqual(l, r)
    ? { path, key, status: 'unchanged', left: l, right: r }
    : { path, key, status: 'changed', left: l, right: r };
}

/** Summarize a diff tree into add/remove/change counts (leaf-level). */
export function summarizeDiff(node: DiffNode): DiffSummary {
  let added = 0;
  let removed = 0;
  let changed = 0;
  const visit = (n: DiffNode): void => {
    if (n.children && n.children.length > 0) {
      n.children.forEach(visit);
      return;
    }
    if (n.status === 'added') added++;
    else if (n.status === 'removed') removed++;
    else if (n.status === 'changed') changed++;
  };
  visit(node);
  return { added, removed, changed };
}

/**
 * Generate a minimal RFC 6902 patch transforming `left` into `right`. Arrays
 * are diffed positionally; trailing removals are emitted high-index-first so
 * indices stay valid as the patch applies.
 */
export function diffToPatch(left: JsonValue, right: JsonValue): JsonPatchOperation[] {
  const ops: JsonPatchOperation[] = [];
  buildPatch([], left, right, ops);
  return ops;
}

function buildPatch(
  path: JsonPath,
  left: JsonValue,
  right: JsonValue,
  ops: JsonPatchOperation[],
): void {
  if (deepEqual(left, right)) {
    return;
  }
  if (isJsonObject(left) && isJsonObject(right)) {
    for (const k of Object.keys(left)) {
      if (!Object.prototype.hasOwnProperty.call(right, k)) {
        ops.push({ op: 'remove', path: pathToPointer([...path, k]) });
      } else {
        buildPatch([...path, k], left[k], right[k], ops);
      }
    }
    for (const k of Object.keys(right)) {
      if (!Object.prototype.hasOwnProperty.call(left, k)) {
        ops.push({ op: 'add', path: pathToPointer([...path, k]), value: right[k] });
      }
    }
    return;
  }
  if (isJsonArray(left) && isJsonArray(right)) {
    const common = Math.min(left.length, right.length);
    for (let i = 0; i < common; i++) {
      buildPatch([...path, i], left[i], right[i], ops);
    }
    if (right.length > left.length) {
      for (let i = left.length; i < right.length; i++) {
        ops.push({ op: 'add', path: pathToPointer([...path, i]), value: right[i] });
      }
    } else if (left.length > right.length) {
      // Remove extras from the end first to keep indices stable.
      for (let i = left.length - 1; i >= right.length; i--) {
        ops.push({ op: 'remove', path: pathToPointer([...path, i]) });
      }
    }
    return;
  }
  // Type change or scalar change.
  ops.push({ op: 'replace', path: pathToPointer(path), value: right });
}

function unionKeys(a: string[], b: string[]): string[] {
  const seen = new Set<string>(a);
  const out = [...a];
  for (const k of b) {
    if (!seen.has(k)) {
      out.push(k);
      seen.add(k);
    }
  }
  return out;
}

import { JsonPatch, JsonPatchOperation, PatchResult } from './patch-types';
import { JsonValue, Result, err, ok } from './types';
import { getAtPath, pathToPointer, pointerToPath } from './json-pointer';
import { isContainer } from './value-type';

/** Deep clone a JSON value (structuredClone where available; JSON fallback). */
export function cloneJson<T extends JsonValue>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

interface ParentRef {
  readonly container: Record<string, JsonValue> | JsonValue[];
  /** Object key, or array index (number). `-1` denotes array append. */
  readonly key: string | number;
}

/**
 * Apply an RFC 6902 patch to a document, returning the new document **and** the
 * inverse patch that exactly undoes it. Pure and immutable — the input is not
 * mutated. Errors (bad path, failed `test`) are returned, never thrown.
 */
export function applyPatch(doc: JsonValue, patch: JsonPatch): Result<PatchResult, Error> {
  let root = cloneJson(doc);
  const inverse: JsonPatchOperation[] = [];
  for (const op of patch) {
    const res = applyOperation(root, op);
    if (!res.ok) {
      return err(res.error);
    }
    root = res.value.root;
    // Prepend each op's inverse so the whole inverse runs in reverse order.
    inverse.unshift(...res.value.inverse);
  }
  return ok({ doc: root, applied: patch, inverse });
}

/** Apply a single operation, returning the (possibly new) root and inverse ops. */
function applyOperation(
  root: JsonValue,
  op: JsonPatchOperation,
): Result<{ root: JsonValue; inverse: JsonPatchOperation[] }, Error> {
  switch (op.op) {
    case 'add':
      return doAdd(root, op.path, op.value as JsonValue);
    case 'remove':
      return doRemove(root, op.path);
    case 'replace':
      return doReplace(root, op.path, op.value as JsonValue);
    case 'test':
      return doTest(root, op.path, op.value as JsonValue);
    case 'move':
      return doMove(root, op.from ?? '', op.path);
    case 'copy':
      return doCopy(root, op.from ?? '', op.path);
    default:
      return err(new Error(`Unsupported patch op "${(op as JsonPatchOperation).op}"`));
  }
}

function doAdd(
  root: JsonValue,
  pointer: string,
  value: JsonValue,
): Result<{ root: JsonValue; inverse: JsonPatchOperation[] }, Error> {
  const path = pointerToPath(pointer);
  if (path.length === 0) {
    return ok({
      root: value,
      inverse: [{ op: 'replace', path: '', value: cloneJson(root) }],
    });
  }
  const parent = resolveParent(root, path);
  if (!parent.ok) {
    return err(parent.error);
  }
  const { container, key } = parent.value;
  if (Array.isArray(container)) {
    const idx = key === -1 ? container.length : (key as number);
    if (idx < 0 || idx > container.length) {
      return err(new Error(`add: array index out of bounds at ${pointer}`));
    }
    container.splice(idx, 0, value);
    return ok({ root, inverse: [{ op: 'remove', path: pathWithIndex(path, idx) }] });
  }
  const k = String(key);
  const existed = Object.prototype.hasOwnProperty.call(container, k);
  const old = container[k];
  container[k] = value;
  return ok({
    root,
    inverse: existed
      ? [{ op: 'replace', path: pointer, value: cloneJson(old) }]
      : [{ op: 'remove', path: pointer }],
  });
}

function doRemove(
  root: JsonValue,
  pointer: string,
): Result<{ root: JsonValue; inverse: JsonPatchOperation[] }, Error> {
  const path = pointerToPath(pointer);
  if (path.length === 0) {
    return err(new Error('remove: cannot remove document root'));
  }
  const parent = resolveParent(root, path);
  if (!parent.ok) {
    return err(parent.error);
  }
  const { container, key } = parent.value;
  if (Array.isArray(container)) {
    const idx = key as number;
    if (idx < 0 || idx >= container.length) {
      return err(new Error(`remove: array index out of bounds at ${pointer}`));
    }
    const [old] = container.splice(idx, 1);
    return ok({ root, inverse: [{ op: 'add', path: pointer, value: cloneJson(old) }] });
  }
  const k = String(key);
  if (!Object.prototype.hasOwnProperty.call(container, k)) {
    return err(new Error(`remove: path does not exist ${pointer}`));
  }
  const old = container[k];
  delete container[k];
  return ok({ root, inverse: [{ op: 'add', path: pointer, value: cloneJson(old) }] });
}

function doReplace(
  root: JsonValue,
  pointer: string,
  value: JsonValue,
): Result<{ root: JsonValue; inverse: JsonPatchOperation[] }, Error> {
  const path = pointerToPath(pointer);
  if (path.length === 0) {
    return ok({
      root: value,
      inverse: [{ op: 'replace', path: '', value: cloneJson(root) }],
    });
  }
  const parent = resolveParent(root, path);
  if (!parent.ok) {
    return err(parent.error);
  }
  const { container, key } = parent.value;
  if (Array.isArray(container)) {
    const idx = key as number;
    if (idx < 0 || idx >= container.length) {
      return err(new Error(`replace: array index out of bounds at ${pointer}`));
    }
    const old = container[idx];
    container[idx] = value;
    return ok({ root, inverse: [{ op: 'replace', path: pointer, value: cloneJson(old) }] });
  }
  const k = String(key);
  if (!Object.prototype.hasOwnProperty.call(container, k)) {
    return err(new Error(`replace: path does not exist ${pointer}`));
  }
  const old = container[k];
  container[k] = value;
  return ok({ root, inverse: [{ op: 'replace', path: pointer, value: cloneJson(old) }] });
}

function doTest(
  root: JsonValue,
  pointer: string,
  value: JsonValue,
): Result<{ root: JsonValue; inverse: JsonPatchOperation[] }, Error> {
  const actual = getAtPath(root, pointerToPath(pointer));
  if (!deepEqual(actual ?? null, value)) {
    return err(new Error(`test failed at ${pointer}`));
  }
  return ok({ root, inverse: [] });
}

function doMove(
  root: JsonValue,
  fromPointer: string,
  toPointer: string,
): Result<{ root: JsonValue; inverse: JsonPatchOperation[] }, Error> {
  const moved = getAtPath(root, pointerToPath(fromPointer));
  if (moved === undefined) {
    return err(new Error(`move: source path does not exist ${fromPointer}`));
  }
  const value = cloneJson(moved);
  const removed = doRemove(root, fromPointer);
  if (!removed.ok) {
    return err(removed.error);
  }
  const added = doAdd(removed.value.root, toPointer, value);
  if (!added.ok) {
    return err(added.error);
  }
  // Inverse: move back, restoring anything the destination add overwrote.
  return ok({
    root: added.value.root,
    inverse: [...added.value.inverse, { op: 'add', path: fromPointer, value: cloneJson(value) }],
  });
}

function doCopy(
  root: JsonValue,
  fromPointer: string,
  toPointer: string,
): Result<{ root: JsonValue; inverse: JsonPatchOperation[] }, Error> {
  const source = getAtPath(root, pointerToPath(fromPointer));
  if (source === undefined) {
    return err(new Error(`copy: source path does not exist ${fromPointer}`));
  }
  return doAdd(root, toPointer, cloneJson(source));
}

/** Navigate to the parent container of the last path segment. */
function resolveParent(
  root: JsonValue,
  path: readonly (string | number)[],
): Result<ParentRef, Error> {
  let node: JsonValue = root;
  for (let i = 0; i < path.length - 1; i++) {
    if (!isContainer(node)) {
      return err(new Error(`path traverses a non-container at segment "${path[i]}"`));
    }
    const seg = path[i];
    node = Array.isArray(node)
      ? node[Number(seg)]
      : (node as Record<string, JsonValue>)[String(seg)];
    if (node === undefined) {
      return err(new Error(`path does not exist at segment "${seg}"`));
    }
  }
  if (!isContainer(node)) {
    return err(new Error('path parent is not a container'));
  }
  const last = path[path.length - 1];
  if (Array.isArray(node)) {
    const key = last === '-' ? -1 : Number(last);
    if (key !== -1 && !Number.isInteger(key)) {
      return err(new Error(`array index must be an integer, got "${last}"`));
    }
    return ok({ container: node, key });
  }
  return ok({ container: node as Record<string, JsonValue>, key: String(last) });
}

function pathWithIndex(path: readonly (string | number)[], idx: number): string {
  return pathToPointer([...path.slice(0, -1), idx]);
}

/** Structural equality used by the `test` op. */
export function deepEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) {
      return false;
    }
    return ak.every(
      (k) =>
        Object.prototype.hasOwnProperty.call(b, k) &&
        deepEqual((a as Record<string, JsonValue>)[k], (b as Record<string, JsonValue>)[k]),
    );
  }
  return false;
}

/** Invert a patch given the document it was (or will be) applied to. */
export function invertPatch(doc: JsonValue, patch: JsonPatch): Result<JsonPatch, Error> {
  const res = applyPatch(doc, patch);
  return res.ok ? ok(res.value.inverse) : err(res.error);
}

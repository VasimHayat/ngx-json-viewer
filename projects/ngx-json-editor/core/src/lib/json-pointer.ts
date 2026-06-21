import { isContainer } from './value-type';
import { JsonPath, JsonValue } from './types';

/**
 * RFC 6901 JSON Pointer helpers plus immutable path-based access.
 *
 * A {@link JsonPath} is the in-memory representation (array of segments); a
 * pointer is its serialized `/a/b/0` form used by JSON Patch and Ajv error
 * `instancePath`s.
 */

/** Escape a single reference token per RFC 6901 (`~` → `~0`, `/` → `~1`). */
export function escapePointerToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** Unescape a single reference token per RFC 6901. */
export function unescapePointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Serialize a {@link JsonPath} to an RFC 6901 pointer string. */
export function pathToPointer(path: JsonPath): string {
  if (path.length === 0) {
    return '';
  }
  return '/' + path.map((segment) => escapePointerToken(String(segment))).join('/');
}

/**
 * Parse an RFC 6901 pointer into a {@link JsonPath}. Numeric-looking tokens are
 * left as strings here; {@link normalizePathAgainst} resolves them to indices
 * when a document is available.
 */
export function pointerToPath(pointer: string): JsonPath {
  if (pointer === '') {
    return [];
  }
  if (pointer[0] !== '/') {
    throw new Error(`Invalid JSON Pointer (must start with "/"): ${pointer}`);
  }
  return pointer
    .slice(1)
    .split('/')
    .map((token) => unescapePointerToken(token));
}

/** Render a path for display, e.g. `$.users[0].name`. The root renders as `$`. */
export function pathToDisplay(path: JsonPath): string {
  let out = '$';
  for (const segment of path) {
    if (typeof segment === 'number') {
      out += `[${segment}]`;
    } else if (/^[A-Za-z_$][\w$]*$/.test(segment)) {
      out += `.${segment}`;
    } else {
      out += `[${JSON.stringify(segment)}]`;
    }
  }
  return out;
}

/** Structural equality for two paths. */
export function pathsEqual(a: JsonPath, b: JsonPath): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (String(a[i]) !== String(b[i])) {
      return false;
    }
  }
  return true;
}

/** Is `child` equal to or nested under `ancestor`? */
export function isPathPrefix(ancestor: JsonPath, child: JsonPath): boolean {
  if (ancestor.length > child.length) {
    return false;
  }
  for (let i = 0; i < ancestor.length; i++) {
    if (String(ancestor[i]) !== String(child[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Read the value at `path`. Returns `undefined` if any segment is missing.
 * Never throws for a missing path — only for a genuinely malformed traversal.
 */
export function getAtPath(doc: JsonValue, path: JsonPath): JsonValue | undefined {
  let current: JsonValue | undefined = doc;
  for (const segment of path) {
    if (current === undefined || !isContainer(current)) {
      return undefined;
    }
    if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else {
      current = (current as Record<string, JsonValue>)[String(segment)];
    }
  }
  return current;
}

/** Does a value exist at `path`? */
export function hasAtPath(doc: JsonValue, path: JsonPath): boolean {
  return getAtPath(doc, path) !== undefined;
}

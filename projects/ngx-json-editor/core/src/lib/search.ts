import { JsonPath, JsonValue } from './types';
import { isContainer } from './value-type';

/** Where a search match occurred. */
export type SearchField = 'key' | 'value';

/** A single search hit, addressed by path. */
export interface SearchMatch {
  readonly path: JsonPath;
  readonly field: SearchField;
}

/** Options for {@link searchJson}. */
export interface SearchOptions {
  readonly caseSensitive?: boolean;
  /** Search object keys (default true). */
  readonly keys?: boolean;
  /** Search scalar values (default true). */
  readonly values?: boolean;
}

/**
 * Find every node whose key or scalar value contains `query`, in document
 * order. Pure and framework-free so it can run on a worker for large documents.
 * A key match and a value match on the same node yield two hits.
 */
export function searchJson(
  root: JsonValue,
  query: string,
  options: SearchOptions = {},
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  if (query === '') {
    return matches;
  }
  const caseSensitive = options.caseSensitive ?? false;
  const searchKeys = options.keys ?? true;
  const searchValues = options.values ?? true;
  const needle = caseSensitive ? query : query.toLowerCase();

  const contains = (haystack: string): boolean =>
    (caseSensitive ? haystack : haystack.toLowerCase()).includes(needle);

  const visit = (value: JsonValue, path: JsonPath, key: string | number | null): void => {
    if (searchKeys && typeof key === 'string' && contains(key)) {
      matches.push({ path, field: 'key' });
    }
    if (isContainer(value)) {
      if (Array.isArray(value)) {
        value.forEach((child, i) => visit(child, [...path, i], i));
      } else {
        for (const [k, child] of Object.entries(value)) {
          visit(child, [...path, k], k);
        }
      }
      return;
    }
    if (searchValues && contains(scalarToString(value))) {
      matches.push({ path, field: 'value' });
    }
  };

  visit(root, [], null);
  return matches;
}

function scalarToString(value: JsonValue): string {
  return value === null ? 'null' : String(value);
}

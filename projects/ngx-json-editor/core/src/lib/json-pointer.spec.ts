import { JsonValue } from './types';
import {
  escapePointerToken,
  getAtPath,
  hasAtPath,
  isPathPrefix,
  pathToDisplay,
  pathToPointer,
  pathsEqual,
  pointerToPath,
  unescapePointerToken,
} from './json-pointer';

describe('json-pointer', () => {
  it('round-trips RFC 6901 escaping', () => {
    expect(escapePointerToken('a/b~c')).toBe('a~1b~0c');
    expect(unescapePointerToken('a~1b~0c')).toBe('a/b~c');
  });

  it('serializes paths to pointers', () => {
    expect(pathToPointer([])).toBe('');
    expect(pathToPointer(['users', 0, 'name'])).toBe('/users/0/name');
    expect(pathToPointer(['a/b'])).toBe('/a~1b');
  });

  it('parses pointers to paths', () => {
    expect(pointerToPath('')).toEqual([]);
    expect(pointerToPath('/users/0/name')).toEqual(['users', '0', 'name']);
    expect(() => pointerToPath('users')).toThrowError(/must start with/);
  });

  it('renders human-friendly display paths', () => {
    expect(pathToDisplay([])).toBe('$');
    expect(pathToDisplay(['users', 0, 'name'])).toBe('$.users[0].name');
    expect(pathToDisplay(['weird key'])).toBe('$["weird key"]');
  });

  it('compares and prefixes paths', () => {
    expect(pathsEqual(['a', 1], ['a', 1])).toBeTrue();
    expect(pathsEqual(['a', 1], ['a', 2])).toBeFalse();
    expect(isPathPrefix(['a'], ['a', 'b'])).toBeTrue();
    expect(isPathPrefix(['a', 'b'], ['a'])).toBeFalse();
  });

  it('reads values at a path', () => {
    // `as unknown` on the actual sidesteps a TS2589 "excessively deep" error:
    // jasmine's recursive Expected<T> matcher type cannot be instantiated over
    // the (intentionally) recursive JsonValue union.
    const doc: JsonValue = { users: [{ name: 'Ada' }], meta: null };
    expect(getAtPath(doc, ['users', 0, 'name']) as unknown).toBe('Ada');
    expect(getAtPath(doc, ['users', 5])).toBeUndefined();
    expect(getAtPath(doc, ['meta'])).toBeNull();
    expect(hasAtPath(doc, ['meta'])).toBeTrue(); // present, even though its value is null
    expect(hasAtPath(doc, ['missing'])).toBeFalse();
    expect(hasAtPath(doc, ['users', 0])).toBeTrue();
  });
});

import { compareValues, sortJson } from './sort';

describe('compareValues', () => {
  it('orders by type then within type', () => {
    expect(compareValues(1, 2)).toBeLessThan(0);
    expect(compareValues('b', 'a')).toBeGreaterThan(0);
    expect(compareValues(false, true)).toBeLessThan(0);
    expect(compareValues(null, 0)).toBeLessThan(0); // null ranks before number
    expect(compareValues(5, 'a')).toBeLessThan(0); // number ranks before string
  });
});

describe('sortJson', () => {
  it('sorts object keys ascending and descending', () => {
    expect(Object.keys(sortJson({ c: 1, a: 2, b: 3 }) as object)).toEqual(['a', 'b', 'c']);
    expect(Object.keys(sortJson({ c: 1, a: 2, b: 3 }, { direction: 'desc' }) as object)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('sorts object members by value', () => {
    const sorted = sortJson({ a: 3, b: 1, c: 2 }, { by: 'value' }) as Record<string, number>;
    expect(Object.values(sorted)).toEqual([1, 2, 3]);
  });

  it('sorts array values', () => {
    expect(sortJson([3, 1, 2]) as unknown).toEqual([1, 2, 3]);
    expect(sortJson([3, 1, 2], { direction: 'desc' }) as unknown).toEqual([3, 2, 1]);
  });

  it('sorts arrays of objects by a property', () => {
    const input = [
      { name: 'c', n: 3 },
      { name: 'a', n: 1 },
      { name: 'b', n: 2 },
    ];
    const sorted = sortJson(input, { property: 'n' }) as { n: number }[];
    expect(sorted.map((x) => x.n)).toEqual([1, 2, 3]);
  });

  it('sorts recursively when requested', () => {
    const input = { z: { c: 1, a: 2 }, a: [3, 1, 2] };
    const sorted = sortJson(input, { recursive: true }) as Record<string, unknown>;
    expect(Object.keys(sorted)).toEqual(['a', 'z']);
    expect(sorted['a']).toEqual([1, 2, 3]);
    expect(Object.keys(sorted['z'] as object)).toEqual(['a', 'c']);
  });

  it('does not mutate the input', () => {
    const input = { b: 1, a: 2 };
    sortJson(input);
    expect(Object.keys(input)).toEqual(['b', 'a']);
  });
});

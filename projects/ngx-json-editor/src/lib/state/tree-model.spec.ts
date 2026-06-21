import { allContainerPointers, containerSummary, flattenTree } from './tree-model';

describe('flattenTree', () => {
  it('shows the root expanded and deeper containers collapsed by default', () => {
    const rows = flattenTree({ a: 1, b: { c: 2 } }, new Set());
    expect(rows.map((r) => r.pointer)).toEqual(['', '/a', '/b']);
    const b = rows.find((r) => r.pointer === '/b');
    expect(b?.expandable).toBeTrue();
    expect(b?.expanded).toBeFalse();
    expect(b?.childCount).toBe(1);
  });

  it('descends into expanded containers', () => {
    const rows = flattenTree({ a: 1, b: { c: 2 } }, new Set(['/b']));
    expect(rows.map((r) => r.pointer)).toEqual(['', '/a', '/b', '/b/c']);
    expect(rows.find((r) => r.pointer === '/b/c')?.depth).toBe(2);
  });

  it('flattens arrays with numeric keys', () => {
    const rows = flattenTree([1, [2]], new Set());
    expect(rows.map((r) => r.key)).toEqual([null, 0, 1]);
    expect(rows[2].type).toBe('array');
    expect(rows[2].expanded).toBeFalse();
  });

  it('does not traverse collapsed subtrees (lazy)', () => {
    const deep = { a: { b: { c: { d: 1 } } } };
    expect(flattenTree(deep, new Set()).length).toBe(2); // root + a (collapsed)
  });

  it('honors a page-size cap on children', () => {
    const big = { arr: [1, 2, 3, 4, 5] };
    const rows = flattenTree(big, new Set(['/arr']), { pageSize: 3 });
    // root + arr + first 3 items
    expect(rows.filter((r) => r.path.length === 2).length).toBe(3);
  });
});

describe('allContainerPointers', () => {
  it('collects every nested container pointer (excluding root)', () => {
    const ptrs = allContainerPointers({ a: { b: 1 }, c: [{ d: 2 }] });
    expect(ptrs.has('/a')).toBeTrue();
    expect(ptrs.has('/c')).toBeTrue();
    expect(ptrs.has('/c/0')).toBeTrue();
    expect(ptrs.has('')).toBeFalse();
  });
});

describe('containerSummary', () => {
  it('summarizes object and array sizes', () => {
    const rows = flattenTree({ o: { a: 1, b: 2 }, a: [1, 2, 3] }, new Set());
    const o = rows.find((r) => r.pointer === '/o');
    const a = rows.find((r) => r.pointer === '/a');
    expect(containerSummary(o!)).toBe('{2}');
    expect(containerSummary(a!)).toBe('[3]');
  });
});

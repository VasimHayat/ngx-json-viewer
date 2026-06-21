import { JsonValue } from '@vasimhayat007/ngx-json-editor/core';
import { diffStructural, diffToPatch, summarizeDiff } from './diff';
import { applyPatch, deepEqual } from './patch';

describe('diffStructural', () => {
  it('marks unchanged documents', () => {
    const d = diffStructural({ a: 1 }, { a: 1 });
    expect(d.status).toBe('unchanged');
  });

  it('detects added, removed, and changed members', () => {
    const d = diffStructural({ a: 1, b: 2 }, { a: 1, c: 3 });
    expect(d.status).toBe('changed');
    const byKey = new Map(d.children?.map((c) => [c.key, c.status]));
    expect(byKey.get('a')).toBe('unchanged');
    expect(byKey.get('b')).toBe('removed');
    expect(byKey.get('c')).toBe('added');
  });

  it('diffs arrays positionally', () => {
    const d = diffStructural([1, 2, 3], [1, 9, 3, 4]);
    expect(d.status).toBe('changed');
    expect(d.children?.[1].status).toBe('changed');
    expect(d.children?.[3].status).toBe('added');
  });

  it('summarizes leaf counts', () => {
    const d = diffStructural({ a: 1, b: 2 }, { a: 9, c: 3 });
    const s = summarizeDiff(d);
    expect(s).toEqual({ added: 1, removed: 1, changed: 1 });
  });
});

describe('diffToPatch', () => {
  const cases: [JsonValue, JsonValue][] = [
    [{ a: 1 }, { a: 2 }],
    [{ a: 1, b: 2 }, { a: 1 }],
    [{ a: 1 }, { a: 1, b: 2 }],
    [
      [1, 2, 3],
      [1, 2],
    ],
    [
      [1, 2],
      [1, 2, 3],
    ],
    [{ a: [1, { b: 2 }] }, { a: [1, { b: 3 }], c: true }],
    [{ a: 1 }, [1, 2]],
  ];

  it('produces a patch that transforms left into right', () => {
    for (const [left, right] of cases) {
      const patch = diffToPatch(left, right);
      const res = applyPatch(left, patch);
      expect(res.ok).withContext(JSON.stringify({ left, right, patch })).toBeTrue();
      if (res.ok) {
        expect(deepEqual(res.value.doc, right))
          .withContext(`patch did not produce right: ${JSON.stringify(patch)}`)
          .toBeTrue();
      }
    }
  });

  it('produces an empty patch for equal documents', () => {
    expect(diffToPatch({ a: 1 }, { a: 1 }) as unknown).toEqual([]);
  });
});

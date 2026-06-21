import { JsonPatch, JsonValue } from 'ngx-json-editor/core';
import { applyPatch, deepEqual, invertPatch } from './patch';

/** Apply a patch and assert success, returning the resulting document. */
function apply(doc: JsonValue, patch: JsonPatch): JsonValue {
  const r = applyPatch(doc, patch);
  expect(r.ok)
    .withContext(r.ok ? '' : r.error.message)
    .toBeTrue();
  return r.ok ? r.value.doc : doc;
}

/** Apply, then apply the generated inverse — should restore the original. */
function roundTrip(doc: JsonValue, patch: JsonPatch): void {
  const forward = applyPatch(doc, patch);
  expect(forward.ok).toBeTrue();
  if (!forward.ok) return;
  const back = applyPatch(forward.value.doc, forward.value.inverse);
  expect(back.ok).toBeTrue();
  if (!back.ok) return;
  expect(deepEqual(back.value.doc, doc)).withContext('inverse did not restore original').toBeTrue();
}

describe('applyPatch', () => {
  it('does not mutate the input document', () => {
    const doc = { a: 1 };
    apply(doc, [{ op: 'replace', path: '/a', value: 2 }]);
    expect(doc).toEqual({ a: 1 });
  });

  it('add: new object member', () => {
    expect(apply({ a: 1 }, [{ op: 'add', path: '/b', value: 2 }]) as unknown).toEqual({
      a: 1,
      b: 2,
    });
    roundTrip({ a: 1 }, [{ op: 'add', path: '/b', value: 2 }]);
  });

  it('add: existing member behaves as replace, inverse restores old value', () => {
    roundTrip({ a: 1 }, [{ op: 'add', path: '/a', value: 9 }]);
  });

  it('add: array insert and append', () => {
    expect(apply([1, 3], [{ op: 'add', path: '/1', value: 2 }]) as unknown).toEqual([1, 2, 3]);
    expect(apply([1, 2], [{ op: 'add', path: '/-', value: 3 }]) as unknown).toEqual([1, 2, 3]);
    roundTrip([1, 3], [{ op: 'add', path: '/1', value: 2 }]);
    roundTrip([1, 2], [{ op: 'add', path: '/-', value: 3 }]);
  });

  it('remove: object and array', () => {
    expect(apply({ a: 1, b: 2 }, [{ op: 'remove', path: '/a' }]) as unknown).toEqual({ b: 2 });
    expect(apply([1, 2, 3], [{ op: 'remove', path: '/1' }]) as unknown).toEqual([1, 3]);
    roundTrip({ a: 1, b: 2 }, [{ op: 'remove', path: '/a' }]);
    roundTrip([1, 2, 3], [{ op: 'remove', path: '/1' }]);
  });

  it('replace: object, array, and root', () => {
    expect(apply({ a: 1 }, [{ op: 'replace', path: '/a', value: 'x' }]) as unknown).toEqual({
      a: 'x',
    });
    expect(apply({ a: 1 }, [{ op: 'replace', path: '', value: [1] }]) as unknown).toEqual([1]);
    roundTrip({ a: 1 }, [{ op: 'replace', path: '/a', value: 'x' }]);
    roundTrip({ a: 1 }, [{ op: 'replace', path: '', value: [1] }]);
  });

  it('move and copy', () => {
    expect(
      apply({ a: { n: 1 }, b: {} }, [{ op: 'move', from: '/a/n', path: '/b/n' }]) as unknown,
    ).toEqual({ a: {}, b: { n: 1 } });
    expect(apply({ a: 1 }, [{ op: 'copy', from: '/a', path: '/b' }]) as unknown).toEqual({
      a: 1,
      b: 1,
    });
    roundTrip({ a: { n: 1 }, b: {} }, [{ op: 'move', from: '/a/n', path: '/b/n' }]);
    roundTrip({ a: 1 }, [{ op: 'copy', from: '/a', path: '/b' }]);
  });

  it('test: passes and fails', () => {
    const passing = applyPatch({ a: 1 }, [{ op: 'test', path: '/a', value: 1 }]);
    expect(passing.ok).toBeTrue();
    const failing = applyPatch({ a: 1 }, [{ op: 'test', path: '/a', value: 2 }]);
    expect(failing.ok).toBeFalse();
  });

  it('returns errors as values for bad paths', () => {
    expect(applyPatch({ a: 1 }, [{ op: 'remove', path: '/missing' }]).ok).toBeFalse();
    expect(applyPatch([], [{ op: 'remove', path: '/5' }]).ok).toBeFalse();
    expect(applyPatch({ a: 1 }, [{ op: 'remove', path: '' }]).ok).toBeFalse();
  });

  it('applies a multi-op patch and inverts the whole sequence', () => {
    const patch: JsonPatch = [
      { op: 'add', path: '/list', value: [] },
      { op: 'add', path: '/list/-', value: 1 },
      { op: 'add', path: '/list/-', value: 2 },
      { op: 'replace', path: '/name', value: 'updated' },
    ];
    const doc = { name: 'original' };
    expect(apply(doc, patch) as unknown).toEqual({ name: 'updated', list: [1, 2] });
    const inv = invertPatch(doc, patch);
    expect(inv.ok).toBeTrue();
    roundTrip(doc, patch);
  });

  it('reports errors for missing move/copy sources and bad indices', () => {
    expect(applyPatch({}, [{ op: 'move', from: '/missing', path: '/x' }]).ok).toBeFalse();
    expect(applyPatch({}, [{ op: 'copy', from: '/missing', path: '/x' }]).ok).toBeFalse();
    expect(applyPatch([1], [{ op: 'add', path: '/9', value: 2 }]).ok).toBeFalse();
    // Traversing through a scalar is an error.
    expect(applyPatch({ a: 1 }, [{ op: 'replace', path: '/a/b', value: 2 }]).ok).toBeFalse();
    // invertPatch surfaces the same failure as a value.
    expect(invertPatch({}, [{ op: 'remove', path: '/nope' }]).ok).toBeFalse();
  });
});

describe('deepEqual', () => {
  it('compares scalars, arrays, and objects structurally', () => {
    expect(deepEqual(1, 1)).toBeTrue();
    expect(deepEqual(null, null)).toBeTrue();
    expect(deepEqual(1, 2)).toBeFalse();
    expect(deepEqual(1, null)).toBeFalse();
    expect(deepEqual([1, 2], [1, 2])).toBeTrue();
    expect(deepEqual([1, 2], [1, 2, 3])).toBeFalse();
    expect(deepEqual([1], { 0: 1 })).toBeFalse(); // array vs object
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBeFalse(); // key count
    expect(deepEqual({ a: 1 }, { a: 2 })).toBeFalse();
    expect(deepEqual({ a: { b: [1] } }, { a: { b: [1] } })).toBeTrue();
    expect(deepEqual({ a: 1 }, { b: 1 })).toBeFalse(); // different keys
  });
});

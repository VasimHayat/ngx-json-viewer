import { ValidationError } from 'ngx-json-editor/core';
import { EditorStore } from './editor-store';

describe('EditorStore', () => {
  let store: EditorStore;

  beforeEach(() => {
    // The store uses only signals/computed (no effects, no inject), so it can be
    // constructed directly without TestBed.
    store = new EditorStore();
  });

  it('starts empty', () => {
    expect(store.isEmpty()).toBeTrue();
    expect(store.json() as unknown).toBeNull();
    expect(store.errors()).toEqual([]);
  });

  it('derives json and text from content', () => {
    store.replaceDocument({ json: { a: 1 } });
    expect(store.json() as unknown).toEqual({ a: 1 });
    expect(store.text()).toContain('"a": 1');
    expect(store.size()).toBeGreaterThan(0);
  });

  it('parses text content and reports parse errors', () => {
    store.setText('{"a":1}');
    expect(store.json() as unknown).toEqual({ a: 1 });
    expect(store.parseError()).toBeNull();

    store.setText('{"a":}');
    expect(store.json()).toBeUndefined();
    expect(store.parseError()).not.toBeNull();
    const errs = store.errors();
    expect(errs.length).toBe(1);
    expect(errs[0].source).toBe('parse');
  });

  it('formats and compacts', () => {
    store.replaceDocument({ json: { a: 1, b: [2, 3] } });
    expect(store.compact()).toBeTrue();
    expect(store.text()).toBe('{"a":1,"b":[2,3]}');
    expect(store.format()).toBeTrue();
    expect(store.text()).toContain('\n');
    expect(store.json() as unknown).toEqual({ a: 1, b: [2, 3] });
  });

  it('repairs malformed JSON and commits the result', () => {
    store.setText("{a:1, b:'two',}");
    const r = store.repair();
    expect(r.ok).toBeTrue();
    expect(r.changed).toBeTrue();
    expect(store.json() as unknown).toEqual({ a: 1, b: 'two' });
  });

  it('applies a JSON patch and records compact history', () => {
    store.replaceDocument({ json: { a: 1 } });
    const errOrNull = store.applyJsonPatch([{ op: 'add', path: '/b', value: 2 }]);
    expect(errOrNull).toBeNull();
    expect(store.json() as unknown).toEqual({ a: 1, b: 2 });
    expect(store.canUndo()).toBeTrue();
  });

  it('rejects a patch on invalid JSON, returning an error value', () => {
    store.setText('{bad');
    const err = store.applyJsonPatch([{ op: 'add', path: '/b', value: 2 }]);
    expect(err).not.toBeNull();
    expect(err?.severity).toBe('error');
  });

  it('supports undo/redo across edits', () => {
    store.replaceDocument({ json: { a: 1 } });
    store.compact();
    store.setText('{"a":1,"c":3}');
    expect(store.json() as unknown).toEqual({ a: 1, c: 3 });

    store.undo();
    expect(store.text()).toBe('{"a":1}');
    store.undo();
    expect(store.json() as unknown).toEqual({ a: 1 }); // back to original json content

    store.redo();
    expect(store.text()).toBe('{"a":1}');
    expect(store.canRedo()).toBeTrue();
  });

  it('replaceDocument resets history', () => {
    store.replaceDocument({ json: { a: 1 } });
    store.compact();
    expect(store.canUndo()).toBeTrue();
    store.replaceDocument({ json: { x: 9 } });
    expect(store.canUndo()).toBeFalse();
    expect(store.canRedo()).toBeFalse();
  });

  it('surfaces schema validation errors', () => {
    store.replaceDocument({ json: { age: 'not-a-number' } });
    store.setSchema({ type: 'object', properties: { age: { type: 'number' } } });
    const errs = store.errors();
    expect(errs.some((e: ValidationError) => e.source === 'schema')).toBeTrue();
  });

  it('runs a custom validator', () => {
    store.replaceDocument({ json: { n: 1 } });
    store.setValidator((value) =>
      typeof value === 'object' && value !== null && !Array.isArray(value) && 'forbidden' in value
        ? [{ path: ['forbidden'], message: 'not allowed', severity: 'error' }]
        : [],
    );
    expect(store.errors()).toEqual([]);
    store.setJson({ forbidden: true });
    expect(store.errors().length).toBe(1);
  });

  it('tracks expansion state by path', () => {
    expect(store.isExpanded(['a'])).toBeFalse();
    store.toggleExpanded(['a']);
    expect(store.isExpanded(['a'])).toBeTrue();
    store.toggleExpanded(['a']);
    expect(store.isExpanded(['a'])).toBeFalse();
  });

  describe('structured tree edits', () => {
    beforeEach(() => store.replaceDocument({ json: { a: 1, b: { c: 2 }, list: [10, 20] } }));

    it('updates a value at a path', () => {
      expect(store.updateValueAt(['b', 'c'], 99)).toBeNull();
      expect(store.json() as unknown).toEqual({ a: 1, b: { c: 99 }, list: [10, 20] });
    });

    it('changes a value type, coercing', () => {
      store.changeTypeAt(['a'], 'string');
      expect(store.json() as unknown).toEqual({ a: '1', b: { c: 2 }, list: [10, 20] });
      store.changeTypeAt(['a'], 'array');
      const j = store.json() as { a: unknown };
      expect(Array.isArray(j.a)).toBeTrue();
    });

    it('renames an object key, preserving order', () => {
      expect(store.renameKeyAt([], 'a', 'alpha')).toBeNull();
      expect(Object.keys(store.json() as object)).toEqual(['alpha', 'b', 'list']);
    });

    it('refuses to rename onto an existing key', () => {
      expect(store.renameKeyAt([], 'a', 'b')).not.toBeNull();
    });

    it('removes a node', () => {
      store.removeAt(['b']);
      expect(store.json() as unknown).toEqual({ a: 1, list: [10, 20] });
      expect(store.removeAt([])).not.toBeNull(); // cannot remove root
    });

    it('appends children to objects and arrays', () => {
      store.appendChild(['list'], 'number');
      expect((store.json() as { list: number[] }).list.length).toBe(3);
      store.appendChild([], 'string', 'extra');
      expect('extra' in (store.json() as object)).toBeTrue();
    });

    it('duplicates array items and object members', () => {
      store.duplicateAt(['list', 0]);
      expect((store.json() as { list: number[] }).list).toEqual([10, 10, 20]);
      store.duplicateAt(['a']);
      expect('a_copy' in (store.json() as object)).toBeTrue();
    });

    it('expands all containers', () => {
      store.expandAllContainers();
      expect(store.isExpanded(['b'])).toBeTrue();
      expect(store.isExpanded(['list'])).toBeTrue();
    });

    it('inserts siblings before and after', () => {
      store.insertSibling(['list', 0], 'after', 'number');
      expect((store.json() as { list: unknown[] }).list.length).toBe(3);
      store.insertSibling(['a'], 'before', 'string');
      expect(Object.keys(store.json() as object)[0]).toBe('newKey');
    });

    it('extracts a subtree as the new root', () => {
      store.extractAt(['b']);
      expect(store.json() as unknown).toEqual({ c: 2 });
    });

    it('sorts a container and the whole document', () => {
      store.replaceDocument({ json: { c: 1, a: 2, b: 3 } });
      store.sortDocument({ by: 'key' });
      expect(Object.keys(store.json() as object)).toEqual(['a', 'b', 'c']);
    });

    it('moves a node (array reorder and reparent)', () => {
      store.replaceDocument({ json: { src: [1, 2, 3], dst: [] } });
      store.moveNode(['src', 0], ['dst'], '-');
      expect(store.json() as unknown).toEqual({ src: [2, 3], dst: [1] });
    });

    it('refuses to move a node into its own subtree', () => {
      store.replaceDocument({ json: { a: { b: 1 } } });
      expect(store.moveNode(['a'], ['a', 'b'], 'x')).not.toBeNull();
    });
  });

  describe('multi-selection', () => {
    beforeEach(() => store.replaceDocument({ json: { a: 1, list: [10, 11, 12, 13] } }));

    it('single, toggle, and range selection', () => {
      store.setSelection(['a']);
      expect(store.isSelected(['a'])).toBeTrue();
      store.toggleSelection(['list']);
      expect(store.isSelected(['a'])).toBeTrue();
      expect(store.isSelected(['list'])).toBeTrue();
      store.toggleSelection(['a']);
      expect(store.isSelected(['a'])).toBeFalse();
    });

    it('bulk-removes selected array items in an index-safe order', () => {
      // Select indices 1 and 3 (11 and 13); removing index 3 first keeps 1 valid.
      store.selectPointers(['/list/1', '/list/3']);
      store.removeSelected();
      expect((store.json() as { list: number[] }).list).toEqual([10, 12]);
      expect(store.isSelected(['list', 1])).toBeFalse();
    });
  });
});

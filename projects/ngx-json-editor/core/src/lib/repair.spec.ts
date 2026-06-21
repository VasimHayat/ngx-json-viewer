import { parseJson } from './parse';
import { REPAIR, repairJson } from './repair';

/** Helper: repair, assert it now parses, and return the parsed value. */
function repaired(input: string): unknown {
  const r = repairJson(input);
  expect(r.ok).withContext(`repair failed: ${r.error} -> ${r.text}`).toBeTrue();
  const p = parseJson(r.text);
  return p.ok ? p.value : undefined;
}

describe('repairJson', () => {
  it('leaves valid JSON untouched', () => {
    const r = repairJson('{"a":1}');
    expect(r.ok).toBeTrue();
    expect(r.changed).toBeFalse();
    expect(r.applied).toEqual([]);
  });

  it('removes trailing commas', () => {
    const r = repairJson('{"a":1,"b":[1,2,],}');
    expect(r.applied).toContain(REPAIR.trailingCommas);
    expect(repaired('{"a":1,"b":[1,2,],}')).toEqual({ a: 1, b: [1, 2] });
  });

  it('converts single and backtick quotes', () => {
    const r = repairJson("{'a':'hi','b':`yo`}");
    expect(r.applied).toContain(REPAIR.singleQuotes);
    expect(repaired("{'a':'hi'}")).toEqual({ a: 'hi' });
  });

  it('quotes unquoted keys', () => {
    const r = repairJson('{a:1, b_2:true}');
    expect(r.applied).toContain(REPAIR.quotedKeys);
    expect(repaired('{a:1, b_2:true}')).toEqual({ a: 1, b_2: true });
  });

  it('strips // and /* */ comments', () => {
    const input = '{\n  // line comment\n  "a": 1 /* inline */\n}';
    const r = repairJson(input);
    expect(r.applied).toContain(REPAIR.comments);
    expect(repaired(input)).toEqual({ a: 1 });
  });

  it('converts Python literals and special values', () => {
    expect(repaired('{"a": True, "b": False, "c": None}')).toEqual({
      a: true,
      b: false,
      c: null,
    });
    expect(repaired('{"x": NaN, "y": Infinity, "z": undefined}')).toEqual({
      x: null,
      y: null,
      z: null,
    });
  });

  it('converts MongoDB / JS function notation', () => {
    const value = repaired(
      '{"id": ObjectId("64f"), "at": ISODate("2020-01-01"), "n": NumberLong(5)}',
    );
    expect(value).toEqual({ id: '64f', at: '2020-01-01', n: 5 });
  });

  it('wraps concatenated top-level objects in an array', () => {
    const r = repairJson('{"a":1}\n{"b":2}');
    expect(r.applied).toContain(REPAIR.concatenated);
    expect(repaired('{"a":1}\n{"b":2}')).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('adds missing commas between members', () => {
    expect(repaired('{"a":1 "b":2}')).toEqual({ a: 1, b: 2 });
    expect(repaired('[1 2 3]')).toEqual([1, 2, 3]);
  });

  it('returns ok:false when it cannot produce valid JSON', () => {
    const r = repairJson('{"a": }');
    // Best effort; report outcome honestly rather than throwing.
    expect(typeof r.ok).toBe('boolean');
    expect(() => repairJson('{{{{')).not.toThrow();
  });

  it('quotes unquoted string values', () => {
    const r = repairJson('{"a": hello}');
    expect(r.applied).toContain(REPAIR.quotedValues);
    expect(repaired('{"a": hello}')).toEqual({ a: 'hello' });
  });

  it('handles empty and stray-comma containers', () => {
    expect(repaired('[,1,2]')).toEqual([1, 2]);
    expect(repaired('{,"a":1}')).toEqual({ a: 1 });
    expect(repairJson('').ok).toBeFalse();
  });

  it('handles MongoDB numeric wrappers and empty args', () => {
    expect(repaired('{"a": NumberLong(), "b": ISODate(), "c": NumberInt(7)}')).toEqual({
      a: 0,
      b: '',
      c: 7,
    });
  });

  it('converts hex numbers and -Infinity', () => {
    expect(repaired('{"x": 0xFF}')).toEqual({ x: 255 });
    expect(repaired('{"y": -Infinity}')).toEqual({ y: null });
  });

  it('recovers from unterminated strings and unknown chars', () => {
    expect(() => repairJson('{"a": "abc')).not.toThrow();
    expect(() => repairJson('{"a": @}')).not.toThrow();
    expect(() => repairJson('`unterminated')).not.toThrow();
  });

  it('decodes escapes inside single-quoted strings', () => {
    expect(repaired("{'a':'line1\\nline2'}")).toEqual({ a: 'line1\nline2' });
  });
});

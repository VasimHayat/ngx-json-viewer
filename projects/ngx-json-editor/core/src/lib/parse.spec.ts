import { parseJson, parseJsonLocating } from './parse';

describe('parseJson', () => {
  it('parses all JSON value kinds', () => {
    // `as unknown` avoids TS2589 from jasmine's recursive Expected<T> over the
    // JsonValue carried inside ParseResult.
    expect(parseJson('null') as unknown).toEqual({ ok: true, value: null });
    expect(parseJson('true') as unknown).toEqual({ ok: true, value: true });
    expect(parseJson('-12.5e3') as unknown).toEqual({ ok: true, value: -12500 });
    expect(parseJson('"a\\nb"') as unknown).toEqual({ ok: true, value: 'a\nb' });
    expect(parseJson('[1,2,3]') as unknown).toEqual({ ok: true, value: [1, 2, 3] });
    expect(parseJson('{"a":{"b":[true,null]}}') as unknown).toEqual({
      ok: true,
      value: { a: { b: [true, null] } },
    });
  });

  it('decodes unicode escapes', () => {
    const r = parseJson('"\\u0041\\u00e9"');
    expect((r.ok && r.value) as unknown).toBe('Aé');
  });

  it('reports a located error for a trailing comma', () => {
    const r = parseJsonLocating('{"a":1,}');
    expect(r.ok).toBeFalse();
    if (!r.ok) {
      expect(r.error.kind).toBe('parse');
      expect(r.error.location.line).toBe(1);
      expect(r.error.location.column).toBeGreaterThan(6);
    }
  });

  it('reports line/column across multiple lines', () => {
    const r = parseJsonLocating('{\n  "a": 1\n  "b": 2\n}');
    expect(r.ok).toBeFalse();
    if (!r.ok) {
      expect(r.error.location.line).toBe(3);
    }
  });

  it('rejects unterminated strings and trailing content', () => {
    expect(parseJsonLocating('"abc').ok).toBeFalse();
    expect(parseJsonLocating('{} garbage').ok).toBeFalse();
    expect(parseJsonLocating('').ok).toBeFalse();
  });

  it('rejects invalid escapes and bare control chars', () => {
    expect(parseJsonLocating('"\\x"').ok).toBeFalse();
    // A raw (unescaped) tab inside a string is invalid strict JSON.
    expect(parseJsonLocating('"a\tb"').ok).toBeFalse();
  });

  it('never throws, even on garbage', () => {
    expect(() => parseJson('@@@')).not.toThrow();
    expect(parseJson('@@@').ok).toBeFalse();
  });
});

describe('parseJsonLocating (exercises the hand-written parser directly)', () => {
  it('parses every value kind through the locating parser', () => {
    const text =
      '{"s":"a\\t\\n\\r\\b\\f\\/\\\\\\"x","u":"\\u0041","n":-1.5e+2,"i":0,"b":true,"f":false,"z":null,"arr":[1,{},[]],"o":{}}';
    const r = parseJsonLocating(text);
    expect(r.ok).toBeTrue();
    if (r.ok) {
      expect((r.value as Record<string, unknown>)['n']).toBe(-150);
      expect((r.value as Record<string, unknown>)['u']).toBe('A');
    }
    expect(parseJsonLocating('[]').ok).toBeTrue();
    expect(parseJsonLocating('{}').ok).toBeTrue();
    expect(parseJsonLocating('  \n  42  ').ok).toBeTrue();
  });

  it('locates each category of structural error', () => {
    const bad = [
      '{1:2}', // non-string key
      '{"a" 1}', // missing colon
      '{"a":1 2}', // missing comma in object
      '[1 2]', // missing comma in array
      '"\\uZZZZ"', // bad unicode escape
      '-', // bare minus
      '1.', // decimal without digit
      '1e', // exponent without digit
      'tru', // truncated literal
      'nul', // truncated literal
      'fals', // truncated literal
      '{', // unterminated object
      '[', // unterminated array
    ];
    for (const t of bad) {
      const r = parseJsonLocating(t);
      expect(r.ok).withContext(`expected "${t}" to fail`).toBeFalse();
      if (!r.ok) {
        expect(r.error.location.offset).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

import { coerceToType, getValueType, isContainer, isJsonArray, isJsonObject } from './value-type';

describe('value-type', () => {
  it('classifies every JSON value kind', () => {
    expect(getValueType(null)).toBe('null');
    expect(getValueType([])).toBe('array');
    expect(getValueType({})).toBe('object');
    expect(getValueType('x')).toBe('string');
    expect(getValueType(1)).toBe('number');
    expect(getValueType(true)).toBe('boolean');
  });

  it('provides narrowing guards', () => {
    expect(isJsonObject({})).toBeTrue();
    expect(isJsonObject([])).toBeFalse();
    expect(isJsonObject(null)).toBeFalse();
    expect(isJsonArray([])).toBeTrue();
    expect(isContainer({})).toBeTrue();
    expect(isContainer('x')).toBeFalse();
  });

  it('coerces between types preserving information where possible', () => {
    // `as unknown` avoids TS2589 from jasmine's recursive matcher types over JsonValue.
    expect(coerceToType(42, 'string') as unknown).toBe('42');
    expect(coerceToType('42', 'number') as unknown).toBe(42);
    expect(coerceToType('nan', 'number') as unknown).toBe(0);
    expect(coerceToType('false', 'boolean') as unknown).toBe(false);
    expect(coerceToType('x', 'boolean') as unknown).toBe(true);
    expect(coerceToType(1, 'null') as unknown).toBeNull();
    expect(coerceToType({ a: 1, b: 2 }, 'array') as unknown).toEqual([1, 2]);
    expect(coerceToType([1], 'object') as unknown).toEqual({});
  });
});

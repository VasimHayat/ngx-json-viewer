import { isTabular, tableModel } from './table';

describe('tableModel', () => {
  it('unions object keys in first-seen order', () => {
    const model = tableModel([
      { a: 1, b: 2 },
      { b: 3, c: 4 },
    ]);
    expect(model.columns).toEqual(['a', 'b', 'c']);
    expect(model.rowCount).toBe(2);
    expect(model.objectRows).toBeTrue();
  });

  it('uses a synthetic value column for primitive arrays', () => {
    const model = tableModel([1, 2, 3]);
    expect(model.columns).toEqual(['value']);
    expect(model.objectRows).toBeFalse();
  });

  it('treats a non-array as having no columns', () => {
    expect(tableModel({ a: 1 }).columns).toEqual([]);
  });

  it('isTabular detects non-empty arrays', () => {
    expect(isTabular([{ a: 1 }])).toBeTrue();
    expect(isTabular([])).toBeFalse();
    expect(isTabular({ a: 1 })).toBeFalse();
  });
});

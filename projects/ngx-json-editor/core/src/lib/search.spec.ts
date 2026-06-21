import { searchJson } from './search';

const DOC = {
  name: 'Ada',
  nickname: 'addie',
  tags: ['admin', 'dev'],
  meta: { author: 'Ada' },
};

describe('searchJson', () => {
  it('matches keys and values case-insensitively', () => {
    const hits = searchJson(DOC, 'ad');
    // keys: (none contain "ad") ; values: "Ada", "addie", "admin", "Ada"
    expect(hits.length).toBeGreaterThanOrEqual(3);
    expect(hits.every((h) => h.field === 'key' || h.field === 'value')).toBeTrue();
  });

  it('reports the path of each match in document order', () => {
    const hits = searchJson({ a: 'x', b: { a: 'x' } }, 'a', { values: false });
    // key matches only: /a (key "a"), /b/a (key "a")
    expect(hits.map((h) => h.path)).toEqual([['a'], ['b', 'a']]);
  });

  it('respects caseSensitive', () => {
    expect(searchJson(DOC, 'ADA').length).toBeGreaterThan(0);
    expect(searchJson(DOC, 'ADA', { caseSensitive: true }).length).toBe(0);
  });

  it('matches null and numbers as text', () => {
    expect(searchJson({ a: null, b: 42 }, 'null').length).toBe(1);
    expect(searchJson({ a: null, b: 42 }, '42').length).toBe(1);
  });

  it('returns nothing for an empty query', () => {
    expect(searchJson(DOC, '')).toEqual([]);
  });
});

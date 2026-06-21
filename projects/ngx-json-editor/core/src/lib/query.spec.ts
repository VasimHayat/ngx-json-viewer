import { applyTransform, buildJmespathQuery, queryJmespath } from './query';

const DATA = [
  { name: 'Ada', age: 36, city: 'London' },
  { name: 'Linus', age: 54, city: 'Helsinki' },
  { name: 'Grace', age: 85, city: 'New York' },
];

describe('queryJmespath', () => {
  it('runs a raw expression', () => {
    const r = queryJmespath(DATA, '[].name');
    expect((r.ok && r.value) as unknown).toEqual(['Ada', 'Linus', 'Grace']);
  });

  it('returns an error for an invalid expression', () => {
    const r = queryJmespath(DATA, '[?');
    expect(r.ok).toBeFalse();
  });

  it('returns null (not undefined) for no match', () => {
    const r = queryJmespath({ a: 1 }, 'missing');
    expect((r.ok && r.value) as unknown).toBeNull();
  });
});

describe('buildJmespathQuery', () => {
  it('builds a filter clause with the right literal type', () => {
    expect(buildJmespathQuery({ filter: { field: 'age', operator: '>', value: '50' } })).toBe(
      '@[?age > `50`]',
    );
    expect(buildJmespathQuery({ filter: { field: 'city', operator: '==', value: 'London' } })).toBe(
      "@[?city == 'London']",
    );
  });

  it('builds contains/starts_with as function calls', () => {
    expect(
      buildJmespathQuery({ filter: { field: 'name', operator: 'starts_with', value: 'A' } }),
    ).toBe("@[?starts_with(name, 'A')]");
  });

  it('builds sort and projection (pipe-composed)', () => {
    expect(buildJmespathQuery({ sort: { field: 'age', direction: 'asc' } })).toBe(
      '@ | sort_by(@, &age)',
    );
    expect(buildJmespathQuery({ sort: { field: 'age', direction: 'desc' } })).toBe(
      '@ | reverse(sort_by(@, &age))',
    );
    expect(buildJmespathQuery({ projection: ['name', 'age'] })).toBe(
      '@ | [].{name: name, age: age}',
    );
  });

  it('applies a full filter→sort→project pipeline', () => {
    const r = applyTransform(DATA, {
      filter: { field: 'age', operator: '>', value: '40' },
      sort: { field: 'age', direction: 'desc' },
      projection: ['name'],
    });
    expect((r.ok && r.value) as unknown).toEqual([{ name: 'Grace' }, { name: 'Linus' }]);
  });
});

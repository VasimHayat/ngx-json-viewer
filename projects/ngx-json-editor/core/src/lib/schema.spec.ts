import { createSchemaValidator, validateWithSchema } from './schema';

const SCHEMA = {
  type: 'object',
  required: ['name', 'age'],
  properties: {
    name: { type: 'string' },
    age: { type: 'number', minimum: 0 },
    email: { type: 'string', format: 'email' },
  },
  additionalProperties: false,
};

describe('schema validation', () => {
  it('passes a valid document', () => {
    expect(validateWithSchema({ name: 'Ada', age: 36 }, SCHEMA)).toEqual([]);
  });

  it('reports a missing required property targeted at the property path', () => {
    const errors = validateWithSchema({ name: 'Ada' }, SCHEMA);
    const missing = errors.find((e) => e.code === 'required');
    expect(missing).toBeDefined();
    expect(missing?.path).toEqual(['age']);
    expect(missing?.severity).toBe('error');
    expect(missing?.source).toBe('schema');
  });

  it('reports a type error at the offending path', () => {
    const errors = validateWithSchema({ name: 'Ada', age: 'old' }, SCHEMA);
    const typeErr = errors.find((e) => e.code === 'type');
    expect(typeErr?.path).toEqual(['age']);
  });

  it('reports constraint violations (minimum, format, additionalProperties)', () => {
    const errors = validateWithSchema({ name: 'Ada', age: -1, email: 'nope', extra: 1 }, SCHEMA);
    const codes = errors.map((e) => e.code);
    expect(codes).toContain('minimum');
    expect(codes).toContain('format');
    expect(codes).toContain('additionalProperties');
  });

  it('surfaces an invalid schema as a root error instead of throwing', () => {
    const v = createSchemaValidator({ type: 'not-a-real-type' });
    const errors = v.validate({});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toEqual([]);
  });

  it('reuses a compiled validator across calls', () => {
    const v = createSchemaValidator(SCHEMA);
    expect(v.validate({ name: 'Ada', age: 1 })).toEqual([]);
    expect(v.validate({ age: 1 }).length).toBeGreaterThan(0);
  });

  it('resolves external $refs supplied via options', () => {
    const id = 'https://example.com/schemas/addr.json';
    const addr = {
      $id: id,
      type: 'object',
      required: ['city'],
      properties: { city: { type: 'string' } },
    };
    const main = { type: 'object', properties: { address: { $ref: id } } };
    const errors = validateWithSchema({ address: {} }, main, { refs: { [id]: addr } });
    const required = errors.find((e) => e.code === 'required');
    expect(required?.path).toEqual(['address', 'city']);
  });

  it('accepts a boolean schema and extra Ajv options', () => {
    expect(validateWithSchema({ anything: true }, true)).toEqual([]);
    expect(validateWithSchema(1, false).length).toBeGreaterThan(0);
    const v = createSchemaValidator(SCHEMA, { ajv: { allErrors: false } });
    expect(v.validate({ name: 'Ada', age: 1 })).toEqual([]);
  });

  it('ignores duplicate ref registration without throwing', () => {
    const addr = { $id: 'urn:dup', type: 'string' };
    expect(() =>
      createSchemaValidator({ type: 'object' }, { refs: { a: addr, b: addr } }),
    ).not.toThrow();
  });
});

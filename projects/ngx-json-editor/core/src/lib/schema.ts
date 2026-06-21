import Ajv, { ErrorObject, Options as AjvOptions } from 'ajv';
import addFormats from 'ajv-formats';
import { JsonValue, ValidationError } from './types';
import { pointerToPath } from './json-pointer';

/** A JSON Schema document (draft-07 / 2019-09 / 2020-12). */
export type SchemaDocument = boolean | Record<string, unknown>;

/** Options for building a validator. */
export interface SchemaValidatorOptions {
  /** Additional schemas referenced by `$ref`, keyed by `$id`/URI. */
  readonly refs?: Record<string, SchemaDocument> | null;
  /** Extra Ajv options (merged over the defaults). */
  readonly ajv?: AjvOptions;
}

/** A compiled validator that returns findings as values. */
export interface SchemaValidator {
  validate(data: JsonValue): readonly ValidationError[];
}

/**
 * Build a reusable schema validator backed by Ajv. Compilation errors (an
 * invalid schema) surface as a single root-level {@link ValidationError} from
 * `validate`, never as a thrown exception.
 */
export function createSchemaValidator(
  schema: SchemaDocument,
  options: SchemaValidatorOptions = {},
): SchemaValidator {
  const ajv = new Ajv({ allErrors: true, strict: false, ...options.ajv });
  addFormats(ajv);

  if (options.refs) {
    for (const [id, refSchema] of Object.entries(options.refs)) {
      try {
        // Prefer the schema's own `$id` (registering under both it and the map
        // key would be a duplicate). Fall back to the map key when it has none.
        const obj =
          typeof refSchema === 'object' && refSchema !== null
            ? (refSchema as Record<string, unknown>)
            : null;
        const ownId = obj && typeof obj['$id'] === 'string' ? (obj['$id'] as string) : null;
        const key = ownId ?? id;
        if (!ajv.getSchema(key)) {
          if (ownId) {
            ajv.addSchema(refSchema);
          } else {
            ajv.addSchema(refSchema, id);
          }
        }
      } catch {
        // Ignore duplicate/invalid ref registration; surfaced on validate.
      }
    }
  }

  let compiled: ((data: unknown) => boolean) | null = null;
  let compileError: string | null = null;
  try {
    compiled = ajv.compile(schema);
  } catch (e) {
    compileError = (e as Error).message;
  }

  return {
    validate(data: JsonValue): readonly ValidationError[] {
      if (compileError) {
        return [
          {
            path: [],
            message: `Invalid schema: ${compileError}`,
            severity: 'error',
            source: 'schema',
          },
        ];
      }
      if (!compiled) {
        return [];
      }
      const valid = compiled(data);
      if (valid) {
        return [];
      }
      const errors = (compiled as unknown as { errors?: ErrorObject[] | null }).errors ?? [];
      return errors.map(mapAjvError);
    },
  };
}

/** One-shot convenience: validate `data` against `schema`. */
export function validateWithSchema(
  data: JsonValue,
  schema: SchemaDocument,
  options: SchemaValidatorOptions = {},
): readonly ValidationError[] {
  return createSchemaValidator(schema, options).validate(data);
}

function mapAjvError(error: ErrorObject): ValidationError {
  // For `required`, target the missing property rather than its parent object.
  const basePath = pointerToPath(error.instancePath);
  const path =
    error.keyword === 'required' &&
    typeof (error.params as { missingProperty?: string }).missingProperty === 'string'
      ? [...basePath, (error.params as { missingProperty: string }).missingProperty]
      : basePath;

  return {
    path,
    message: error.message ?? 'Schema validation error',
    severity: 'error',
    source: 'schema',
    code: error.keyword,
  };
}

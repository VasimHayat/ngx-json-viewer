import { parseJson } from './parse';

/** Outcome of a one-click repair of malformed JSON. */
export interface RepairResult {
  /** Whether the text is valid JSON after the repair attempt. */
  readonly ok: boolean;
  /** The repaired (or original, if nothing changed) text. */
  readonly text: string;
  /** Did the repair modify the input? */
  readonly changed: boolean;
  /** Human-readable list of fixes applied. */
  readonly applied: readonly string[];
  /** Present when the text could not be coerced into valid JSON. */
  readonly error?: string;
}

/** Fix labels surfaced to the user (and asserted in tests). */
export const REPAIR = {
  comments: 'Removed comments',
  quotedKeys: 'Quoted unquoted keys',
  singleQuotes: 'Replaced single/backtick quotes with double quotes',
  trailingCommas: 'Removed trailing commas',
  missingCommas: 'Added missing commas',
  specialValues: 'Converted NaN / Infinity / undefined to null',
  pythonLiterals: 'Converted Python literals (True / False / None)',
  mongo: 'Converted MongoDB / JS function notation',
  concatenated: 'Wrapped concatenated values in an array',
  quotedValues: 'Quoted unquoted string values',
} as const;

/**
 * Attempt to repair malformed JSON into valid JSON.
 *
 * Handles (per spec §3.3): trailing commas, single/backtick quotes, unquoted
 * keys, line and block comments, concatenated objects/values → array, and
 * MongoDB/JS-ish notation (`NaN`, `Infinity`, `undefined`, Python
 * `True/False/None`, `ObjectId("…")`, `ISODate("…")`, `NumberLong(…)`, …).
 *
 * Original heuristic implementation: a lenient, structure-aware re-serializer.
 * The result is validated by {@link parseJson}; `ok` reflects whether the output
 * is now valid JSON. Never throws.
 */
export function repairJson(input: string): RepairResult {
  // If it already parses, do nothing.
  if (parseJson(input).ok) {
    return { ok: true, text: input, changed: false, applied: [] };
  }
  try {
    const r = new Repairer(input);
    const text = r.run();
    const parsed = parseJson(text);
    return {
      ok: parsed.ok,
      text,
      changed: text !== input,
      applied: [...r.applied],
      error: parsed.ok ? undefined : parsed.error.message,
    };
  } catch (e) {
    return {
      ok: false,
      text: input,
      changed: false,
      applied: [],
      error: (e as Error).message,
    };
  }
}

const PY_LITERALS: Readonly<Record<string, string>> = {
  True: 'true',
  False: 'false',
  None: 'null',
};
const NULLISH: ReadonlySet<string> = new Set(['NaN', 'Infinity', '-Infinity', 'undefined']);
const JSON_LITERALS: ReadonlySet<string> = new Set(['true', 'false', 'null']);
// Mongo wrappers whose argument should be emitted as a number rather than a string.
const MONGO_NUMERIC: ReadonlySet<string> = new Set([
  'NumberLong',
  'NumberInt',
  'NumberDecimal',
  'NumberDouble',
]);

class Repairer {
  private i = 0;
  readonly applied = new Set<string>();

  constructor(private readonly s: string) {}

  run(): string {
    this.skipTrivia();
    if (this.i >= this.s.length) {
      return '';
    }
    const first = this.repairValue();
    this.skipTrivia();
    if (this.i >= this.s.length) {
      return first;
    }
    // Top-level concatenation: collect remaining values into an array.
    const parts = [first];
    while (this.i < this.s.length) {
      if (this.peek() === ',') {
        this.i++;
        this.skipTrivia();
        continue;
      }
      parts.push(this.repairValue());
      this.skipTrivia();
    }
    this.applied.add(REPAIR.concatenated);
    return `[${parts.join(',')}]`;
  }

  private repairValue(): string {
    this.skipTrivia();
    const ch = this.peek();
    if (ch === '{') {
      return this.repairObject();
    }
    if (ch === '[') {
      return this.repairArray();
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      return this.repairString();
    }
    return this.repairBareToken(false);
  }

  private repairObject(): string {
    this.i++; // {
    const members: string[] = [];
    for (;;) {
      this.skipTrivia();
      const ch = this.peek();
      if (ch === '') {
        break; // unterminated; best effort
      }
      if (ch === '}') {
        this.i++;
        break;
      }
      if (ch === ',') {
        // stray / trailing comma
        this.i++;
        this.applied.add(REPAIR.trailingCommas);
        continue;
      }
      const key = this.repairKey();
      this.skipTrivia();
      if (this.peek() === ':') {
        this.i++;
      }
      const value = this.repairValue();
      members.push(`${key}:${value}`);
      this.skipTrivia();
      if (this.peek() === ',') {
        this.i++;
        this.skipTrivia();
        if (this.peek() === '}' || this.peek() === '') {
          this.applied.add(REPAIR.trailingCommas);
        }
      } else if (this.peek() !== '}' && this.peek() !== '') {
        // Missing comma between members.
        this.applied.add(REPAIR.missingCommas);
      }
    }
    return `{${members.join(',')}}`;
  }

  private repairArray(): string {
    this.i++; // [
    const items: string[] = [];
    for (;;) {
      this.skipTrivia();
      const ch = this.peek();
      if (ch === '') {
        break;
      }
      if (ch === ']') {
        this.i++;
        break;
      }
      if (ch === ',') {
        this.i++;
        this.applied.add(REPAIR.trailingCommas);
        continue;
      }
      items.push(this.repairValue());
      this.skipTrivia();
      if (this.peek() === ',') {
        this.i++;
        this.skipTrivia();
        if (this.peek() === ']' || this.peek() === '') {
          this.applied.add(REPAIR.trailingCommas);
        }
      } else if (this.peek() !== ']' && this.peek() !== '') {
        this.applied.add(REPAIR.missingCommas);
      }
    }
    return `[${items.join(',')}]`;
  }

  private repairKey(): string {
    const ch = this.peek();
    if (ch === '"' || ch === "'" || ch === '`') {
      return this.repairString();
    }
    // Unquoted identifier key.
    const id = this.readIdentifier();
    if (id.length > 0) {
      this.applied.add(REPAIR.quotedKeys);
      return JSON.stringify(id);
    }
    // Fallback: emit empty key to keep structure valid.
    this.applied.add(REPAIR.quotedKeys);
    return '""';
  }

  private repairString(): string {
    const quote = this.peek();
    if (quote !== '"') {
      this.applied.add(REPAIR.singleQuotes);
    }
    this.i++; // opening quote
    let out = '';
    while (this.i < this.s.length) {
      const ch = this.s[this.i];
      if (ch === '\\') {
        const next = this.s[this.i + 1] ?? '';
        if (next === quote && quote !== '"') {
          // Escaped the original quote char; in JSON the quote is " so unescape.
          out += quote;
          this.i += 2;
          continue;
        }
        out += ch + next;
        this.i += 2;
        continue;
      }
      if (ch === quote) {
        this.i++; // closing quote
        return this.normalizeStringLiteral(out);
      }
      out += ch;
      this.i++;
    }
    // Unterminated string: best effort.
    return this.normalizeStringLiteral(out);
  }

  /** Re-encode raw inner content as a valid JSON double-quoted string. */
  private normalizeStringLiteral(inner: string): string {
    // Decode common escapes we passed through, then JSON.stringify to re-encode
    // safely (handles quotes, control chars, backslashes).
    const decoded = inner.replace(/\\(.)/g, (_m, c: string) => {
      switch (c) {
        case 'n':
          return '\n';
        case 't':
          return '\t';
        case 'r':
          return '\r';
        case 'b':
          return '\b';
        case 'f':
          return '\f';
        case '/':
          return '/';
        case '"':
          return '"';
        case '\\':
          return '\\';
        default:
          return c;
      }
    });
    return JSON.stringify(decoded);
  }

  private repairBareToken(_inKey: boolean): string {
    const id = this.readIdentifier();
    if (id === '') {
      // number or something starting with non-identifier
      const num = this.readNumber();
      if (num !== '') {
        return num;
      }
      // Unknown char; skip it to make progress.
      this.i++;
      return 'null';
    }
    // Mongo/JS function call: Identifier( ... )
    this.skipTrivia();
    if (this.peek() === '(') {
      return this.repairFunctionCall(id);
    }
    if (JSON_LITERALS.has(id)) {
      return id;
    }
    if (Object.prototype.hasOwnProperty.call(PY_LITERALS, id)) {
      this.applied.add(REPAIR.pythonLiterals);
      return PY_LITERALS[id];
    }
    if (NULLISH.has(id)) {
      this.applied.add(REPAIR.specialValues);
      return 'null';
    }
    // Numeric token captured as identifier? (e.g. starts with digit) — handled
    // by readNumber path; here treat leftover identifier as a quoted string.
    this.applied.add(REPAIR.quotedValues);
    return JSON.stringify(id);
  }

  private repairFunctionCall(name: string): string {
    this.i++; // (
    const argStart = this.i;
    let depth = 1;
    while (this.i < this.s.length && depth > 0) {
      const ch = this.s[this.i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth === 0) break;
      this.i++;
    }
    const rawArg = this.s.slice(argStart, this.i).trim();
    if (this.peek() === ')') {
      this.i++;
    }
    this.applied.add(REPAIR.mongo);
    if (rawArg === '') {
      // e.g. ISODate() / new Date()
      return MONGO_NUMERIC.has(name) ? '0' : '""';
    }
    // Strip surrounding quotes from the argument if present.
    const unquoted = rawArg.replace(/^['"`]|['"`]$/g, '');
    if (MONGO_NUMERIC.has(name)) {
      const n = Number(unquoted);
      return Number.isFinite(n) ? String(n) : '0';
    }
    return JSON.stringify(unquoted);
  }

  private readIdentifier(): string {
    const start = this.i;
    // Allow a leading letter/underscore/$, then word chars. Also accept a
    // leading '-' only for -Infinity.
    if (this.peek() === '-' && this.s.startsWith('-Infinity', this.i)) {
      this.i += '-Infinity'.length;
      return '-Infinity';
    }
    while (this.i < this.s.length && /[A-Za-z_$]/.test(this.s[this.i])) {
      this.i++;
    }
    if (this.i === start) {
      return '';
    }
    // include following digits as part of identifier
    while (this.i < this.s.length && /[A-Za-z0-9_$]/.test(this.s[this.i])) {
      this.i++;
    }
    return this.s.slice(start, this.i);
  }

  private readNumber(): string {
    const start = this.i;
    const m = /^[-+]?(?:0[xX][0-9a-fA-F]+|\d*\.?\d+(?:[eE][-+]?\d+)?)/.exec(this.s.slice(this.i));
    if (!m) {
      return '';
    }
    this.i += m[0].length;
    let raw = m[0];
    if (raw.startsWith('+')) {
      raw = raw.slice(1);
    }
    if (/^[-+]?0[xX]/.test(raw)) {
      const n = Number(raw);
      this.applied.add(REPAIR.mongo);
      return Number.isFinite(n) ? String(n) : '0';
    }
    return this.s.slice(start, start + m[0].length).replace(/^\+/, '');
  }

  // ── trivia ────────────────────────────────────────────────────────────
  private skipTrivia(): void {
    for (;;) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.i++;
        continue;
      }
      if (ch === '/' && this.s[this.i + 1] === '/') {
        this.applied.add(REPAIR.comments);
        this.i += 2;
        while (this.i < this.s.length && this.s[this.i] !== '\n') {
          this.i++;
        }
        continue;
      }
      if (ch === '/' && this.s[this.i + 1] === '*') {
        this.applied.add(REPAIR.comments);
        this.i += 2;
        while (this.i < this.s.length && !(this.s[this.i] === '*' && this.s[this.i + 1] === '/')) {
          this.i++;
        }
        this.i += 2;
        continue;
      }
      break;
    }
  }

  private peek(): string {
    return this.i < this.s.length ? this.s[this.i] : '';
  }
}

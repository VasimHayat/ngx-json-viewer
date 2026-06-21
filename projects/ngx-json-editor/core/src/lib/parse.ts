import { JsonParseError, JsonValue, Result, SourceLocation, err, ok } from './types';

/** Result of parsing JSON text: the value, or a located {@link JsonParseError}. */
export type ParseResult = Result<JsonValue, JsonParseError>;

/**
 * Parse strict JSON text into a value.
 *
 * Fast path uses the engine's native `JSON.parse`; on failure we re-run an
 * original location-tracking recursive-descent parser to produce a precise
 * line/column error (native error messages are inconsistent across engines and
 * rarely carry usable positions). This powers text-mode error gutters and
 * jump-to-error.
 */
export function parseJson(text: string): ParseResult {
  try {
    return ok(JSON.parse(text) as JsonValue);
  } catch {
    return new LocatingParser(text).parse();
  }
}

/**
 * Parse with the location-tracking parser regardless of the native fast path.
 * Exposed mainly for tests and tooling that always want positional diagnostics.
 */
export function parseJsonLocating(text: string): ParseResult {
  return new LocatingParser(text).parse();
}

const ESCAPES: Readonly<Record<string, string>> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

/**
 * A strict, original recursive-descent JSON parser that tracks source position.
 * Not a fast path — it exists to report exactly where and why parsing failed.
 */
class LocatingParser {
  private pos = 0;
  private line = 1;
  private col = 1;

  constructor(private readonly src: string) {}

  parse(): ParseResult {
    try {
      this.skipWs();
      if (this.pos >= this.src.length) {
        throw this.fail('Unexpected end of JSON input');
      }
      const value = this.parseValue();
      this.skipWs();
      if (this.pos < this.src.length) {
        throw this.fail(`Unexpected token "${this.peek()}" after JSON value`);
      }
      return ok(value);
    } catch (e) {
      if (isLocatedError(e)) {
        return err(e.parseError);
      }
      // Defensive: never throw out of the parser.
      return err({
        kind: 'parse',
        message: (e as Error).message ?? 'Invalid JSON',
        location: this.location(),
      });
    }
  }

  private parseValue(): JsonValue {
    const ch = this.peek();
    switch (ch) {
      case '{':
        return this.parseObject();
      case '[':
        return this.parseArray();
      case '"':
        return this.parseString();
      case 't':
      case 'f':
        return this.parseBoolean();
      case 'n':
        return this.parseNull();
      default:
        if (ch === '-' || (ch >= '0' && ch <= '9')) {
          return this.parseNumber();
        }
        throw this.fail(ch === '' ? 'Unexpected end of JSON input' : `Unexpected token "${ch}"`);
    }
  }

  private parseObject(): JsonValue {
    const obj: Record<string, JsonValue> = {};
    this.expect('{');
    this.skipWs();
    if (this.peek() === '}') {
      this.advance();
      return obj;
    }
    for (;;) {
      this.skipWs();
      if (this.peek() !== '"') {
        throw this.fail('Expected a string key in object');
      }
      const key = this.parseString();
      this.skipWs();
      if (this.peek() !== ':') {
        throw this.fail('Expected ":" after object key');
      }
      this.advance();
      this.skipWs();
      obj[key] = this.parseValue();
      this.skipWs();
      const sep = this.peek();
      if (sep === ',') {
        this.advance();
        continue;
      }
      if (sep === '}') {
        this.advance();
        return obj;
      }
      throw this.fail('Expected "," or "}" in object');
    }
  }

  private parseArray(): JsonValue {
    const arr: JsonValue[] = [];
    this.expect('[');
    this.skipWs();
    if (this.peek() === ']') {
      this.advance();
      return arr;
    }
    for (;;) {
      this.skipWs();
      arr.push(this.parseValue());
      this.skipWs();
      const sep = this.peek();
      if (sep === ',') {
        this.advance();
        continue;
      }
      if (sep === ']') {
        this.advance();
        return arr;
      }
      throw this.fail('Expected "," or "]" in array');
    }
  }

  private parseString(): string {
    this.expect('"');
    let out = '';
    for (;;) {
      const ch = this.peek();
      if (ch === '') {
        throw this.fail('Unterminated string');
      }
      if (ch === '"') {
        this.advance();
        return out;
      }
      if (ch === '\\') {
        this.advance();
        const esc = this.peek();
        if (esc === 'u') {
          this.advance();
          out += this.parseUnicodeEscape();
          continue;
        }
        const mapped = Object.prototype.hasOwnProperty.call(ESCAPES, esc)
          ? ESCAPES[esc]
          : undefined;
        if (mapped === undefined) {
          throw this.fail(`Invalid escape sequence "\\${esc}"`);
        }
        out += mapped;
        this.advance();
        continue;
      }
      if (ch.charCodeAt(0) < 0x20) {
        throw this.fail('Control character must be escaped in string');
      }
      out += ch;
      this.advance();
    }
  }

  private parseUnicodeEscape(): string {
    let hex = '';
    for (let i = 0; i < 4; i++) {
      const c = this.peek();
      if (!/[0-9a-fA-F]/.test(c)) {
        throw this.fail('Invalid \\u escape: expected 4 hex digits');
      }
      hex += c;
      this.advance();
    }
    return String.fromCharCode(parseInt(hex, 16));
  }

  private parseNumber(): number {
    const start = this.pos;
    if (this.peek() === '-') {
      this.advance();
    }
    if (this.peek() === '0') {
      this.advance();
    } else if (this.peek() >= '1' && this.peek() <= '9') {
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    } else {
      throw this.fail('Invalid number');
    }
    if (this.peek() === '.') {
      this.advance();
      if (!this.isDigit(this.peek())) {
        throw this.fail('Invalid number: expected digit after decimal point');
      }
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }
    if (this.peek() === 'e' || this.peek() === 'E') {
      this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        this.advance();
      }
      if (!this.isDigit(this.peek())) {
        throw this.fail('Invalid number: expected digit in exponent');
      }
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }
    return Number(this.src.slice(start, this.pos));
  }

  private parseBoolean(): boolean {
    if (this.src.startsWith('true', this.pos)) {
      this.advanceBy(4);
      return true;
    }
    if (this.src.startsWith('false', this.pos)) {
      this.advanceBy(5);
      return false;
    }
    throw this.fail('Invalid literal');
  }

  private parseNull(): null {
    if (this.src.startsWith('null', this.pos)) {
      this.advanceBy(4);
      return null;
    }
    throw this.fail('Invalid literal');
  }

  // ── Cursor helpers ──────────────────────────────────────────────────────
  private peek(): string {
    return this.pos < this.src.length ? this.src[this.pos] : '';
  }

  private advance(): void {
    if (this.src[this.pos] === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    this.pos++;
  }

  private advanceBy(n: number): void {
    for (let i = 0; i < n; i++) {
      this.advance();
    }
  }

  private expect(ch: string): void {
    if (this.peek() !== ch) {
      throw this.fail(`Expected "${ch}"`);
    }
    this.advance();
  }

  private skipWs(): void {
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private location(): SourceLocation {
    return { offset: this.pos, line: this.line, column: this.col };
  }

  private fail(message: string): LocatedError {
    return new LocatedError({ kind: 'parse', message, location: this.location() });
  }
}

/** Internal carrier so we can throw with a precise location and catch it cleanly. */
class LocatedError extends Error {
  constructor(readonly parseError: JsonParseError) {
    super(parseError.message);
    this.name = 'LocatedError';
  }
}

function isLocatedError(e: unknown): e is LocatedError {
  return e instanceof LocatedError;
}

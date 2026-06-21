import { Injectable, computed, signal } from '@angular/core';
import {
  JsonParseError,
  JsonPatch,
  JsonPath,
  JsonValue,
  JsonValueType,
  ParseResult,
  RepairResult,
  SchemaValidator,
  ValidationError,
  applyPatch,
  coerceToType,
  createSchemaValidator,
  diffToPatch,
  getAtPath,
  isJsonArray,
  isJsonObject,
  ok,
  parseJson,
  pathToPointer,
  repairJson,
} from 'ngx-json-editor/core';
import { EditorMode, JsonEditorContent, isTextContent } from '../models/editor-content';
import { JsonSchema, ValidatorFn } from '../models/schema';
import { allContainerPointers } from './tree-model';

interface HistoryEntry {
  readonly before: JsonEditorContent;
  readonly after: JsonEditorContent;
  /** RFC 6902 patch describing the change, when both sides parsed. */
  readonly patch?: JsonPatch;
}

/**
 * Per-instance, signal-based single source of truth for one editor.
 *
 * Holds the canonical {@link JsonEditorContent} (either parsed `json` or raw
 * `text`) plus mode, selection, and expansion state. Tree / text / table are
 * projections of this store, so switching modes never loses data or state.
 * Edits flow through {@link commit}/{@link applyJsonPatch}, which maintain a
 * bounded undo/redo history.
 *
 * Provided at the component level (`providers: [EditorStore]`).
 */
@Injectable()
export class EditorStore {
  // ── Canonical state ───────────────────────────────────────────────────────
  private readonly _content = signal<JsonEditorContent>({ json: null });
  readonly content = this._content.asReadonly();

  readonly mode = signal<EditorMode>('tree');
  readonly selection = signal<JsonPath | null>(null);
  /** Expanded container nodes, keyed by JSON Pointer; preserved across modes. */
  readonly expanded = signal<ReadonlySet<string>>(new Set<string>());

  readonly indentation = signal<number | 'tab'>(2);
  readonly readOnly = signal<boolean>(false);

  private readonly schemaValidator = signal<SchemaValidator | null>(null);
  private readonly customValidator = signal<ValidatorFn | null>(null);

  // ── History ───────────────────────────────────────────────────────────────
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private historyLimit = 200;
  readonly canUndo = signal<boolean>(false);
  readonly canRedo = signal<boolean>(false);

  // ── Derived views ─────────────────────────────────────────────────────────
  /** Parse result of the canonical content (json content always parses). */
  readonly parsed = computed<ParseResult>(() => {
    const c = this._content();
    return isTextContent(c) ? parseJson(c.text) : ok(c.json ?? null);
  });

  /** Parsed JSON value, or `undefined` when the text is invalid. */
  readonly json = computed<JsonValue | undefined>(() => {
    const p = this.parsed();
    return p.ok ? p.value : undefined;
  });

  /** Canonical text representation (verbatim for text content; pretty for json). */
  readonly text = computed<string>(() => {
    const c = this._content();
    if (isTextContent(c)) {
      return c.text;
    }
    return stringify(c.json ?? null, this.indentation());
  });

  /** Parse error, if the current text is invalid JSON. */
  readonly parseError = computed<JsonParseError | null>(() => {
    const p = this.parsed();
    return p.ok ? null : p.error;
  });

  /** All findings: parse error (if any) + schema + custom validator. */
  readonly errors = computed<readonly ValidationError[]>(() => {
    const pe = this.parseError();
    if (pe) {
      return [{ path: [], message: pe.message, severity: 'error', source: 'parse' }];
    }
    const value = this.json();
    if (value === undefined) {
      return [];
    }
    const out: ValidationError[] = [];
    const sv = this.schemaValidator();
    if (sv) {
      out.push(...sv.validate(value));
    }
    const cv = this.customValidator();
    if (cv) {
      out.push(...cv(value));
    }
    return out;
  });

  readonly size = computed<number>(() => this.text().length);
  readonly isEmpty = computed<boolean>(() => {
    const v = this.json();
    if (v === undefined) {
      return this.text().trim().length === 0;
    }
    if (v === null) {
      return true;
    }
    return typeof v === 'object' && Object.keys(v).length === 0;
  });

  // ── External (host) updates ─────────────────────────────────────────────────
  /** Replace the document from outside the editor; resets undo/redo history. */
  replaceDocument(content: JsonEditorContent): void {
    this._content.set(normalize(content));
    this.undoStack = [];
    this.redoStack = [];
    this.refreshHistoryFlags();
  }

  setIndentation(indent: number | 'tab'): void {
    this.indentation.set(indent);
  }

  setReadOnly(ro: boolean): void {
    this.readOnly.set(ro);
  }

  setHistoryLimit(limit: number): void {
    this.historyLimit = Math.max(1, limit);
  }

  setSchema(schema: JsonSchema | null, refs?: Record<string, JsonSchema> | null): void {
    this.schemaValidator.set(
      schema === null
        ? null
        : createSchemaValidator(schema as never, {
            refs: (refs as never) ?? null,
          }),
    );
  }

  setValidator(validator: ValidatorFn | null): void {
    this.customValidator.set(validator);
  }

  // ── Mode / selection / expansion ────────────────────────────────────────────
  setMode(mode: EditorMode): void {
    this.mode.set(mode);
  }

  setSelection(path: JsonPath | null): void {
    this.selection.set(path);
  }

  toggleExpanded(path: JsonPath): void {
    const key = pathToPointer(path);
    const next = new Set(this.expanded());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.expanded.set(next);
  }

  setExpanded(paths: Iterable<string>): void {
    this.expanded.set(new Set(paths));
  }

  isExpanded(path: JsonPath): boolean {
    return this.expanded().has(pathToPointer(path));
  }

  /** Expand every container node in the current document. */
  expandAllContainers(): void {
    const value = this.json();
    if (value !== undefined) {
      this.expanded.set(allContainerPointers(value));
    }
  }

  // ── Structured tree edits (return an error value, never throw) ──────────────
  /** Replace the value at `path`. */
  updateValueAt(path: JsonPath, value: JsonValue): ValidationError | null {
    return this.applyJsonPatch([{ op: 'replace', path: pathToPointer(path), value }]);
  }

  /** Change the type of the value at `path`, coercing the existing value. */
  changeTypeAt(path: JsonPath, type: JsonValueType): ValidationError | null {
    const current = getAtPath(this.json() ?? null, path);
    return this.updateValueAt(path, coerceToType(current ?? null, type));
  }

  /** Remove the node at `path`. */
  removeAt(path: JsonPath): ValidationError | null {
    if (path.length === 0) {
      return {
        path,
        message: 'Cannot remove the document root',
        severity: 'error',
        source: 'edit',
      };
    }
    return this.applyJsonPatch([{ op: 'remove', path: pathToPointer(path) }]);
  }

  /**
   * Rename an object member, preserving property order (RFC 6902 can't express
   * a rename, so we rebuild the parent object and replace it).
   */
  renameKeyAt(parentPath: JsonPath, oldKey: string, newKey: string): ValidationError | null {
    if (oldKey === newKey) {
      return null;
    }
    const parent = getAtPath(this.json() ?? null, parentPath);
    if (parent === undefined || !isJsonObject(parent)) {
      return {
        path: parentPath,
        message: 'Parent is not an object',
        severity: 'error',
        source: 'edit',
      };
    }
    if (Object.prototype.hasOwnProperty.call(parent, newKey)) {
      return {
        path: parentPath,
        message: `Key "${newKey}" already exists`,
        severity: 'error',
        source: 'edit',
      };
    }
    const rebuilt: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(parent)) {
      rebuilt[k === oldKey ? newKey : k] = v;
    }
    return this.applyJsonPatch([
      { op: 'replace', path: pathToPointer(parentPath), value: rebuilt },
    ]);
  }

  /** Append a child to the container at `path` (object key or array item). */
  appendChild(path: JsonPath, type: JsonValueType, key?: string): ValidationError | null {
    const container = getAtPath(this.json() ?? null, path) ?? null;
    const value = coerceToType(null, type);
    if (isJsonArray(container)) {
      return this.applyJsonPatch([{ op: 'add', path: `${pathToPointer(path)}/-`, value }]);
    }
    if (isJsonObject(container)) {
      const name = uniqueKey(container, key ?? 'newKey');
      return this.applyJsonPatch([{ op: 'add', path: `${pathToPointer([...path, name])}`, value }]);
    }
    return { path, message: 'Target is not a container', severity: 'error', source: 'edit' };
  }

  /** Duplicate the node at `path` next to itself. */
  duplicateAt(path: JsonPath): ValidationError | null {
    if (path.length === 0) {
      return { path, message: 'Cannot duplicate the root', severity: 'error', source: 'edit' };
    }
    const value = getAtPath(this.json() ?? null, path);
    if (value === undefined) {
      return { path, message: 'Nothing to duplicate', severity: 'error', source: 'edit' };
    }
    const parentPath = path.slice(0, -1);
    const lastKey = path[path.length - 1];
    const parent = getAtPath(this.json() ?? null, parentPath) ?? null;
    if (isJsonArray(parent)) {
      const index = Number(lastKey) + 1;
      return this.applyJsonPatch([
        { op: 'add', path: pathToPointer([...parentPath, index]), value },
      ]);
    }
    if (isJsonObject(parent)) {
      const name = uniqueKey(parent, `${lastKey}_copy`);
      return this.applyJsonPatch([
        { op: 'add', path: pathToPointer([...parentPath, name]), value },
      ]);
    }
    return { path, message: 'Parent is not a container', severity: 'error', source: 'edit' };
  }

  // ── Edits ─────────────────────────────────────────────────────────────────
  /** Set raw text (text mode). Records an undoable history entry. */
  setText(text: string): void {
    this.commit({ text });
  }

  /** Set a parsed JSON value. Records an undoable history entry. */
  setJson(json: JsonValue): void {
    this.commit({ json });
  }

  /**
   * Apply an RFC 6902 patch to the current JSON document. Records a compact
   * patch-based history entry. No-op (returns the error) if the doc is invalid
   * or the patch fails.
   */
  applyJsonPatch(patch: JsonPatch): ValidationError | null {
    const value = this.json();
    if (value === undefined) {
      return { path: [], message: 'Cannot patch invalid JSON', severity: 'error', source: 'patch' };
    }
    const res = applyPatch(value, patch);
    if (!res.ok) {
      return { path: [], message: res.error.message, severity: 'error', source: 'patch' };
    }
    const before = this._content();
    const after: JsonEditorContent = { json: res.value.doc };
    this._content.set(after);
    this.pushHistory({ before, after, patch });
    return null;
  }

  /** Commit new content, recording a history entry (with a diff patch if possible). */
  commit(next: JsonEditorContent): void {
    const before = this._content();
    const after = normalize(next);
    if (contentEqual(before, after)) {
      return;
    }
    this._content.set(after);
    this.pushHistory({ before, after, patch: tryDiff(before, after) });
  }

  // ── Text operations ─────────────────────────────────────────────────────────
  /** Beautify: re-serialize the parsed document with the active indentation. */
  format(): boolean {
    const value = this.json();
    if (value === undefined) {
      return false;
    }
    this.commit({ text: stringify(value, this.indentation()) });
    return true;
  }

  /** Compact: minify to single-line JSON. */
  compact(): boolean {
    const value = this.json();
    if (value === undefined) {
      return false;
    }
    this.commit({ text: JSON.stringify(value) });
    return true;
  }

  /** Repair malformed JSON; commits the repaired text when it succeeds. */
  repair(): RepairResult {
    const result = repairJson(this.text());
    if (result.changed && result.ok) {
      this.commit({ text: result.text });
    }
    return result;
  }

  // ── Undo / redo ───────────────────────────────────────────────────────────
  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) {
      return;
    }
    this._content.set(entry.before);
    this.redoStack.push(entry);
    this.refreshHistoryFlags();
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) {
      return;
    }
    this._content.set(entry.after);
    this.undoStack.push(entry);
    this.refreshHistoryFlags();
  }

  // ── Internals ───────────────────────────────────────────────────────────────
  private pushHistory(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.historyLimit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.refreshHistoryFlags();
  }

  private refreshHistoryFlags(): void {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function stringify(value: JsonValue, indentation: number | 'tab'): string {
  const indent = indentation === 'tab' ? '\t' : indentation;
  return JSON.stringify(value, null, indent);
}

/** Pick a key not already present in `obj`, suffixing with a counter if needed. */
function uniqueKey(obj: Record<string, JsonValue>, base: string): string {
  if (!Object.prototype.hasOwnProperty.call(obj, base)) {
    return base;
  }
  let i = 2;
  while (Object.prototype.hasOwnProperty.call(obj, `${base}${i}`)) {
    i++;
  }
  return `${base}${i}`;
}

/** Normalize content: ensure exactly one of `json`/`text` is present. */
function normalize(content: JsonEditorContent): JsonEditorContent {
  if (isTextContent(content)) {
    return { text: content.text };
  }
  return { json: content.json ?? null };
}

function contentEqual(a: JsonEditorContent, b: JsonEditorContent): boolean {
  const at = isTextContent(a);
  const bt = isTextContent(b);
  if (at !== bt) {
    return false;
  }
  if (at && bt) {
    return a.text === b.text;
  }
  return (
    JSON.stringify((a as { json: JsonValue }).json) ===
    JSON.stringify((b as { json: JsonValue }).json)
  );
}

/** Best-effort RFC 6902 diff between two contents (only when both parse). */
function tryDiff(before: JsonEditorContent, after: JsonEditorContent): JsonPatch | undefined {
  const bj = isTextContent(before) ? parseJson(before.text) : ok(before.json ?? null);
  const aj = isTextContent(after) ? parseJson(after.text) : ok(after.json ?? null);
  if (bj.ok && aj.ok) {
    return diffToPatch(bj.value, aj.value);
  }
  return undefined;
}

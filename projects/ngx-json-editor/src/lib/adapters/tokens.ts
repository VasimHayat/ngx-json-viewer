import { InjectionToken } from '@angular/core';
import {
  JsonValue,
  RepairResult,
  Result,
  SchemaDocument,
  ValidationError,
  createSchemaValidator,
  diffToPatch,
  queryJmespath,
  repairJson,
} from '@vasimhayat007/ngx-json-editor/core';
import { JsonPatchOperation } from '@vasimhayat007/ngx-json-editor/core';

/**
 * Adapter contracts and DI tokens. Every side-effecting capability the editor
 * needs — code editing, network, file, clipboard, querying — is reached through
 * one of these tokens so a host can replace it. The library never performs
 * implicit network/file/clipboard access (spec §11).
 */

// ── Code editor adapter (text mode) ─────────────────────────────────────────

/** A diagnostic to render in the text editor gutter. */
export interface EditorDiagnostic {
  readonly from: number;
  readonly to: number;
  readonly severity: 'error' | 'warning' | 'info';
  readonly message: string;
}

/** Options passed when mounting a code editor instance. */
export interface CodeEditorOptions {
  readonly parent: HTMLElement;
  readonly initialValue: string;
  readonly readOnly?: boolean;
  readonly dark?: boolean;
  readonly indentation?: number | 'tab';
  readonly onChange?: (value: string) => void;
  readonly onReady?: () => void;
  /** Reports the primary cursor position (1-based line/column). */
  readonly onCursor?: (line: number, column: number) => void;
}

/** Handle to a mounted code editor instance. */
export interface CodeEditorHandle {
  getValue(): string;
  setValue(value: string): void;
  setReadOnly(readOnly: boolean): void;
  setDark(dark: boolean): void;
  setDiagnostics(diagnostics: readonly EditorDiagnostic[]): void;
  focus(): void;
  destroy(): void;
}

/** Pluggable code editor engine (default: CodeMirror 6, lazy-loaded). */
export interface CodeEditorAdapter {
  mount(options: CodeEditorOptions): CodeEditorHandle;
}

/**
 * Optional override for the code editor engine. When not provided, the text
 * component lazy-loads the default CodeMirror 6 adapter so the engine stays out
 * of the main bundle for tree/table-only consumers.
 */
export const CODE_EDITOR_ADAPTER = new InjectionToken<CodeEditorAdapter | null>(
  'ngx-json-editor.CODE_EDITOR_ADAPTER',
  { providedIn: 'root', factory: () => null },
);

// ── Fetch adapter (load from URL) ───────────────────────────────────────────

/** Loads JSON text from a URL. Host-provided so the library makes no implicit calls. */
export interface FetchAdapter {
  fetchText(url: string): Promise<string>;
}

export const FETCH_ADAPTER = new InjectionToken<FetchAdapter>('ngx-json-editor.FETCH_ADAPTER', {
  providedIn: 'root',
  factory: () => ({
    async fetchText(url: string): Promise<string> {
      if (typeof fetch !== 'function') {
        throw new Error('No fetch available; provide a FETCH_ADAPTER');
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load ${url}: ${res.status}`);
      }
      return res.text();
    },
  }),
});

// ── File adapter (open / download) ──────────────────────────────────────────

/** Opens a local file picker and downloads files. */
export interface FileAdapter {
  openFile(accept?: string): Promise<{ name: string; text: string } | null>;
  download(filename: string, text: string, mime?: string): void;
}

export const FILE_ADAPTER = new InjectionToken<FileAdapter>('ngx-json-editor.FILE_ADAPTER', {
  providedIn: 'root',
  factory: () => createDomFileAdapter(),
});

/** Default DOM-based file adapter (input[type=file] + anchor download). */
export function createDomFileAdapter(): FileAdapter {
  return {
    openFile(accept = 'application/json,.json'): Promise<{ name: string; text: string } | null> {
      return new Promise((resolve) => {
        if (typeof document === 'undefined') {
          resolve(null);
          return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, text: String(reader.result ?? '') });
          reader.onerror = () => resolve(null);
          reader.readAsText(file);
        };
        input.click();
      });
    },
    download(filename: string, text: string, mime = 'application/json'): void {
      if (typeof document === 'undefined') {
        return;
      }
      const blob = new Blob([text], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  };
}

// ── Clipboard adapter ───────────────────────────────────────────────────────

/** Reads/writes the system clipboard. */
export interface ClipboardAdapter {
  writeText(text: string): Promise<void>;
  readText(): Promise<string>;
}

export const CLIPBOARD_ADAPTER = new InjectionToken<ClipboardAdapter>(
  'ngx-json-editor.CLIPBOARD_ADAPTER',
  {
    providedIn: 'root',
    factory: () => ({
      async writeText(text: string): Promise<void> {
        await navigator?.clipboard?.writeText(text);
      },
      async readText(): Promise<string> {
        return (await navigator?.clipboard?.readText()) ?? '';
      },
    }),
  },
);

// ── Query engine (Transform) ────────────────────────────────────────────────

/** Evaluates a query against a document (default: JMESPath). */
export interface QueryEngine {
  query(data: JsonValue, expression: string): Result<JsonValue, Error>;
}

export const QUERY_ENGINE = new InjectionToken<QueryEngine>('ngx-json-editor.QUERY_ENGINE', {
  providedIn: 'root',
  factory: () => ({ query: queryJmespath }),
});

// ── Heavy compute (off-main-thread offloading) ──────────────────────────────

/**
 * Async strategy for expensive one-shot operations (transform / diff / repair /
 * schema validation). The default runs on the main thread; a host can provide a
 * Web Worker-backed implementation for large documents. The `core` logic is
 * framework- and DOM-free, so it runs unchanged inside a worker — see
 * ARCHITECTURE.md §6 for the worker recipe and `limits.workerThresholdBytes`.
 */
export interface HeavyCompute {
  transform(data: JsonValue, expression: string): Promise<Result<JsonValue, Error>>;
  diff(left: JsonValue, right: JsonValue): Promise<readonly JsonPatchOperation[]>;
  repair(text: string): Promise<RepairResult>;
  validate(data: JsonValue, schema: SchemaDocument): Promise<readonly ValidationError[]>;
}

export const HEAVY_COMPUTE = new InjectionToken<HeavyCompute>('ngx-json-editor.HEAVY_COMPUTE', {
  providedIn: 'root',
  factory: () => ({
    transform: (data, expr) => Promise.resolve(queryJmespath(data, expr)),
    diff: (left, right) => Promise.resolve(diffToPatch(left, right)),
    repair: (text) => Promise.resolve(repairJson(text)),
    validate: (data, schema) => Promise.resolve(createSchemaValidator(schema).validate(data)),
  }),
});

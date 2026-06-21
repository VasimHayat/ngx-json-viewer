import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import {
  JsonPath,
  JsonValue,
  ValidationError,
  getValueType,
  isContainer,
} from 'ngx-json-editor/core';
import {
  DEFAULT_I18N,
  EditorI18n,
  EditorMode,
  JsonEditorContent,
  NgxJsonEditorConfig,
  OnChangeStatus,
  RepairResult,
  ValidatorFn,
  isTextContent,
} from '../../models';
import { JsonSchema } from '../../models/schema';

/**
 * `<ngx-json-editor>` — the single primary component of the library.
 *
 * Phase 0 renders the editor shell (toolbar, body, status bar) and establishes
 * the complete, stable public API surface (signal inputs/outputs/model and the
 * imperative methods). Tree/text/table projections and the signal-based
 * EditorStore are layered in by subsequent phases; the API does not change.
 */
@Component({
  selector: 'ngx-json-editor',
  imports: [ButtonModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ngx-json-editor.component.html',
  styleUrl: './ngx-json-editor.component.scss',
  host: {
    class: 'nje-root',
    '[class.nje-theme-dark]': 'isDark()',
    '[attr.data-mode]': 'mode()',
  },
})
export class NgxJsonEditorComponent {
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly bodyRef = viewChild<ElementRef<HTMLElement>>('body');

  // ── Two-way bindable content ──────────────────────────────────────────────
  /** Editor content; supply `{ json }` or `{ text }`. Defaults to an empty doc. */
  readonly content = model<JsonEditorContent>({ json: null });

  // ── Behavior inputs ───────────────────────────────────────────────────────
  readonly mode = input<EditorMode>('tree');
  readonly readOnly = input<boolean>(false);
  readonly schema = input<JsonSchema | null>(null);
  readonly schemaRefs = input<Record<string, JsonSchema> | null>(null);
  readonly validator = input<ValidatorFn | null>(null);
  readonly indentation = input<number | 'tab'>(2);
  readonly theme = input<'light' | 'dark' | 'auto'>('auto');
  readonly i18n = input<Partial<EditorI18n>>({});
  readonly config = input<NgxJsonEditorConfig>({});

  // ── Events ────────────────────────────────────────────────────────────────
  /**
   * Rich change event carrying the new content, current validation errors, and
   * the RFC 6902 patch that produced the change.
   *
   * NOTE: this is exposed as `(documentChange)` rather than `(contentChange)`
   * because an Angular `model('content')` already auto-generates a
   * `contentChange` output (used by the `[(content)]` two-way binding, emitting
   * `JsonEditorContent`). Declaring a second `contentChange` would collide, and
   * a plain `change` is forbidden as a native DOM event name. See ARCHITECTURE.md.
   */
  readonly documentChange = output<OnChangeStatus>();
  readonly modeChange = output<EditorMode>();
  readonly errorsChange = output<readonly ValidationError[]>();
  readonly selectionChange = output<JsonPath | null>();
  readonly ready = output<void>();

  // ── Internal reactive state ───────────────────────────────────────────────
  /** Active mode (seeded from the input, switchable via the toolbar). */
  readonly activeMode = signal<EditorMode>('tree');
  private readonly errors = signal<readonly ValidationError[]>([]);

  /** Merged i18n map (defaults + consumer overrides). */
  readonly strings = computed<EditorI18n>(() => ({ ...DEFAULT_I18N, ...this.i18n() }));

  /** Resolved dark-mode flag from the `theme` input (auto → OS preference). */
  readonly isDark = computed<boolean>(() => {
    const t = this.theme();
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  });

  /** Indentation rendered as the string passed to `JSON.stringify`. */
  readonly indentString = computed<string | number>(() => {
    const ind = this.indentation();
    return ind === 'tab' ? '\t' : ind;
  });

  /** The current document as a parsed value (best-effort; null on parse error). */
  readonly currentJson = computed<JsonValue | undefined>(() => {
    const c = this.content();
    if (!c) return undefined;
    if (isTextContent(c)) {
      try {
        return JSON.parse(c.text) as JsonValue;
      } catch {
        return undefined;
      }
    }
    return c.json ?? null;
  });

  /** Pretty-printed text view of the current document (placeholder body). */
  readonly displayText = computed<string>(() => {
    const c = this.content();
    if (!c) return '';
    if (isTextContent(c)) return c.text;
    try {
      return JSON.stringify(c.json, null, this.indentString());
    } catch {
      return String(c.json);
    }
  });

  /** True when the document is empty/blank. */
  readonly isEmpty = computed<boolean>(() => {
    const v = this.currentJson();
    if (v === undefined) return this.displayText().trim().length === 0;
    if (v === null) return true;
    if (isContainer(v)) return Object.keys(v).length === 0;
    return false;
  });

  constructor() {
    // Seed active mode from the input on first read.
    queueMicrotask(() => {
      this.activeMode.set(this.mode());
      this.ready.emit();
    });
  }

  // ── Toolbar handlers ──────────────────────────────────────────────────────
  /** Switch the active editor mode. */
  setMode(next: EditorMode): void {
    if (next === this.activeMode()) return;
    this.activeMode.set(next);
    this.modeChange.emit(next);
  }

  // ── Imperative API (call via a template ref) ──────────────────────────────
  /** Expand every container node (tree mode). No-op until tree mode lands. */
  expandAll(): void {
    /* Implemented in Phase 3 (tree mode). */
  }

  /** Collapse every container node (tree mode). No-op until tree mode lands. */
  collapseAll(): void {
    /* Implemented in Phase 3 (tree mode). */
  }

  /** Beautify the document with the configured indentation. */
  format(): void {
    const json = this.currentJson();
    if (json === undefined) return;
    this.commit({ json });
  }

  /** Minify the document to single-line JSON. */
  compact(): void {
    const json = this.currentJson();
    if (json === undefined) return;
    this.commit({ text: JSON.stringify(json) });
  }

  /** Attempt to repair malformed JSON. Full implementation arrives in Phase 1. */
  repair(): RepairResult {
    const text = this.displayText();
    try {
      JSON.parse(text);
      return { ok: true, text, changed: false, applied: [] };
    } catch (e) {
      return {
        ok: false,
        text,
        changed: false,
        applied: [],
        error: (e as Error).message,
      };
    }
  }

  /** Undo the last change. Wired to the patch history in Phase 2. */
  undo(): void {
    /* Implemented in Phase 2 (history). */
  }

  /** Redo the last undone change. Wired to the patch history in Phase 2. */
  redo(): void {
    /* Implemented in Phase 2 (history). */
  }

  /** Move keyboard focus into the editor body. */
  focus(): void {
    (this.bodyRef()?.nativeElement ?? this.hostRef.nativeElement).focus();
  }

  /** Run validation and return findings (does not throw). */
  validate(): readonly ValidationError[] {
    return this.errors();
  }

  /** Get the current content. */
  get(): JsonEditorContent {
    return this.content() ?? { json: null };
  }

  /** Replace the content. */
  set(c: JsonEditorContent): void {
    this.commit(c);
  }

  /** Apply a JMESPath query and return the result. Implemented in Phase 1. */
  transform(_query: string): JsonEditorContent {
    return this.get();
  }

  // ── Internal ──────────────────────────────────────────────────────────────
  private commit(next: JsonEditorContent): void {
    this.content.set(next);
    this.documentChange.emit({ content: next, errors: this.errors() });
  }

  /** Resolve a value's CSS type class (used by the placeholder + later phases). */
  protected typeClass(value: JsonValue): string {
    return `nje-type-${getValueType(value)}`;
  }
}

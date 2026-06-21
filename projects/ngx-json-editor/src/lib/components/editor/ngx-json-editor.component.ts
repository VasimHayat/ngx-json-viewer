import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { AutofocusDirective } from '../../directives/autofocus.directive';
import { IconComponent } from '../icon/icon.component';
import { JsonPath, JsonValue, ValidationError, pathToDisplay } from 'ngx-json-editor/core';
import { CLIPBOARD_ADAPTER, FILE_ADAPTER, QUERY_ENGINE } from '../../adapters/tokens';
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
import { EditorStore } from '../../state/editor-store';
import { TextModeComponent } from '../text/text-mode.component';
import { TreeModeComponent } from '../tree/tree-mode.component';
import { TableModeComponent } from '../table/table-mode.component';
import { DialogsComponent } from '../dialogs/dialogs.component';
import { CompareComponent } from '../dialogs/compare.component';

/**
 * `<ngx-json-editor>` — the single primary component of the library.
 *
 * Owns a per-instance signal {@link EditorStore} (the single source of truth)
 * and projects it through the tree / text / table mode components. The public
 * API (signal inputs/outputs, two-way `content` model, imperative methods) is
 * stable; modes are layered in across phases.
 */
@Component({
  selector: 'ngx-json-editor',
  imports: [
    FormsModule,
    AutofocusDirective,
    TooltipModule,
    IconComponent,
    TextModeComponent,
    TreeModeComponent,
    TableModeComponent,
    DialogsComponent,
    CompareComponent,
  ],
  providers: [EditorStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ngx-json-editor.component.html',
  styleUrl: './ngx-json-editor.component.scss',
  host: {
    class: 'nje-root',
    '[class.nje-theme-dark]': 'isDark()',
    '[class.nje-fullscreen]': 'fullscreen()',
    '[attr.data-mode]': 'store.mode()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class NgxJsonEditorComponent {
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly textMode = viewChild(TextModeComponent);
  private readonly dialogs = viewChild(DialogsComponent);
  private readonly compareDialog = viewChild(CompareComponent);
  private readonly queryEngine = inject(QUERY_ENGINE);
  private readonly fileAdapter = inject(FILE_ADAPTER);
  private readonly clipboard = inject(CLIPBOARD_ADAPTER);
  /** The per-instance store (exposed to the template). */
  protected readonly store = inject(EditorStore);

  /** Whether the find bar is open. */
  readonly searchOpen = signal<boolean>(false);
  /** Whether this pane is maximized. */
  readonly fullscreen = signal<boolean>(false);
  /** Replacement text for text-mode search & replace. */
  protected replaceText = '';

  /** Optional document title shown in the green menu bar (used by the workspace). */
  readonly title = input<string>('');
  /** Show the green menu bar (title + document operations). */
  readonly menuBar = input<boolean>(true);

  // ── Two-way bindable content ──────────────────────────────────────────────
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
   * Rich change event: `{ content, errors, patch }`. Named `documentChange`
   * (not `contentChange`) to avoid colliding with the `model('content')`
   * auto-output used by `[(content)]`. See ARCHITECTURE.md.
   */
  readonly documentChange = output<OnChangeStatus>();
  readonly modeChange = output<EditorMode>();
  readonly errorsChange = output<readonly ValidationError[]>();
  readonly selectionChange = output<JsonPath | null>();
  readonly ready = output<void>();

  // ── Derived / template state ──────────────────────────────────────────────
  readonly strings = computed<EditorI18n>(() => ({ ...DEFAULT_I18N, ...this.i18n() }));

  readonly isDark = computed<boolean>(() => {
    const t = this.theme();
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  });

  /** Effective feature toggles (consumer config merged over defaults = on). */
  readonly features = computed(() => this.config().features ?? {});
  readonly availableModes = computed<readonly EditorMode[]>(
    () => this.features().modes ?? ['tree', 'text', 'table'],
  );

  /** Human-readable selection path for the status bar. */
  readonly selectionLabel = computed<string>(() => {
    const sel = this.store.selection();
    return sel ? pathToDisplay(sel) : '';
  });

  private lastEmittedContent: JsonEditorContent | undefined;
  private lastEmittedMode: EditorMode | undefined;

  constructor() {
    // ── Inputs → store ──────────────────────────────────────────────────────
    effect(() => this.store.setReadOnly(this.readOnly()));
    effect(() => this.store.setIndentation(this.indentation()));
    effect(() => this.store.setSchema(this.schema(), this.schemaRefs()));
    effect(() => this.store.setValidator(this.validator()));
    effect(() => {
      const limit = this.config().limits?.historyLimit;
      if (limit) {
        this.store.setHistoryLimit(limit);
      }
    });
    effect(() => this.store.setMode(this.mode()));

    // ── Model content → store (external/host updates) ──────────────────────
    effect(() => {
      const incoming = this.content();
      if (!incoming) {
        return;
      }
      const current = untracked(() => this.store.content());
      if (!sameContent(incoming, current)) {
        this.store.replaceDocument(incoming);
      }
    });

    // ── Store content → model + documentChange ─────────────────────────────
    effect(() => {
      const c = this.store.content();
      const modelVal = untracked(() => this.content());
      if (!sameContent(c, modelVal ?? { json: null })) {
        this.content.set(c);
      }
      const prev = this.lastEmittedContent;
      if (prev === undefined) {
        this.lastEmittedContent = c;
        return;
      }
      if (!sameContent(c, prev)) {
        this.lastEmittedContent = c;
        this.documentChange.emit({
          content: c,
          errors: untracked(() => this.store.errors()),
          patch: undefined,
        });
      }
    });

    // ── Store → output events ───────────────────────────────────────────────
    effect(() => this.errorsChange.emit(this.store.errors()));
    effect(() => this.selectionChange.emit(this.store.selection()));
    effect(() => {
      const m = this.store.mode();
      if (this.lastEmittedMode === undefined) {
        this.lastEmittedMode = m;
        return;
      }
      if (m !== this.lastEmittedMode) {
        this.lastEmittedMode = m;
        this.modeChange.emit(m);
      }
    });

    // Keep the dialogs' i18n in sync with the editor's merged strings.
    effect(() => {
      const dialogs = this.dialogs();
      if (dialogs) {
        dialogs.strings.set(this.strings());
      }
    });

    queueMicrotask(() => this.ready.emit());
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  /**
   * Global shortcuts. Skipped when focus is inside the CodeMirror editor (it
   * owns its own undo/redo/find keymap) or a plain input. See README.
   *
   * Ctrl/Cmd+Z undo · Ctrl/Cmd+Shift+Z / Ctrl+Y redo · Ctrl/Cmd+F find ·
   * Alt+Shift+F format · Alt+Shift+C compact.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const inCodeMirror = !!target?.closest?.('.cm-editor');
    const inField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (event.altKey && event.shiftKey && key === 'f') {
      event.preventDefault();
      this.format();
      return;
    }
    if (event.altKey && event.shiftKey && key === 'c') {
      event.preventDefault();
      this.compact();
      return;
    }
    if (!mod || inCodeMirror) {
      return;
    }
    if (key === 'z' && !event.shiftKey) {
      if (inField) return;
      event.preventDefault();
      this.undo();
    } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
      if (inField) return;
      event.preventDefault();
      this.redo();
    } else if (key === 'f') {
      event.preventDefault();
      if (!this.searchOpen()) {
        this.toggleSearch();
      }
    }
  }

  // ── Toolbar handlers ──────────────────────────────────────────────────────
  setMode(next: EditorMode): void {
    this.store.setMode(next);
  }

  // ── Search ────────────────────────────────────────────────────────────────
  toggleSearch(): void {
    const open = !this.searchOpen();
    this.searchOpen.set(open);
    if (!open) {
      this.store.clearSearch();
    }
  }

  onSearchInput(value: string): void {
    this.store.setSearch(value);
  }

  nextMatch(): void {
    this.store.nextMatch();
  }

  prevMatch(): void {
    this.store.prevMatch();
  }

  replaceAll(): void {
    this.store.replaceAllInText(this.store.searchQuery(), this.replaceText);
  }

  // ── Document operations ─────────────────────────────────────────────────
  /** Reset to an empty document. */
  newDocument(): void {
    this.store.replaceDocument({ text: '' });
  }

  /** Toggle maximizing this pane to fill the viewport. */
  toggleFullscreen(): void {
    this.fullscreen.update((v) => !v);
  }

  /** Format from the "format the JSON?" prompt. */
  acceptFormatPrompt(): void {
    this.store.format();
    this.store.dismissFormatPrompt();
  }

  /** Open a local .json file via the injected FILE_ADAPTER. */
  async openFile(): Promise<void> {
    const file = await this.fileAdapter.openFile();
    if (file) {
      this.store.replaceDocument({ text: file.text });
    }
  }

  /** Download the current document as a .json file. */
  download(): void {
    this.fileAdapter.download('document.json', this.store.text());
  }

  /** Copy the whole document to the clipboard. */
  copyDocument(): void {
    void this.clipboard.writeText(this.store.text());
  }

  openImport(): void {
    this.dialogs()?.openImport();
  }

  openCompare(): void {
    this.compareDialog()?.open(this.store.json() ?? null);
  }

  /** Handle a file dropped onto the editor body (drag-drop import). */
  onFileDrop(event: DragEvent): void {
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return; // not a file drop (e.g. internal tree drag) — ignore
    }
    event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => this.store.replaceDocument({ text: String(reader.result ?? '') });
    reader.readAsText(file);
  }

  onBodyDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types?.includes('Files')) {
      event.preventDefault();
    }
  }

  // ── Dialogs ─────────────────────────────────────────────────────────────
  openSort(): void {
    this.dialogs()?.openSort();
  }

  openFilter(): void {
    this.dialogs()?.openFilter();
  }

  openTransform(): void {
    this.dialogs()?.openTransform();
  }

  // ── Imperative API (call via a template ref) ──────────────────────────────
  expandAll(): void {
    this.store.expandAllContainers();
  }

  collapseAll(): void {
    this.store.setExpanded([]);
  }

  format(): void {
    this.store.format();
  }

  compact(): void {
    this.store.compact();
  }

  repair(): RepairResult {
    return this.store.repair();
  }

  undo(): void {
    this.store.undo();
  }

  redo(): void {
    this.store.redo();
  }

  focus(): void {
    const tm = this.textMode();
    if (tm) {
      tm.focus();
    } else {
      this.hostRef.nativeElement.focus();
    }
  }

  validate(): readonly ValidationError[] {
    return this.store.errors();
  }

  get(): JsonEditorContent {
    return this.store.content();
  }

  set(c: JsonEditorContent): void {
    this.store.replaceDocument(c);
  }

  /** Select a path, expanding ancestors and switching to tree mode to show it. */
  selectPath(path: JsonPath): void {
    if (this.store.mode() === 'text') {
      this.store.setMode('tree');
    }
    this.store.revealPath(path);
  }

  /** Open the Transform dialog. */
  transformDialog(): void {
    this.openTransform();
  }

  transform(query: string): JsonEditorContent {
    const json = this.store.json();
    if (json === undefined) {
      return this.get();
    }
    const result = this.queryEngine.query(json, query);
    return result.ok ? { json: result.value } : this.get();
  }

  // ── Template helpers ────────────────────────────────────────────────────
  protected modeLabel(m: EditorMode): string {
    const s = this.strings();
    return m === 'tree' ? s.modeTree : m === 'text' ? s.modeText : s.modeTable;
  }
}

/** Structural equality for two editor contents (text verbatim; json by value). */
function sameContent(a: JsonEditorContent, b: JsonEditorContent): boolean {
  const at = isTextContent(a);
  const bt = isTextContent(b);
  if (at !== bt) {
    return false;
  }
  if (at && bt) {
    return a.text === b.text;
  }
  const aj = (a as { json: JsonValue }).json;
  const bj = (b as { json: JsonValue }).json;
  return JSON.stringify(aj) === JSON.stringify(bj);
}

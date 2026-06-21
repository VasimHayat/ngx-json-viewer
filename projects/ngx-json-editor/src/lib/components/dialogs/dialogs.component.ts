import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FilterOperator, JsonValue, SortBy, buildJmespathQuery } from '@vasimhayat007/ngx-json-editor/core';
import { EditorStore } from '../../state/editor-store';
import {
  CLIPBOARD_ADAPTER,
  FETCH_ADAPTER,
  FILE_ADAPTER,
  QUERY_ENGINE,
} from '../../adapters/tokens';
import { DEFAULT_I18N, EditorI18n } from '../../models/i18n';

/**
 * Hosts the Sort, Filter, and Transform dialogs (PrimeNG Dialog primitives).
 * The editor toolbar opens them via the public `open*` methods. Filter and
 * Transform run through the injected `QUERY_ENGINE` (JMESPath by default) with a
 * live preview before applying.
 */
@Component({
  selector: 'ngx-json-dialogs',
  imports: [FormsModule, DialogModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialogs.component.html',
  styleUrl: './dialogs.component.scss',
})
export class DialogsComponent {
  protected readonly store = inject(EditorStore);
  private readonly query = inject(QUERY_ENGINE);
  private readonly clipboard = inject(CLIPBOARD_ADAPTER);
  private readonly fetchAdapter = inject(FETCH_ADAPTER);
  private readonly fileAdapter = inject(FILE_ADAPTER);

  /** i18n strings; the parent editor overrides with its merged map. */
  readonly strings = signal<EditorI18n>(DEFAULT_I18N);

  // ── Sort dialog ───────────────────────────────────────────────────────────
  protected readonly sortVisible = signal(false);
  protected sortBy: SortBy = 'key';
  protected sortDirection: 'asc' | 'desc' = 'asc';
  protected sortRecursive = false;

  openSort(): void {
    this.sortVisible.set(true);
  }

  applySort(): void {
    this.store.sortDocument({
      by: this.sortBy,
      direction: this.sortDirection,
      recursive: this.sortRecursive,
    });
    this.sortVisible.set(false);
  }

  // ── Filter dialog ───────────────────────────────────────────────────────
  protected readonly filterVisible = signal(false);
  protected filterField = '';
  protected filterOperator: FilterOperator = '==';
  protected filterValue = '';
  protected readonly operators: FilterOperator[] = [
    '==',
    '!=',
    '<',
    '<=',
    '>',
    '>=',
    'contains',
    'starts_with',
    'ends_with',
  ];

  protected readonly filterPreview = computed<string>(() => this.runPreview(this.filterExpr()));

  openFilter(): void {
    this.filterVisible.set(true);
  }

  applyFilter(): void {
    const result = this.runQuery(this.filterExpr());
    if (result.ok) {
      this.store.setJson(result.value);
      this.filterVisible.set(false);
    }
  }

  private filterExpr(): string {
    return buildJmespathQuery({
      filter: { field: this.filterField, operator: this.filterOperator, value: this.filterValue },
    });
  }

  // ── Transform dialog ──────────────────────────────────────────────────────
  protected readonly transformVisible = signal(false);
  protected transformQuery = '@';
  // Builder fields (compose into a JMESPath query).
  protected tFilterField = '';
  protected tFilterOperator: FilterOperator = '==';
  protected tFilterValue = '';
  protected tSortField = '';
  protected tSortDir: 'asc' | 'desc' = 'asc';
  protected tProjection = '';

  protected readonly transformPreview = computed<string>(() =>
    this.runPreview(this.transformQuery),
  );

  openTransform(): void {
    this.transformQuery = '@';
    this.transformVisible.set(true);
  }

  /** Compose the builder fields into the JMESPath query box. */
  buildFromFields(): void {
    this.transformQuery = buildJmespathQuery({
      filter: this.tFilterValue
        ? { field: this.tFilterField, operator: this.tFilterOperator, value: this.tFilterValue }
        : undefined,
      sort: this.tSortField ? { field: this.tSortField, direction: this.tSortDir } : undefined,
      projection: this.tProjection
        ? this.tProjection
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    });
  }

  applyTransform(): void {
    const result = this.runQuery(this.transformQuery);
    if (result.ok) {
      this.store.setJson(result.value);
      this.transformVisible.set(false);
    }
  }

  copyTransform(): void {
    const result = this.runQuery(this.transformQuery);
    if (result.ok) {
      void this.clipboard.writeText(JSON.stringify(result.value, null, 2));
    }
  }

  // ── Import dialog (paste / URL / file) ──────────────────────────────────
  protected readonly importVisible = signal(false);
  protected importText = '';
  protected importUrl = '';
  protected readonly importError = signal<string>('');

  openImport(): void {
    this.importText = '';
    this.importUrl = '';
    this.importError.set('');
    this.importVisible.set(true);
  }

  importFromText(): void {
    if (this.importText.trim() === '') {
      return;
    }
    this.store.replaceDocument({ text: this.importText });
    this.importVisible.set(false);
  }

  async importFromUrl(): Promise<void> {
    if (this.importUrl.trim() === '') {
      return;
    }
    this.importError.set('');
    try {
      const text = await this.fetchAdapter.fetchText(this.importUrl.trim());
      this.store.replaceDocument({ text });
      this.importVisible.set(false);
    } catch (e) {
      this.importError.set((e as Error).message);
    }
  }

  async importFromFile(): Promise<void> {
    const file = await this.fileAdapter.openFile();
    if (file) {
      this.store.replaceDocument({ text: file.text });
      this.importVisible.set(false);
    }
  }

  // ── Shared query helpers ──────────────────────────────────────────────────
  private runQuery(expr: string): { ok: true; value: JsonValue } | { ok: false; error: string } {
    const json = this.store.json();
    if (json === undefined) {
      return { ok: false, error: 'Document is not valid JSON' };
    }
    const res = this.query.query(json, expr);
    return res.ok ? { ok: true, value: res.value } : { ok: false, error: res.error.message };
  }

  private runPreview(expr: string): string {
    const res = this.runQuery(expr);
    if (!res.ok) {
      return `⚠ ${res.error}`;
    }
    const text = JSON.stringify(res.value, null, 2);
    return text.length > 4000 ? text.slice(0, 4000) + '\n…' : text;
  }
}

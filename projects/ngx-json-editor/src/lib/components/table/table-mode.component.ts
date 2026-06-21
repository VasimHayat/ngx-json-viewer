import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  JsonValue,
  JsonValueType,
  getValueType,
  isJsonArray,
  tableModel,
} from '@vasimhayat007/ngx-json-editor/core';
import { EditorStore } from '../../state/editor-store';
import { AutofocusDirective } from '../../directives/autofocus.directive';

interface CellEdit {
  readonly row: number;
  readonly col: string;
}

/**
 * Table mode: a virtualized grid for an array of objects. Columns are the union
 * of keys; scalar cells edit inline, container cells show a summary and select
 * (drill-in for nested editing happens in tree mode). Falls back to a notice
 * when the document is not a non-empty array.
 */
@Component({
  selector: 'ngx-json-table',
  imports: [ScrollingModule, FormsModule, AutofocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './table-mode.component.html',
  styleUrl: './table-mode.component.scss',
})
export class TableModeComponent {
  protected readonly store = inject(EditorStore);

  protected readonly array = computed<JsonValue[] | null>(() => {
    const json = this.store.json() ?? null;
    return isJsonArray(json) ? json : null;
  });

  protected readonly model = computed(() => tableModel(this.array() ?? []));
  protected readonly columns = computed<readonly string[]>(() => this.model().columns);
  protected readonly rows = computed<JsonValue[]>(() => this.array() ?? []);

  protected readonly editing = signal<CellEdit | null>(null);
  protected draft = '';
  protected readonly rowHeight = 30;

  protected cellValue(rowIndex: number, col: string): JsonValue | undefined {
    const item = this.rows()[rowIndex];
    if (!this.model().objectRows) {
      return item;
    }
    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      return (item as Record<string, JsonValue>)[col];
    }
    return undefined;
  }

  protected cellType(rowIndex: number, col: string): JsonValueType | 'empty' {
    const v = this.cellValue(rowIndex, col);
    return v === undefined ? 'empty' : getValueType(v);
  }

  protected cellDisplay(rowIndex: number, col: string): string {
    const v = this.cellValue(rowIndex, col);
    if (v === undefined) return '';
    if (v === null) return 'null';
    if (Array.isArray(v)) return `[${v.length}]`;
    if (typeof v === 'object') return `{${Object.keys(v).length}}`;
    return String(v);
  }

  protected isScalarCell(rowIndex: number, col: string): boolean {
    const t = this.cellType(rowIndex, col);
    return t === 'string' || t === 'number' || t === 'boolean' || t === 'null';
  }

  protected cellPath(rowIndex: number, col: string): (string | number)[] {
    return this.model().objectRows ? [rowIndex, col] : [rowIndex];
  }

  protected isEditing(rowIndex: number, col: string): boolean {
    const e = this.editing();
    return !!e && e.row === rowIndex && e.col === col;
  }

  protected beginEdit(rowIndex: number, col: string, event: Event): void {
    if (this.store.readOnly() || !this.isScalarCell(rowIndex, col)) return;
    event.stopPropagation();
    const v = this.cellValue(rowIndex, col);
    this.draft = v === null || v === undefined ? '' : String(v);
    this.editing.set({ row: rowIndex, col });
  }

  protected commit(rowIndex: number, col: string): void {
    if (!this.isEditing(rowIndex, col)) return;
    const prev = this.cellValue(rowIndex, col);
    let value: JsonValue = this.draft;
    if (typeof prev === 'number') {
      const n = Number(this.draft);
      value = Number.isFinite(n) ? n : prev;
    } else if (typeof prev === 'boolean') {
      value = this.draft === 'true';
    }
    this.store.updateValueAt(this.cellPath(rowIndex, col), value);
    this.editing.set(null);
  }

  protected onEditKeydown(rowIndex: number, col: string, event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commit(rowIndex, col);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.editing.set(null);
    }
  }

  protected selectRow(rowIndex: number): void {
    this.store.setSelection([rowIndex]);
  }

  protected removeRow(rowIndex: number, event: Event): void {
    event.stopPropagation();
    this.store.removeAt([rowIndex]);
  }

  protected trackRow(index: number): number {
    return index;
  }
}

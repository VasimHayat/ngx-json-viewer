import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  JsonPath,
  JsonValue,
  ValidationError,
  isPathPrefix,
  pathToPointer,
} from 'ngx-json-editor/core';
import { EditorStore } from '../../state/editor-store';
import { TreeRow, containerSummary, flattenTree } from '../../state/tree-model';
import { AutofocusDirective } from '../../directives/autofocus.directive';

interface EditTarget {
  readonly pointer: string;
  readonly kind: 'key' | 'value';
}

/**
 * Tree mode: a virtualized, hierarchical view of the document (CDK virtual
 * scroll). Expand/collapse, selection, inline key/value editing, and per-error
 * markers. Type changes, context menu, drag-drop, and multi-select build on
 * this foundation.
 */
@Component({
  selector: 'ngx-json-tree',
  imports: [ScrollingModule, FormsModule, AutofocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree-mode.component.html',
  styleUrl: './tree-mode.component.scss',
})
export class TreeModeComponent {
  protected readonly store = inject(EditorStore);

  /** Visible rows: a flattened projection of json + expansion state. */
  protected readonly rows = computed<TreeRow[]>(() => {
    const value = this.store.json();
    if (value === undefined) {
      return [];
    }
    return flattenTree(value, this.store.expanded());
  });

  /** Errors indexed by pointer, for inline markers. */
  protected readonly errorsByPointer = computed<ReadonlyMap<string, ValidationError[]>>(() => {
    const map = new Map<string, ValidationError[]>();
    for (const e of this.store.errors()) {
      const key = pathToPointer(e.path);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  });

  protected readonly editing = signal<EditTarget | null>(null);
  protected draft = '';

  protected readonly rowHeight = 24;

  protected readonly summary = containerSummary;

  // ── Interaction ─────────────────────────────────────────────────────────
  protected toggle(row: TreeRow, event: Event): void {
    event.stopPropagation();
    if (row.expandable) {
      this.store.toggleExpanded(row.path);
    }
  }

  protected select(row: TreeRow): void {
    this.store.setSelection(row.path);
  }

  /** Basic keyboard navigation on a row (full roving tabindex lands in Phase 6). */
  protected onRowKeydown(row: TreeRow, event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (row.expandable) {
          this.store.toggleExpanded(row.path);
        } else {
          this.select(row);
        }
        break;
      case 'ArrowRight':
        if (row.expandable && !row.expanded) {
          event.preventDefault();
          this.store.toggleExpanded(row.path);
        }
        break;
      case 'ArrowLeft':
        if (row.expandable && row.expanded) {
          event.preventDefault();
          this.store.toggleExpanded(row.path);
        }
        break;
      default:
        break;
    }
  }

  protected isSelected(row: TreeRow): boolean {
    const sel = this.store.selection();
    return !!sel && pathToPointer(sel) === row.pointer;
  }

  protected hasError(row: TreeRow): boolean {
    const direct = this.errorsByPointer().has(row.pointer);
    if (direct) {
      return true;
    }
    // A container shows an error marker if a descendant has one.
    for (const e of this.store.errors()) {
      if (isPathPrefix(row.path, e.path) && e.path.length > row.path.length) {
        return true;
      }
    }
    return false;
  }

  protected isEditing(row: TreeRow, kind: 'key' | 'value'): boolean {
    const e = this.editing();
    return !!e && e.pointer === row.pointer && e.kind === kind;
  }

  // ── Value display ─────────────────────────────────────────────────────────
  protected displayValue(row: TreeRow): string {
    switch (row.type) {
      case 'string':
        return row.value as string;
      case 'number':
      case 'boolean':
        return String(row.value);
      case 'null':
        return 'null';
      default:
        return '';
    }
  }

  protected keyLabel(row: TreeRow): string {
    return row.key === null ? '' : String(row.key);
  }

  protected isEditableKey(row: TreeRow): boolean {
    return typeof row.key === 'string' && !this.store.readOnly();
  }

  protected isEditableValue(row: TreeRow): boolean {
    return (
      !this.store.readOnly() &&
      (row.type === 'string' || row.type === 'number' || row.type === 'null')
    );
  }

  // ── Editing ─────────────────────────────────────────────────────────────
  protected beginEditValue(row: TreeRow, event: Event): void {
    if (!this.isEditableValue(row)) {
      return;
    }
    event.stopPropagation();
    this.draft = row.type === 'null' ? '' : this.displayValue(row);
    this.editing.set({ pointer: row.pointer, kind: 'value' });
  }

  protected beginEditKey(row: TreeRow, event: Event): void {
    if (!this.isEditableKey(row)) {
      return;
    }
    event.stopPropagation();
    this.draft = this.keyLabel(row);
    this.editing.set({ pointer: row.pointer, kind: 'key' });
  }

  protected toggleBoolean(row: TreeRow, event: Event): void {
    if (row.type !== 'boolean' || this.store.readOnly()) {
      return;
    }
    event.stopPropagation();
    this.store.updateValueAt(row.path, !(row.value as boolean));
  }

  protected commit(row: TreeRow): void {
    const target = this.editing();
    if (!target) {
      return;
    }
    if (target.kind === 'value') {
      this.store.updateValueAt(row.path, this.parseDraft(row));
    } else if (typeof row.key === 'string') {
      this.store.renameKeyAt(parentOf(row.path), row.key, this.draft);
    }
    this.editing.set(null);
  }

  protected cancel(): void {
    this.editing.set(null);
  }

  protected onEditKeydown(row: TreeRow, event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commit(row);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    }
  }

  private parseDraft(row: TreeRow): JsonValue {
    if (row.type === 'number') {
      const n = Number(this.draft);
      return Number.isFinite(n) ? n : (row.value as number);
    }
    // string and (former) null become strings; explicit type change is separate.
    return this.draft;
  }

  protected indentPx(depth: number): number {
    return depth * 16;
  }

  protected trackRow(_index: number, row: TreeRow): string {
    return row.pointer;
  }
}

function parentOf(path: JsonPath): JsonPath {
  return path.slice(0, -1);
}

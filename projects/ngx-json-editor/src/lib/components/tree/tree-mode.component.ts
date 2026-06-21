import { ScrollingModule } from '@angular/cdk/scrolling';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import {
  JsonPath,
  JsonValue,
  JsonValueType,
  ValidationError,
  cloneJson,
  isPathPrefix,
  pathToDisplay,
  pathToPointer,
} from '@vasimhayat007/ngx-json-editor/core';
import { EditorStore } from '../../state/editor-store';
import { TreeRow, containerSummary, flattenTree } from '../../state/tree-model';
import { AutofocusDirective } from '../../directives/autofocus.directive';
import { CLIPBOARD_ADAPTER } from '../../adapters/tokens';

interface EditTarget {
  readonly pointer: string;
  readonly kind: 'key' | 'value';
}

interface DropTarget {
  readonly pointer: string;
  readonly position: 'before' | 'after' | 'inside';
}

/**
 * Tree mode: a virtualized, hierarchical view of the document with inline
 * editing, multi-select, a per-node context menu, drag-and-drop reordering /
 * reparenting, and color/link value renderers.
 */
@Component({
  selector: 'ngx-json-tree',
  imports: [ScrollingModule, FormsModule, ContextMenuModule, AutofocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree-mode.component.html',
  styleUrl: './tree-mode.component.scss',
})
export class TreeModeComponent {
  protected readonly store = inject(EditorStore);
  private readonly clipboard = inject(CLIPBOARD_ADAPTER);
  private readonly menu = viewChild<ContextMenu>('cm');

  protected readonly rows = computed<TreeRow[]>(() => {
    const value = this.store.json();
    return value === undefined ? [] : flattenTree(value, this.store.expanded());
  });

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

  /** Node cut/copied within the editor (paste source independent of OS clipboard). */
  private readonly internalClipboard = signal<JsonValue | null>(null);
  private lastClickIndex = -1;

  protected readonly menuModel = signal<MenuItem[]>([]);
  private menuRow: TreeRow | null = null;

  // Drag-and-drop state.
  protected readonly dragging = signal<string | null>(null);
  protected readonly dropTarget = signal<DropTarget | null>(null);

  // ── Selection (single / multi / range) ─────────────────────────────────────
  protected onRowClick(row: TreeRow, index: number, event: MouseEvent): void {
    if (event.shiftKey && this.lastClickIndex >= 0) {
      const [lo, hi] = [Math.min(this.lastClickIndex, index), Math.max(this.lastClickIndex, index)];
      const rows = this.rows();
      this.store.selectPointers(
        rows.slice(lo, hi + 1).map((r) => r.pointer),
        row.path,
      );
    } else if (event.ctrlKey || event.metaKey) {
      this.store.toggleSelection(row.path);
      this.lastClickIndex = index;
    } else {
      this.store.setSelection(row.path);
      this.lastClickIndex = index;
    }
  }

  protected isSelected(row: TreeRow): boolean {
    return this.store.isSelected(row.path);
  }

  /** True if this node, or (for containers) any descendant, has a validation error. */
  protected hasErrorAt(row: TreeRow): boolean {
    if (this.errorsByPointer().has(row.pointer)) {
      return true;
    }
    for (const e of this.store.errors()) {
      if (e.path.length > row.path.length && isPathPrefix(row.path, e.path)) {
        return true;
      }
    }
    return false;
  }

  protected onRowKeydown(row: TreeRow, event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (row.expandable) {
          this.store.toggleExpanded(row.path);
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
      case 'Delete':
      case 'Backspace':
        if (!this.store.readOnly()) {
          event.preventDefault();
          this.store.removeSelected();
        }
        break;
      default:
        break;
    }
  }

  // ── Expand/collapse ─────────────────────────────────────────────────────
  protected toggle(row: TreeRow, event: Event): void {
    event.stopPropagation();
    if (row.expandable) {
      this.store.toggleExpanded(row.path);
    }
  }

  // ── Inline editing ──────────────────────────────────────────────────────
  protected isEditing(row: TreeRow, kind: 'key' | 'value'): boolean {
    const e = this.editing();
    return !!e && e.pointer === row.pointer && e.kind === kind;
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

  protected beginEditValue(row: TreeRow, event: Event): void {
    if (!this.isEditableValue(row)) return;
    event.stopPropagation();
    this.draft = row.type === 'null' ? '' : this.displayValue(row);
    this.editing.set({ pointer: row.pointer, kind: 'value' });
  }

  protected beginEditKey(row: TreeRow, event: Event): void {
    if (!this.isEditableKey(row)) return;
    event.stopPropagation();
    this.draft = this.keyLabel(row);
    this.editing.set({ pointer: row.pointer, kind: 'key' });
  }

  protected toggleBoolean(row: TreeRow, event: Event): void {
    if (row.type !== 'boolean' || this.store.readOnly()) return;
    event.stopPropagation();
    this.store.updateValueAt(row.path, !(row.value as boolean));
  }

  protected commit(row: TreeRow): void {
    const target = this.editing();
    if (!target) return;
    if (target.kind === 'value') {
      this.store.updateValueAt(row.path, this.parseDraft(row));
    } else if (typeof row.key === 'string') {
      this.store.renameKeyAt(row.path.slice(0, -1), row.key, this.draft);
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
    return this.draft;
  }

  // ── Context menu ────────────────────────────────────────────────────────
  protected onContextMenu(row: TreeRow, event: MouseEvent): void {
    if (this.store.readOnly()) return;
    event.preventDefault();
    if (!this.isSelected(row)) {
      this.store.setSelection(row.path);
    }
    this.menuRow = row;
    this.menuModel.set(this.buildMenu(row));
    this.menu()?.show(event);
  }

  private buildMenu(row: TreeRow): MenuItem[] {
    const isRoot = row.path.length === 0;
    const isContainer = row.type === 'object' || row.type === 'array';
    const types: JsonValueType[] = ['string', 'number', 'boolean', 'null', 'object', 'array'];
    return [
      {
        label: 'Convert to',
        items: types
          .filter((t) => t !== row.type)
          .map((t) => ({
            label: capitalize(t),
            command: () => this.store.changeTypeAt(row.path, t),
          })),
      },
      { separator: true },
      {
        label: 'Insert before',
        disabled: isRoot,
        command: () => this.store.insertSibling(row.path, 'before', 'string'),
      },
      {
        label: 'Insert after',
        disabled: isRoot,
        command: () => this.store.insertSibling(row.path, 'after', 'string'),
      },
      {
        label: 'Append',
        disabled: !isContainer,
        command: () => this.store.appendChild(row.path, 'string'),
      },
      { label: 'Duplicate', disabled: isRoot, command: () => this.store.duplicateAt(row.path) },
      { separator: true },
      { label: 'Sort', disabled: !isContainer, command: () => this.store.sortAt(row.path) },
      { label: 'Extract', disabled: isRoot, command: () => this.store.extractAt(row.path) },
      { separator: true },
      { label: 'Copy', command: () => this.copy(row) },
      { label: 'Copy path', command: () => this.copyPath(row) },
      { label: 'Cut', disabled: isRoot, command: () => this.cut(row) },
      {
        label: 'Paste',
        disabled: !isContainer || this.internalClipboard() === null,
        command: () => this.paste(row),
      },
      { separator: true },
      { label: 'Remove', disabled: isRoot, command: () => this.store.removeAt(row.path) },
    ];
  }

  private copy(row: TreeRow): void {
    this.internalClipboard.set(cloneJson(row.value));
    void this.clipboard.writeText(JSON.stringify(row.value, null, 2));
  }

  private copyPath(row: TreeRow): void {
    void this.clipboard.writeText(pathToDisplay(row.path));
  }

  private cut(row: TreeRow): void {
    this.copy(row);
    this.store.removeAt(row.path);
  }

  private paste(row: TreeRow): void {
    const value = this.internalClipboard();
    if (value === null) return;
    if (row.type === 'array') {
      this.store.applyJsonPatch([{ op: 'add', path: `${row.pointer}/-`, value: cloneJson(value) }]);
    } else if (row.type === 'object') {
      this.store.appendChild(row.path, 'string', 'pasted');
      // Replace the freshly-added placeholder with the pasted value.
      this.store.updateValueAt([...row.path, 'pasted'], cloneJson(value));
    }
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────
  protected onDragStart(row: TreeRow, event: DragEvent): void {
    if (this.store.readOnly() || row.path.length === 0) {
      event.preventDefault();
      return;
    }
    this.dragging.set(row.pointer);
    event.dataTransfer?.setData('text/plain', row.pointer);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onDragOver(row: TreeRow, event: DragEvent): void {
    const src = this.dragging();
    if (!src || src === row.pointer) return;
    // Disallow dropping a node into its own subtree.
    if (isPathPrefix(pointerToPathSafe(src), row.path)) return;
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const offset = event.clientY - rect.top;
    let position: DropTarget['position'];
    if (row.type === 'object' || row.type === 'array') {
      position =
        offset < rect.height * 0.25 ? 'before' : offset > rect.height * 0.75 ? 'after' : 'inside';
    } else {
      position = offset < rect.height / 2 ? 'before' : 'after';
    }
    this.dropTarget.set({ pointer: row.pointer, position });
  }

  protected onDrop(row: TreeRow, event: DragEvent): void {
    event.preventDefault();
    const target = this.dropTarget();
    const src = this.dragging();
    this.dragging.set(null);
    this.dropTarget.set(null);
    if (!src || !target) return;

    const fromPath = pointerToPathResolved(this.store.json(), src);
    if (!fromPath) return;

    if (target.position === 'inside') {
      const destIndexOrKey = row.type === 'array' ? '-' : uniqueChildKey(row, fromPath);
      this.store.moveNode(fromPath, row.path, destIndexOrKey);
      return;
    }
    // before/after a sibling: compute the destination parent + index/key.
    const parentPath = row.path.slice(0, -1);
    const lastKey = row.path[row.path.length - 1];
    if (typeof lastKey === 'number') {
      let index = lastKey + (target.position === 'after' ? 1 : 0);
      // If moving down within the same array, the source removal shifts indices.
      const fromParent = fromPath.slice(0, -1);
      if (pathToPointer(fromParent) === pathToPointer(parentPath)) {
        const fromIndex = Number(fromPath[fromPath.length - 1]);
        if (fromIndex < index) {
          index -= 1;
        }
      }
      this.store.moveNode(fromPath, parentPath, index);
    } else {
      this.store.moveNode(fromPath, parentPath, String(lastKey));
    }
  }

  protected onDragEnd(): void {
    this.dragging.set(null);
    this.dropTarget.set(null);
  }

  protected dropClass(row: TreeRow): string {
    const t = this.dropTarget();
    if (!t || t.pointer !== row.pointer) return '';
    return `nje-drop-${t.position}`;
  }

  // ── Value rendering helpers ────────────────────────────────────────────────
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

  protected isColor(row: TreeRow): boolean {
    if (row.type !== 'string') {
      return false;
    }
    const v = row.value as string;
    if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) {
      return true;
    }
    if (/^(rgb|hsl)a?\(/i.test(v)) {
      return true;
    }
    // CSS named colors (e.g. "gold"), validated via the browser when available.
    return /^[a-z]+$/i.test(v) && typeof CSS !== 'undefined' && CSS.supports('color', v);
  }

  protected isLink(row: TreeRow): boolean {
    return row.type === 'string' && /^https?:\/\/\S+$/i.test(row.value as string);
  }

  /** "N items" / "N item" / "empty" badge for a container row. */
  protected itemCountLabel(row: TreeRow): string {
    if (row.childCount === 0) {
      return 'empty';
    }
    return `${row.childCount} ${row.childCount === 1 ? 'item' : 'items'}`;
  }

  protected onBooleanChange(row: TreeRow, event: Event): void {
    event.stopPropagation();
    if (!this.store.readOnly()) {
      this.store.updateValueAt(row.path, (event.target as HTMLInputElement).checked);
    }
  }

  protected indentPx(depth: number): number {
    return depth * 16;
  }

  protected trackRow(_index: number, row: TreeRow): string {
    return row.pointer;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pointerToPathSafe(pointer: string): JsonPath {
  return pointer === '' ? [] : pointer.slice(1).split('/');
}

/** Resolve a pointer to a path whose numeric segments are real numbers. */
function pointerToPathResolved(doc: JsonValue | undefined, pointer: string): JsonPath | null {
  if (pointer === '') return [];
  const tokens = pointer.slice(1).split('/');
  return tokens.map((t) => (/^\d+$/.test(t) ? Number(t) : t));
}

function uniqueChildKey(container: TreeRow, fromPath: JsonPath): string {
  const movedKey = fromPath[fromPath.length - 1];
  return typeof movedKey === 'string' ? movedKey : 'item';
}

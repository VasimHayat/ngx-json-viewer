import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import {
  JsonPath,
  JsonValue,
  cloneJson,
  diffToPatch,
  parseJson,
  pointerToPath,
} from 'ngx-json-editor/core';
import { JsonEditorContent, isTextContent } from '../../models/editor-content';
import { NgxJsonEditorComponent } from '../editor/ngx-json-editor.component';
import { IconComponent } from '../icon/icon.component';

/**
 * `<ngx-json-workspace>` — the two-document compare workspace (the
 * jsoneditoronline.org layout): two editors side-by-side with a center column
 * for Copy ↔, Transform, and a live structural Compare with difference
 * navigation, plus a draggable divider.
 */
@Component({
  selector: 'ngx-json-workspace',
  imports: [NgxJsonEditorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  host: {
    '[class.nje-theme-dark]': "theme() === 'dark'",
    '[attr.data-preset]': 'themePreset()',
  },
})
export class NgxJsonWorkspaceComponent {
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  readonly left = model<JsonEditorContent>({ json: null });
  readonly right = model<JsonEditorContent>({ json: null });
  readonly leftTitle = input<string>('Document 1');
  readonly rightTitle = input<string>('Document 2');
  readonly theme = input<'light' | 'dark' | 'auto'>('auto');
  /** Color preset forwarded to both panes. */
  readonly themePreset = input<string>('green');
  readonly readOnly = input<boolean>(false);

  private readonly leftEditor = viewChild<NgxJsonEditorComponent>('leftEd');
  private readonly rightEditor = viewChild<NgxJsonEditorComponent>('rightEd');

  protected readonly compareOn = signal<boolean>(false);
  protected readonly diffIndex = signal<number>(0);
  /** Left pane width as a percentage of the workspace. */
  protected readonly splitPct = signal<number>(50);
  private dragging = false;

  private readonly leftJson = computed<JsonValue | undefined>(() => toJson(this.left()));
  private readonly rightJson = computed<JsonValue | undefined>(() => toJson(this.right()));

  /** Differing paths between the two documents (when Compare is on). */
  protected readonly diffPaths = computed<JsonPath[]>(() => {
    if (!this.compareOn()) {
      return [];
    }
    const l = this.leftJson();
    const r = this.rightJson();
    if (l === undefined || r === undefined) {
      return [];
    }
    return diffToPatch(l, r).map((op) => pointerToPath(op.path));
  });

  protected readonly diffCount = computed<number>(() => this.diffPaths().length);

  // ── Copy / transform ──────────────────────────────────────────────────────
  copyLeftToRight(): void {
    const l = this.leftJson();
    this.right.set(l === undefined ? { ...this.left() } : { json: cloneJson(l) });
  }

  copyRightToLeft(): void {
    const r = this.rightJson();
    this.left.set(r === undefined ? { ...this.right() } : { json: cloneJson(r) });
  }

  transformLeft(): void {
    this.leftEditor()?.transformDialog();
  }

  transformRight(): void {
    this.rightEditor()?.transformDialog();
  }

  // ── Compare ─────────────────────────────────────────────────────────────
  toggleCompare(): void {
    this.compareOn.update((v) => !v);
    this.diffIndex.set(0);
    if (this.compareOn()) {
      this.gotoDiff(0);
    }
  }

  nextDiff(): void {
    const n = this.diffCount();
    if (n === 0) return;
    const i = (this.diffIndex() + 1) % n;
    this.diffIndex.set(i);
    this.gotoDiff(i);
  }

  prevDiff(): void {
    const n = this.diffCount();
    if (n === 0) return;
    const i = (this.diffIndex() - 1 + n) % n;
    this.diffIndex.set(i);
    this.gotoDiff(i);
  }

  private gotoDiff(i: number): void {
    const path = this.diffPaths()[i];
    if (!path) return;
    this.leftEditor()?.selectPath(path);
    this.rightEditor()?.selectPath(path);
  }

  // ── Draggable divider ─────────────────────────────────────────────────────
  onDividerPointerDown(event: PointerEvent): void {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.dragging = true;
    event.preventDefault();
  }

  onDividerPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const rect = this.hostRef.nativeElement.getBoundingClientRect();
    const pct = ((event.clientX - rect.left) / rect.width) * 100;
    this.splitPct.set(Math.max(15, Math.min(85, pct)));
  }

  onDividerPointerUp(event: PointerEvent): void {
    this.dragging = false;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }
}

function toJson(content: JsonEditorContent): JsonValue | undefined {
  if (isTextContent(content)) {
    const r = parseJson(content.text);
    return r.ok ? r.value : undefined;
  }
  return content.json ?? null;
}

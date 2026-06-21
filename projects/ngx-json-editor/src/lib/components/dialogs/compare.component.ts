import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import {
  DiffNode,
  DiffStatus,
  JsonValue,
  ParseResult,
  diffStructural,
  parseJson,
  summarizeDiff,
} from '@vasimhayat007/ngx-json-editor/core';

/** A flattened diff node for rendering. */
interface DiffRow {
  readonly key: string;
  readonly status: DiffStatus;
  readonly depth: number;
  readonly leftText: string;
  readonly rightText: string;
  readonly leaf: boolean;
}

/**
 * Compare dialog: a structural (not line-based) diff between the current
 * document and a second one (pasted by the user), with added / removed /
 * changed highlighting and summary counts.
 */
@Component({
  selector: 'ngx-json-compare',
  imports: [FormsModule, DialogModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compare.component.html',
  styleUrl: './compare.component.scss',
})
export class CompareComponent {
  protected readonly visible = signal(false);
  protected readonly leftJson = signal<JsonValue | null>(null);
  protected readonly rightText = signal('');

  private readonly parsedRight = computed<ParseResult>(() => parseJson(this.rightText()));

  protected readonly rightError = computed<string | null>(() => {
    const p = this.parsedRight();
    return p.ok ? null : p.error.message;
  });

  private readonly diff = computed<DiffNode | null>(() => {
    const left = this.leftJson();
    const right = this.parsedRight();
    if (left === null || !right.ok) {
      return null;
    }
    return diffStructural(left, right.value);
  });

  protected readonly summary = computed(() => {
    const d = this.diff();
    return d ? summarizeDiff(d) : null;
  });

  protected readonly rows = computed<DiffRow[]>(() => {
    const d = this.diff();
    if (!d) {
      return [];
    }
    const out: DiffRow[] = [];
    flatten(d, 0, out);
    return out;
  });

  /** Open the dialog comparing `left` against a (initially identical) doc. */
  open(left: JsonValue | null): void {
    this.leftJson.set(left);
    this.rightText.set(left === null ? '' : JSON.stringify(left, null, 2));
    this.visible.set(true);
  }

  protected onRightInput(text: string): void {
    this.rightText.set(text);
  }
}

function flatten(node: DiffNode, depth: number, out: DiffRow[]): void {
  const key = node.key === null ? '(root)' : String(node.key);
  const leaf = !node.children || node.children.length === 0;
  out.push({
    key,
    status: node.status,
    depth,
    leftText: leaf ? preview(node.left) : '',
    rightText: leaf ? preview(node.right) : '',
    leaf,
  });
  if (node.children) {
    for (const child of node.children) {
      flatten(child, depth + 1, out);
    }
  }
}

function preview(value: JsonValue | undefined): string {
  if (value === undefined) {
    return '';
  }
  const text = JSON.stringify(value);
  return text.length > 80 ? text.slice(0, 80) + '…' : text;
}

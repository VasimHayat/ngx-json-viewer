import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { EditorStore } from '../../state/editor-store';
import {
  CODE_EDITOR_ADAPTER,
  CodeEditorAdapter,
  CodeEditorHandle,
  EditorDiagnostic,
} from '../../adapters/tokens';

/**
 * Text/code mode: a thin Angular wrapper around the injected
 * {@link CodeEditorAdapter} (default CodeMirror 6, lazy-loaded). Two-way binds
 * to the {@link EditorStore}: user keystrokes flow into `store.setText`, while
 * store changes (format/compact/repair/undo/redo/external) flow back into the
 * editor. Parse errors are surfaced as gutter diagnostics.
 */
@Component({
  selector: 'ngx-json-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="nje-text-host"></div>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
      }
      .nje-text-host {
        height: 100%;
      }
    `,
  ],
})
export class TextModeComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(EditorStore);
  private readonly injectedAdapter = inject(CODE_EDITOR_ADAPTER, { optional: true });
  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');

  /** Dark theme flag, driven by the parent editor's resolved theme. */
  readonly dark = input<boolean>(false);

  private handle: CodeEditorHandle | null = null;
  private lastPushedValue = '';

  constructor() {
    // Push store → editor (guards against echoing the user's own keystrokes).
    effect(() => {
      const text = this.store.text();
      const handle = this.handle;
      if (!handle) {
        return;
      }
      if (text !== handle.getValue()) {
        this.lastPushedValue = text;
        handle.setValue(text);
      }
    });

    // Reflect parse errors as gutter diagnostics.
    effect(() => {
      const diagnostics = this.computeDiagnostics();
      this.handle?.setDiagnostics(diagnostics);
    });

    // Reflect read-only and dark theme.
    effect(() => this.handle?.setReadOnly(this.store.readOnly()));
    effect(() => this.handle?.setDark(this.dark()));
  }

  async ngAfterViewInit(): Promise<void> {
    const adapter = await this.resolveAdapter();
    this.handle = adapter.mount({
      parent: this.hostRef().nativeElement,
      initialValue: this.store.text(),
      readOnly: this.store.readOnly(),
      indentation: this.store.indentation(),
      dark: this.dark(),
      onChange: (value: string) => {
        if (value === this.lastPushedValue) {
          return;
        }
        this.store.setText(value);
      },
    });
    this.lastPushedValue = this.store.text();
    this.handle.setDiagnostics(this.computeDiagnostics());
  }

  ngOnDestroy(): void {
    this.handle?.destroy();
    this.handle = null;
  }

  /** Move focus into the code editor. */
  focus(): void {
    this.handle?.focus();
  }

  private async resolveAdapter(): Promise<CodeEditorAdapter> {
    if (this.injectedAdapter) {
      return this.injectedAdapter;
    }
    // Lazy-load the default engine so it stays out of the main bundle.
    const { CodeMirrorAdapter } = await import('../../adapters/codemirror.adapter');
    return new CodeMirrorAdapter();
  }

  private computeDiagnostics(): EditorDiagnostic[] {
    const err = this.store.parseError();
    if (!err) {
      return [];
    }
    const offset = err.location.offset;
    return [
      {
        from: offset,
        to: offset + 1,
        severity: 'error',
        message: err.message,
      },
    ];
  }
}

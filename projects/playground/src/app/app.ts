import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  EditorMode,
  JsonEditorContent,
  NgxJsonEditorComponent,
  OnChangeStatus,
} from 'ngx-json-editor';

/** Sample document used by the playground to exercise the editor. */
const SAMPLE: JsonEditorContent = {
  json: {
    name: 'ngx-json-editor',
    version: '0.1.0',
    private: false,
    keywords: ['angular', 'json', 'editor', 'tree', 'codemirror'],
    repository: { type: 'git', url: 'https://github.com/ngx-json-editor/ngx-json-editor' },
    stats: { stars: 0, openIssues: 3, coverage: 0.0 },
    maintainers: [
      { name: 'Ada', active: true, color: '#2563eb' },
      { name: 'Linus', active: false, color: '#16a34a' },
    ],
    homepage: 'https://example.com',
    deprecated: null,
  },
};

@Component({
  selector: 'app-root',
  imports: [NgxJsonEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly content = signal<JsonEditorContent>(SAMPLE);
  readonly mode = signal<EditorMode>('tree');
  readonly theme = signal<'light' | 'dark' | 'auto'>('light');
  readonly lastChange = signal<string>('—');

  readonly modes: readonly EditorMode[] = ['tree', 'text', 'table'];
  readonly themes = ['light', 'dark', 'auto'] as const;

  onContentChange(status: OnChangeStatus): void {
    this.lastChange.set(`${new Date().toLocaleTimeString()} · ${status.errors.length} error(s)`);
  }

  loadEmpty(): void {
    this.content.set({ json: {} });
  }

  loadSample(): void {
    this.content.set(SAMPLE);
  }
}

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { JsonEditorContent, NgxJsonWorkspaceComponent } from 'ngx-json-editor';

/** Left demo document (a config-style payload). */
const LEFT: JsonEditorContent = {
  json: {
    redirectUrl: 'https://example.com/app/#/redirect',
    isLoginDisabled: false,
    timeTakenInMillis: 29,
    isUserConsentRequired: false,
    globalTemplates: [],
    appUrl: 'https://example.com/app/',
    isSupportUser: false,
    showPswdExpiryMsg: false,
    custUserArray: [
      {
        firstName: 'A',
        lastName: 'D',
        customerEmailId: 'user@demo.com',
        primaryKey: 27652,
      },
    ],
    daysToPswdExpire: 90,
  },
};

/** Right demo document (one of every value type — mirrors jsoneditoronline). */
const RIGHT: JsonEditorContent = {
  json: {
    array: [1, 2, 3],
    boolean: true,
    color: 'gold',
    null: null,
    number: 123,
    object: { a: 'b', c: 'd' },
    string: 'Hello World',
  },
};

interface PresetSwatch {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

@Component({
  selector: 'app-root',
  imports: [NgxJsonWorkspaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly left = signal<JsonEditorContent>(LEFT);
  readonly right = signal<JsonEditorContent>(RIGHT);
  readonly dark = signal<boolean>(false);
  readonly preset = signal<string>('green');

  readonly theme = computed<'light' | 'dark'>(() => (this.dark() ? 'dark' : 'light'));

  readonly presets: readonly PresetSwatch[] = [
    { id: 'green', label: 'Green', color: '#4f9d4f' },
    { id: 'blue', label: 'Blue', color: '#3b82f6' },
    { id: 'violet', label: 'Violet', color: '#7c3aed' },
    { id: 'slate', label: 'Slate', color: '#475569' },
    { id: 'contrast', label: 'Contrast', color: '#111111' },
  ];

  selectPreset(id: string): void {
    this.preset.set(id);
  }

  toggleDark(): void {
    this.dark.update((v) => !v);
  }
}

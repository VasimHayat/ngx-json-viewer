import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
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
  readonly theme = signal<'light' | 'dark' | 'auto'>('light');
  readonly themes = ['light', 'dark', 'auto'] as const;

  toggleTheme(value: string): void {
    this.theme.set(value as 'light' | 'dark' | 'auto');
  }
}

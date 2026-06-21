# ngx-json-editor

A production-grade, themeable **JSON editor for Angular** with tree / text /
table modes — feature parity with [jsoneditoronline.org](https://jsoneditoronline.org),
built on standalone components, signals, `OnPush`, PrimeNG, and CodeMirror 6.

> **Status: 0.x, in active development.** This is a phased build; the
> feature-parity matrix in [`PARITY.md`](./PARITY.md) tracks what is implemented
> and tested. The public API is stable from 0.1.

## Why

- **Drop-in component** — `<ngx-json-editor [(content)]="data" />`.
- **Tree / Text / Table** modes, switchable at runtime.
- **Framework-idiomatic** — signals, standalone APIs, `OnPush` everywhere.
- **Themeable** — every color/size is a `--nje-*` CSS variable; light + dark.
- **Tree-shakeable** — pure logic in a framework-free `ngx-json-editor/core`
  entry point; the code editor is lazy-loaded only for text mode.
- **No implicit I/O** — network/file/clipboard access goes through adapters you
  provide; nothing leaves the page without your code.

## Install

```bash
npm install ngx-json-editor primeng @primeng/themes ajv jmespath codemirror
```

`@angular/core`, `@angular/common`, `@angular/cdk`, `primeng`, `ajv`, and
`jmespath` are peer dependencies.

## Quick start

The host app provides PrimeNG + animations (the library does not force a theme):

```ts
// app.config.ts
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

export const appConfig = {
  providers: [provideAnimationsAsync(), providePrimeNG({ theme: { preset: Aura } })],
};
```

```ts
// my.component.ts
import { Component, signal } from '@angular/core';
import { NgxJsonEditorComponent, JsonEditorContent } from 'ngx-json-editor';

@Component({
  selector: 'my-editor',
  imports: [NgxJsonEditorComponent],
  template: `<ngx-json-editor [(content)]="data" mode="tree" theme="auto" />`,
})
export class MyEditor {
  data = signal<JsonEditorContent>({ json: { hello: 'world' } });
}
```

## Public API (summary)

| Input                   | Type                          | Default          |
| ----------------------- | ----------------------------- | ---------------- |
| `content` (two-way)     | `{ json } \| { text }`        | `{ json: null }` |
| `mode`                  | `'tree' \| 'text' \| 'table'` | `'tree'`         |
| `readOnly`              | `boolean`                     | `false`          |
| `schema` / `schemaRefs` | `JsonSchema` / map            | `null`           |
| `validator`             | `ValidatorFn`                 | `null`           |
| `indentation`           | `number \| 'tab'`             | `2`              |
| `theme`                 | `'light' \| 'dark' \| 'auto'` | `'auto'`         |
| `i18n`                  | `Partial<EditorI18n>`         | `{}`             |
| `config`                | `NgxJsonEditorConfig`         | `{}`             |

| Output            | Payload                                          |
| ----------------- | ------------------------------------------------ |
| `documentChange`  | `{ content, errors, patch }` (rich change event) |
| `modeChange`      | `EditorMode`                                     |
| `errorsChange`    | `ValidationError[]`                              |
| `selectionChange` | `JsonPath \| null`                               |
| `ready`           | `void`                                           |

> `[(content)]` two-way binding uses the model's implicit `contentChange`; the
> rich event with errors/patch is `(documentChange)`. See
> [ARCHITECTURE.md](./ARCHITECTURE.md#8-recorded-decisions--deviations-from-the-spec).

Imperative methods (via a template ref): `expandAll`, `collapseAll`, `format`,
`compact`, `repair`, `undo`, `redo`, `focus`, `validate`, `get`, `set`,
`transform`.

## Keyboard shortcuts

| Shortcut                            | Action                         |
| ----------------------------------- | ------------------------------ |
| `Ctrl/Cmd + Z`                      | Undo                           |
| `Ctrl/Cmd + Shift + Z` / `Ctrl + Y` | Redo                           |
| `Ctrl/Cmd + F`                      | Open find bar                  |
| `Alt + Shift + F`                   | Format (beautify)              |
| `Alt + Shift + C`                   | Compact (minify)               |
| `Enter` / `Esc`                     | Commit / cancel an inline edit |
| `Delete`                            | Remove selected node(s) (tree) |
| `←` `→`                             | Collapse / expand a tree node  |

In **text mode** the CodeMirror editor owns its own undo/redo and find/replace
(`Ctrl+F` / `Ctrl+H`); the global shortcuts above defer to it while it's focused.

## Theming

Every color and size is a `--nje-*` CSS custom property set on the component
host (light defaults + a dark override). Re-theme without recompiling:

```css
ngx-json-editor {
  --nje-accent: #7c3aed;
  --nje-radius: 10px;
  --nje-font-mono: 'JetBrains Mono', monospace;
}
```

Set `theme="dark"` / `"light"` / `"auto"` (follows OS) on the component.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — design, state/patch model, adapters.
- [PERF.md](./PERF.md) — performance budgets & measured numbers.
- [PARITY.md](./PARITY.md) — feature → code → test matrix.
- [THIRD_PARTY.md](./THIRD_PARTY.md) — dependencies & licenses.

## Development

```bash
npm start            # serve the playground
npm run build        # build library + playground
npm test             # unit/component tests (headless Chrome)
npm run lint         # ESLint + Angular ESLint + template a11y
```

## License

MIT

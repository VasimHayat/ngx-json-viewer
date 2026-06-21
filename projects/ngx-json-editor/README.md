# ngx-json-editor

> Published on npm as **[`@vasimhayat007/ngx-json-editor`](https://www.npmjs.com/package/@vasimhayat007/ngx-json-editor)**.

A production-grade, themeable **JSON editor for Angular** with **tree**, **text**, and **table** modes — feature parity with [jsoneditoronline.org](https://jsoneditoronline.org), built on standalone components, signals, `OnPush` change detection, PrimeNG, and CodeMirror 6.

[![CI](https://github.com/VasimHayat/ngx-json-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/VasimHayat/ngx-json-viewer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/VasimHayat/ngx-json-viewer/blob/main/LICENSE)
[![Angular](https://img.shields.io/badge/Angular-20%20%7C%2021-dd0031?logo=angular&logoColor=white)](https://angular.dev)
[![core bundle](https://img.shields.io/badge/core-43.5%20KB%20gz-success)](https://github.com/VasimHayat/ngx-json-viewer/blob/main/PARITY.md)
[![a11y](https://img.shields.io/badge/axe-0%20serious%20%2F%20critical-success)](#accessibility)

<p align="center">
  <img src="https://raw.githubusercontent.com/VasimHayat/ngx-json-viewer/main/image.png" alt="ngx-json-editor showing text and tree modes side by side with a structural compare panel" width="100%">
</p>

> **Status — `0.x`, public API stable from `0.1`.** This is a phased build; the
> feature-parity matrix in
> [`PARITY.md`](https://github.com/VasimHayat/ngx-json-viewer/blob/main/PARITY.md)
> tracks what is implemented and tested, and the project stays on `0.x` until
> every row is ✅.

## Table of contents

- [Highlights](#highlights)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Public API](#public-api)
- [Recipes](#recipes)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Theming](#theming)
- [Tree-shaking & entry points](#tree-shaking--entry-points)
- [Performance](#performance)
- [Accessibility](#accessibility)
- [Documentation](#documentation)
- [License](#license)

## Highlights

- **Drop-in component** — `<ngx-json-editor [(content)]="data" />`, nothing else required.
- **Tree / Text / Table modes**, switchable at runtime with state preserved across switches.
- **Framework-idiomatic** — standalone APIs, signals, and `OnPush` change detection throughout.
- **Themeable** — every color and size is a `--nje-*` CSS custom property; light + dark + `auto`.
- **Tree-shakeable** — pure logic lives in a framework-free [`@vasimhayat007/ngx-json-editor/core`](#tree-shaking--entry-points) entry point; the code editor is lazy-loaded only for text mode.
- **No implicit I/O** — network, file, and clipboard access go through adapters you provide; nothing leaves the page without your code.
- **Schema-aware** — JSON Schema validation (Ajv) surfaces errors on tree nodes and the status bar.
- **Transform & compare** — JMESPath transform/filter with live preview, and a structural diff between two documents.
- **Accessible & fast** — `axe` reports zero serious/critical issues; a 1 MB document opens in ≈32 ms.

## Requirements

| Requirement      | Version                                                       |
| ---------------- | ------------------------------------------------------------ |
| Angular          | `^20.0.0 \|\| ^21.0.0`                                       |
| PrimeNG          | `^20.0.0 \|\| ^21.0.0` (+ `@primeng/themes`)                |
| Node             | `20+` (build/dev)                                            |

**Peer dependencies.** `@angular/core`, `@angular/common`, `@angular/cdk`, and
`primeng` are required. The following are **optional** peers, needed only by the
feature that uses them, so you can omit any you don't use:

| Optional peer                | Enables                          |
| ---------------------------- | -------------------------------- |
| `ajv` (+ `ajv-formats`)      | JSON Schema validation           |
| `jmespath`                   | Transform / filter (query engine)|
| `codemirror` + `@codemirror/*` | Text (code) mode               |
| `@primeng/themes`            | PrimeNG theming presets          |

## Installation

```bash
npm install @vasimhayat007/ngx-json-editor primeng @primeng/themes ajv jmespath codemirror
```

Or scaffold providers automatically with the schematic:

```bash
ng add @vasimhayat007/ngx-json-editor
```

## Quick start

The host application provides PrimeNG and animations (the library does not force a theme):

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
import { NgxJsonEditorComponent, JsonEditorContent } from '@vasimhayat007/ngx-json-editor';

@Component({
  selector: 'my-editor',
  imports: [NgxJsonEditorComponent],
  template: `<ngx-json-editor [(content)]="data" mode="tree" theme="auto" />`,
})
export class MyEditor {
  data = signal<JsonEditorContent>({ json: { hello: 'world' } });
}
```

## Public API

### Inputs

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

### Outputs

| Output            | Payload                                          |
| ----------------- | ------------------------------------------------ |
| `documentChange`  | `{ content, errors, patch }` (rich change event) |
| `modeChange`      | `EditorMode`                                     |
| `errorsChange`    | `ValidationError[]`                              |
| `selectionChange` | `JsonPath \| null`                               |
| `ready`           | `void`                                           |

> `[(content)]` two-way binding uses the model's implicit `contentChange`; the
> rich event carrying errors and the JSON Patch is `(documentChange)`. See
> [ARCHITECTURE.md](https://github.com/VasimHayat/ngx-json-viewer/blob/main/ARCHITECTURE.md#8-recorded-decisions--deviations-from-the-spec)
> for the rationale.

### Imperative methods

Available via a template ref (`#ed="ngxJsonEditor"`):

`expandAll`, `collapseAll`, `format`, `compact`, `repair`, `undo`, `redo`,
`focus`, `validate`, `get`, `set`, `transform`.

## Recipes

**Schema validation** — errors surface on tree nodes and the status bar:

```ts
schema = signal<JsonSchema>({
  type: 'object',
  required: ['name'],
  properties: { name: { type: 'string' }, age: { type: 'number', minimum: 0 } },
});
// <ngx-json-editor [(content)]="data" [schema]="schema()" />
```

**Read-only viewer**:

```html
<ngx-json-editor [content]="{ json: data }" [readOnly]="true" mode="tree" />
```

**Custom validation** (errors are returned as values, never thrown):

```ts
validator: ValidatorFn = (value) =>
  isObject(value) && !('id' in value)
    ? [{ path: [], message: 'Missing id', severity: 'error' }]
    : [];
// <ngx-json-editor [(content)]="data" [validator]="validator" />
```

**Compare two documents** — open the Compare dialog from the toolbar, or use the
framework-free diff directly:

```ts
import { diffStructural, summarizeDiff } from '@vasimhayat007/ngx-json-editor/compare';

const diff = diffStructural(a, b);
const { added, removed, changed } = summarizeDiff(diff);
```

**Custom fetch / file adapter** (the library never calls the network itself):

```ts
import { FETCH_ADAPTER, FILE_ADAPTER } from '@vasimhayat007/ngx-json-editor';

providers: [{ provide: FETCH_ADAPTER, useValue: { fetchText: (url) => myHttp.get(url) } }];
```

**Disable features** via `config`:

```ts
// <ngx-json-editor [config]="{ features: { transform: false, compare: false } }" />
```

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
(`Ctrl+F` / `Ctrl+H`); the global shortcuts above defer to it while it is focused.

## Theming

Every color and size is a `--nje-*` CSS custom property set on the component
host (light defaults plus a dark override). Re-theme without recompiling:

```css
ngx-json-editor {
  --nje-accent: #7c3aed;
  --nje-radius: 10px;
  --nje-font-mono: 'JetBrains Mono', monospace;
}
```

Set `theme="dark"`, `"light"`, or `"auto"` (follows the OS preference) on the component.

## Tree-shaking & entry points

Pure, framework-free logic lives in secondary entry points so consumers import
only what they use. The `core` entry point has **zero** Angular or DOM imports.

| Entry point                              | Contains                                                       |
| ---------------------------------------- | -------------------------------------------------------------- |
| `@vasimhayat007/ngx-json-editor`         | The `NgxJsonEditorComponent` shell and Angular APIs            |
| `@vasimhayat007/ngx-json-editor/core`    | parse · repair · patch · diff · sort · query · schema · search |
| `@vasimhayat007/ngx-json-editor/transform`| JMESPath transform/filter helpers                             |
| `@vasimhayat007/ngx-json-editor/compare` | structural diff (`diffStructural`, `summarizeDiff`)            |
| `@vasimhayat007/ngx-json-editor/table`   | table projection helpers                                       |

The CodeMirror-based text editor is a dynamic-import chunk (≈115 KB transfer),
loaded only when text mode is first shown — tree/table-only apps never pay for it.

## Performance

Measured by benchmark specs (headless Chrome, dev laptop) and printed to the
test log on every run, so numbers don't drift silently. Full detail in
[PERF.md](https://github.com/VasimHayat/ngx-json-viewer/blob/main/PERF.md).

| Budget                                      | Target        | Measured                                   |
| ------------------------------------------- | ------------- | ------------------------------------------ |
| Open & render a 1 MB document (interactive) | < 300 ms      | **parse 11 ms + flatten 18 ms ≈ 32 ms**    |
| Keystroke-to-paint in text mode             | < 16 ms       | CodeMirror incremental + O(1) signal write |
| Large doc, no main-thread block             | < 50 ms/frame | collapsed flatten of a 20k-row doc ≈ 24 ms |

Lazy flattening means a fully collapsed 25 MB document flattens to a handful of
rows, and CDK virtual scroll keeps only visible rows in the DOM.

## Accessibility

ARIA `tree`/`treegrid` roles, fully keyboard-navigable controls, and reactive
light/dark theming. `axe-core` reports **0 serious/critical** issues.

## Documentation

- [ARCHITECTURE.md](https://github.com/VasimHayat/ngx-json-viewer/blob/main/ARCHITECTURE.md) — design, state/patch model, adapters.
- [PERF.md](https://github.com/VasimHayat/ngx-json-viewer/blob/main/PERF.md) — performance budgets and measured numbers.
- [PARITY.md](https://github.com/VasimHayat/ngx-json-viewer/blob/main/PARITY.md) — feature → code → test matrix.
- [THIRD_PARTY.md](https://github.com/VasimHayat/ngx-json-viewer/blob/main/THIRD_PARTY.md) — dependencies and licenses.
- [CHANGELOG.md](https://github.com/VasimHayat/ngx-json-viewer/blob/main/CHANGELOG.md) — release history.

## License

Released under the [MIT License](https://github.com/VasimHayat/ngx-json-viewer/blob/main/LICENSE).

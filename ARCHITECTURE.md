# Architecture — ngx-json-editor

This document records the design of the library, the rationale behind key
decisions, and the assumptions made where the spec was ambiguous. It grows with
each build phase.

## 1. Workspace layout

```
projects/
  ngx-json-editor/            # publishable library (ng-packagr)
    core/                     # SECONDARY entry point: ngx-json-editor/core
      src/lib/                #   framework-free pure logic (no Angular, no DOM)
      src/public-api.ts
      ng-package.json
    src/lib/
      models/                 # public API types (content, config, i18n, schema)
      state/                  # EditorStore (signals) + history          [Phase 2]
      adapters/               # DI tokens + default adapters             [Phase 2+]
      components/editor/      # NgxJsonEditorComponent (shell)
      components/{tree,text,table,dialogs}/                              [Phase 2–5]
      directives/ pipes/ i18n/ styles/
    src/public-api.ts         # PRIMARY entry point: ngx-json-editor
    ng-package.json
  playground/                 # demo app, exercises every feature
```

Secondary entry points (`/core` now; `/table`, `/transform`, `/compare` in
Phase 7) let consumers import only what they use. Cross-entry imports resolve
via tsconfig `paths` in dev/test and via ng-packagr at build time.

## 2. Strict layering

`core (no Angular) → state (signals) → ui (components)`.

The `core/` entry point has **zero** Angular or DOM imports, so the parser,
repair, JSON Patch, diff, sort, schema, and query logic are unit-testable in
isolation and reusable inside a Web Worker. This is enforced by the entry-point
boundary (core cannot import from the primary entry) and reviewed in CI.

## 3. State & edit model (Phase 2)

- **Single source of truth**: a per-instance signal-based `EditorStore` holding
  the JSON document plus a derived view model. Tree / text / table are
  *projections* of the same store, so switching modes never loses data,
  expansion, or selection state.
- **Edits as patches**: every mutation is expressed as an RFC 6902 JSON Patch.
  Undo/redo are forward/inverse patch stacks (bounded by `limits.historyLimit`).
  This keeps history compact and lets `(documentChange)` emit precise diffs.

## 4. Text-mode editor engine — CodeMirror 6 (decision)

**Chosen: CodeMirror 6** over Monaco.

- Bundle size: CM6 is modular/tree-shakeable (tens of KB) vs Monaco (~MBs, ships
  its own worker infra). The spec sets a < 120 KB core budget and requires the
  code editor to be **lazy-loaded** only when text mode is used — CM6 fits.
- Embedding: CM6 mounts cleanly into a single DOM element with no AMD/worker
  loader gymnastics; Monaco's loader is awkward in an Angular library.
- Theming: CM6 themes are plain data, easy to drive from our CSS tokens.

The engine is hidden behind a `CODE_EDITOR_ADAPTER` DI token (Phase 2) so a host
can swap in Monaco or a plain textarea without touching the editor.

## 5. Adapters (DI tokens)

`CODE_EDITOR_ADAPTER`, `FETCH_ADAPTER`, `FILE_ADAPTER`, `CLIPBOARD_ADAPTER`,
`QUERY_ENGINE` (JMESPath default). Each ships a default implementation and is
overridable by the host. **No implicit network/file/clipboard access** — all
such I/O goes through an injected adapter (spec §11).

## 6. Virtualization & Web Worker (Phase 3 / 6)

- Tree and table virtualize rows via CDK virtual scroll; children lazy-expand.
- Parse / validate / repair / transform / diff run on a Web Worker above
  `limits.workerThresholdBytes`, falling back to the main thread for small docs.

## 7. Theming

Every color/size is a `--nje-*` CSS custom property defined on the component
host (light defaults + a dark override mixin). Hosts re-theme by setting these
properties — no SCSS recompile needed. The optional `styles/theme.css` asset is
for global overrides. Tailwind (prefixed `tw-`) handles playground layout; the
library's own styles are token-driven SCSS so the published package is
self-contained and never depends on the host's Tailwind being present.

## 8. Recorded decisions / deviations from the spec

- **`(documentChange)` instead of `(contentChange)` for the rich event.**
  The spec lists both `content = model<JsonEditorContent>()` and
  `contentChange = output<OnChangeStatus>()`. In Angular a `model('content')`
  **auto-generates** a `contentChange` output (emitting `JsonEditorContent`,
  used by `[(content)]`), so a second `contentChange` collides; and a plain
  `change` is disallowed as a native DOM event name. The rich event carrying
  `{ content, errors, patch }` is therefore exposed as **`(documentChange)`**.
  `[(content)]` two-way binding works exactly as specified.

- **Angular 20.3 (current LTS) with peer range `^20 || ^21`.** "Latest LTS" at
  build time. Pinned PrimeNG 20.4, CDK 20.2 (no 20.3 line exists), animations
  matched to `@angular/common`.

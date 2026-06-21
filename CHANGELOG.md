# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/). It stays in `0.x` until
the [parity matrix](./PARITY.md) is 100%.

## [Unreleased]

## [0.1.0] — 2026-06-21

Initial release. Tree / text / table JSON editor for Angular with parity to
jsoneditoronline.org's core feature set.

### Added

- **Editor component** `<ngx-json-editor>` — standalone, `OnPush`, signal-based
  public API: two-way `content` model; `mode`, `readOnly`, `schema`,
  `schemaRefs`, `validator`, `indentation`, `theme`, `i18n`, `config` inputs;
  `documentChange`, `modeChange`, `errorsChange`, `selectionChange`, `ready`
  outputs; imperative `expandAll/collapseAll/format/compact/repair/undo/redo/
focus/validate/get/set/transform`.
- **Framework-free core** (`ngx-json-editor/core`): parser with located errors,
  JSON repair, RFC 6902 patch apply/invert, structural diff, sort, JMESPath
  query/builder, Ajv schema validation, JSON Pointer utilities. ≥ 93% coverage.
- **Tree mode**: virtualized (CDK), inline key/value edit, type change, context
  menu (insert/append/duplicate/remove/extract/sort/copy/cut/paste), drag-and-
  drop, multi-select with bulk remove, color/link value renderers, inline error
  markers, expand/collapse with state preserved across modes.
- **Text mode**: CodeMirror 6 (lazy-loaded) — highlighting, line numbers,
  bracket matching, folding, live parse-error gutters, format/compact/repair.
- **Table mode**: virtualized grid for arrays of objects, union columns, inline
  cell editing.
- **Toolbar**: undo/redo, format, compact, repair, sort/filter/transform
  dialogs (live preview), find (+ replace in text), expand/collapse all, import
  (paste/URL/file), download, copy, compare. Status bar.
- **Compare**: side-by-side structural diff with add/remove/change highlighting.
- **Adapters** (DI tokens, host-overridable, no implicit I/O): code editor,
  fetch, file, clipboard, query engine, heavy-compute (worker-ready).
- **Secondary entry points**: `/core`, `/transform`, `/compare`, `/table`.
- **Theming**: `--nje-*` CSS custom-property tokens, light + dark.
- **i18n**: injectable string map with `en` defaults.
- **Accessibility**: aria tree/treegrid roles, keyboard navigation, axe-clean
  (0 serious/critical).
- **Tooling**: ng-packagr build, `ng add` schematic, ESLint + Prettier, CI
  workflow, Compodoc config.

[Unreleased]: https://github.com/ngx-json-editor/ngx-json-editor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ngx-json-editor/ngx-json-editor/releases/tag/v0.1.0

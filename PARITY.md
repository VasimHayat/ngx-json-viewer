# Feature Parity Matrix

Maps every §3 acceptance item to its implementing file(s) and test(s). This is
the sign-off artifact; the library stays `0.x` until every row is ✅.

Legend: ✅ done & tested · 🟡 partial · ⬜ not started

## 3.1 Editor modes

| Feature             | Status | Implementation                                                                                                     | Tests                                     |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Tree mode           | ✅     | `components/tree/` (virtualized CDK scroll, lazy via expansion)                                                    | `tree-model.spec.ts`, tree component spec |
| Text/Code mode      | ✅     | `components/text/` + `adapters/codemirror.adapter.ts` (CM6: highlight, line numbers, bracket match, fold, gutters) | `editor-store.spec.ts`, component spec    |
| Table mode          | ✅     | `components/table/` (virtualized grid, union columns, inline edit)                                                 | `table.spec.ts`, table component spec     |
| Runtime mode switch | ✅     | editor component `setMode` + `EditorStore.mode`                                                                    | `ngx-json-editor.component.spec.ts`       |

## 3.2 Tree mode

| Feature                       | Status | Implementation                                                                                                        | Tests                                        |
| ----------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Inline key/value edit         | ✅     | tree component + `EditorStore.updateValueAt`/`renameKeyAt`                                                            | `editor-store.spec.ts`                       |
| Type-aware value editors      | ✅     | inline string/number/bool/null + "Convert to" menu                                                                    | `editor-store.spec.ts`                       |
| Change value type             | ✅     | context-menu "Convert to" → `EditorStore.changeTypeAt`                                                                | `value-type.spec.ts`, `editor-store.spec.ts` |
| Context menu actions          | ✅     | PrimeNG ContextMenu: convert / insert / append / duplicate / sort / extract / copy / copy-path / cut / paste / remove | `editor-store.spec.ts`                       |
| Drag-and-drop                 | ✅     | HTML5 drag, before/after/inside drop indicators, reparent guard → `moveNode`                                          | `editor-store.spec.ts` (moveNode)            |
| Multi-select + bulk           | ✅     | ctrl/shift-click, range, Delete → `removeSelected` (index-safe)                                                       | `editor-store.spec.ts`                       |
| Color/link value renderers    | 🟡     | color swatch + clickable link (image/custom renderer Phase 6)                                                         | tree component                               |
| Expand/collapse + persistence | ✅     | `EditorStore.expanded` (pointer-keyed, preserved across modes) + expand/collapse-all                                  | `tree-model.spec.ts`, `editor-store.spec.ts` |
| Inline validation markers     | ✅     | tree row error markers (parse + schema, incl. ancestors)                                                              | tree component                               |

## 3.3 Text mode

| Feature                  | Status | Implementation                                    | Tests                                    |
| ------------------------ | ------ | ------------------------------------------------- | ---------------------------------------- |
| Format / Compact         | ✅     | `EditorStore.format`/`compact` + toolbar          | `editor-store.spec.ts`, component spec   |
| Repair malformed JSON    | ✅     | `core/repair.ts` + `EditorStore.repair` + toolbar | `repair.spec.ts`, `editor-store.spec.ts` |
| Real-time parse errors   | ✅     | `core/parse.ts` located errors → CM lint gutter   | `parse.spec.ts`, `editor-store.spec.ts`  |
| Configurable indentation | ✅     | `indentation` input → store → CM indentUnit       | `editor-store.spec.ts`                   |

## 3.4 Cross-mode toolbar

| Feature                      | Status | Implementation                                                         | Tests                                    |
| ---------------------------- | ------ | ---------------------------------------------------------------------- | ---------------------------------------- |
| Undo / redo                  | ✅     | `EditorStore` history (patch-aware) + toolbar                          | `editor-store.spec.ts`, component spec   |
| Search + highlight           | ✅     | `core/search.ts` + store nav (find bar, count, prev/next, auto-expand) | `search.spec.ts`, `editor-store.spec.ts` |
| Search & replace (text)      | ✅     | find bar replace field → `replaceAllInText`                            | `editor-store.spec.ts`                   |
| Sort dialog                  | ✅     | `dialogs/` Sort (by key/value, dir, recursive) → `core/sort.ts`        | `sort.spec.ts`, `editor-store.spec.ts`   |
| Filter dialog                | ✅     | `dialogs/` Filter (field/op/value) → JMESPath, live preview            | `query.spec.ts`                          |
| Transform (JMESPath)         | ✅     | `dialogs/` Transform (query + builder, live preview, apply/copy)       | `query.spec.ts`                          |
| JSON Schema validation (Ajv) | ✅     | `core/schema.ts` → store errors → tree markers + status bar            | `schema.spec.ts`, `editor-store.spec.ts` |
| Status bar                   | ✅     | editor statusbar (mode, size, error count, selection path)             | component spec                           |

## 3.5 Document operations

| Feature                     | Status | Implementation                                                           | Tests                                  |
| --------------------------- | ------ | ------------------------------------------------------------------------ | -------------------------------------- |
| Copy doc / subtree / path   | ✅     | toolbar Copy (whole doc) + tree context-menu Copy / Copy path            | tree/editor components                 |
| Import (paste/file/URL)     | ✅     | Import dialog (paste/URL/file) + body file-drop, via FETCH/FILE adapters | dialogs/editor components              |
| Export (download/clipboard) | ✅     | toolbar Download (FILE_ADAPTER) + Copy (CLIPBOARD_ADAPTER)               | editor component                       |
| Compare / structural diff   | ✅     | Compare dialog → `core/diff.ts` (added/removed/changed + counts)         | `diff.spec.ts`, compare component spec |

## 3.6 UX / quality-of-life

| Feature                       | Status | Implementation                                                                        | Tests                  |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------- | ---------------------- |
| Keyboard shortcuts map        | ✅     | editor `onKeydown` (undo/redo/find/format/compact) + tree keys; README documents them | component spec         |
| Light / dark theme + tokens   | ✅     | `styles/_tokens.scss`; reactive dark incl. CodeMirror                                 | component renders both |
| Responsive / split-pane       | 🟡     | host flex layout, toolbar wraps; split-pane is host layout                            |                        |
| i18n (injectable strings)     | ✅     | `models/i18n.ts` merged via `i18n` input → editor + dialogs                           | component spec         |
| Accessibility (WCAG AA, aria) | ✅     | aria roles, focusable controls, keyboard nav; **axe 0 serious/critical**              | `a11y.spec.ts`         |

## §7 Non-functional

| Item                               | Status | Evidence                                                                                        |
| ---------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| Performance budgets met & reported | ✅     | PERF.md — 1 MB parse ~11 ms / flatten ~18 ms (budget 300 ms); `perf.spec.ts`                    |
| a11y axe zero serious/critical     | ✅     | `a11y.spec.ts` (axe-core)                                                                       |
| Web-worker offloading              | 🟡     | `HEAVY_COMPUTE` token (main-thread default, worker-safe core, host-providable); ARCHITECTURE §6 |
| Code editor lazy-loaded            | ✅     | CodeMirror dynamic-import chunk (~115 KB transfer)                                              |

## Foundations (not a §3 row, but required)

| Item                                                                         | Status | Implementation                                                        | Tests                  |
| ---------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- | ---------------------- |
| Framework-free core engine (parse, repair, patch, diff, sort, query, schema) | ✅     | `core/src/lib/*` — 93.8% stmts, 100% fns, 84.9% branches (75 specs)   | `core/**/*.spec.ts`    |
| Framework-free core types                                                    | ✅     | `core/types.ts`, `value-type.ts`, `json-pointer.ts`, `patch-types.ts` | `*.spec.ts`            |
| Library builds (ng-packagr, 5 entry points)                                  | ✅     | primary + `/core` `/transform` `/compare` `/table`                    | CI build step          |
| Playground renders the editor                                                | ✅     | `projects/playground`                                                 | build + component spec |
| Lint / format / typecheck                                                    | ✅     | `eslint.config.js`, prettier                                          | CI                     |

## §9 Packaging

| Item                                                                  | Status | Evidence                                                              |
| --------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| Secondary entry points                                                | ✅     | `/core` `/transform` `/compare` `/table` in the `exports` map         |
| Peer deps (Angular/PrimeNG/Ajv/jmespath/codemirror)                   | ✅     | library `package.json`; nothing heavy in `dependencies` (only tslib)  |
| `ng add` schematic                                                    | ✅     | `schematics/` (collection + ng-add); built into dist                  |
| Docs: README / ARCHITECTURE / PARITY / THIRD_PARTY / PERF / CHANGELOG | ✅     | repo root                                                             |
| Compodoc API docs                                                     | ✅     | `npm run docs` (CI step)                                              |
| `npm pack` consumable                                                 | ✅     | `npm run pack:lib` → 21-file tarball with fesm/types/schematics/theme |
| Bundle-size budget (core < 120 KB gz)                                 | ✅     | **43.5 KB gz**; `npm run bundlesize` (CI step)                        |
| E2E (Playwright)                                                      | ⬜     | not yet authored — known gap (see below)                              |
| TSDoc on public API                                                   | ✅     | inline TSDoc throughout `core` + models + component                   |

# Feature Parity Matrix

Maps every §3 acceptance item to its implementing file(s) and test(s). This is
the sign-off artifact; the library stays `0.x` until every row is ✅.

Legend: ✅ done & tested · 🟡 partial · ⬜ not started

## 3.1 Editor modes

| Feature | Status | Implementation | Tests |
| --- | --- | --- | --- |
| Tree mode | ✅ | `components/tree/` (virtualized CDK scroll, lazy via expansion) | `tree-model.spec.ts`, tree component spec |
| Text/Code mode | ✅ | `components/text/` + `adapters/codemirror.adapter.ts` (CM6: highlight, line numbers, bracket match, fold, gutters) | `editor-store.spec.ts`, component spec |
| Table mode | ⬜ | `components/table/` (Phase 4) | |
| Runtime mode switch | ✅ | editor component `setMode` + `EditorStore.mode` | `ngx-json-editor.component.spec.ts` |

## 3.2 Tree mode

| Feature | Status | Implementation | Tests |
| --- | --- | --- | --- |
| Inline key/value edit | ✅ | tree component + `EditorStore.updateValueAt`/`renameKeyAt` | `editor-store.spec.ts` |
| Type-aware value editors | ✅ | inline string/number/bool/null + "Convert to" menu | `editor-store.spec.ts` |
| Change value type | ✅ | context-menu "Convert to" → `EditorStore.changeTypeAt` | `value-type.spec.ts`, `editor-store.spec.ts` |
| Context menu actions | ✅ | PrimeNG ContextMenu: convert / insert / append / duplicate / sort / extract / copy / copy-path / cut / paste / remove | `editor-store.spec.ts` |
| Drag-and-drop | ✅ | HTML5 drag, before/after/inside drop indicators, reparent guard → `moveNode` | `editor-store.spec.ts` (moveNode) |
| Multi-select + bulk | ✅ | ctrl/shift-click, range, Delete → `removeSelected` (index-safe) | `editor-store.spec.ts` |
| Color/link value renderers | 🟡 | color swatch + clickable link (image/custom renderer Phase 6) | tree component |
| Expand/collapse + persistence | ✅ | `EditorStore.expanded` (pointer-keyed, preserved across modes) + expand/collapse-all | `tree-model.spec.ts`, `editor-store.spec.ts` |
| Inline validation markers | ✅ | tree row error markers (parse + schema, incl. ancestors) | tree component |

## 3.3 Text mode

| Feature | Status | Implementation | Tests |
| --- | --- | --- | --- |
| Format / Compact | ✅ | `EditorStore.format`/`compact` + toolbar | `editor-store.spec.ts`, component spec |
| Repair malformed JSON | ✅ | `core/repair.ts` + `EditorStore.repair` + toolbar | `repair.spec.ts`, `editor-store.spec.ts` |
| Real-time parse errors | ✅ | `core/parse.ts` located errors → CM lint gutter | `parse.spec.ts`, `editor-store.spec.ts` |
| Configurable indentation | ✅ | `indentation` input → store → CM indentUnit | `editor-store.spec.ts` |

## 3.4 Cross-mode toolbar

| Feature | Status | Implementation | Tests |
| --- | --- | --- | --- |
| Undo / redo | ✅ | `EditorStore` history (patch-aware) + toolbar | `editor-store.spec.ts`, component spec |
| Search + highlight | ⬜ | (Phase 4) | |
| Search & replace (text) | ⬜ | (Phase 4) | |
| Sort dialog | 🟡 | `core/sort.ts` (engine ✅, dialog Phase 4) | `sort.spec.ts` |
| Filter dialog | ⬜ | (Phase 4) | |
| Transform (JMESPath) | 🟡 | `core/query.ts` (engine ✅, dialog Phase 4) | `query.spec.ts` |
| JSON Schema validation (Ajv) | 🟡 | `core/schema.ts` (engine ✅, surfacing Phase 4) | `schema.spec.ts` |
| Status bar | ✅ | editor statusbar (mode, size, error count, selection path) | component spec |

## 3.5 Document operations

| Feature | Status | Implementation | Tests |
| --- | --- | --- | --- |
| Copy doc / subtree / path | ⬜ | (Phase 5) | |
| Import (paste/file/URL) | ⬜ | `adapters/` (Phase 5) | |
| Export (download/clipboard) | ⬜ | `adapters/` (Phase 5) | |
| Compare / structural diff | 🟡 | `core/diff.ts` (engine ✅, UI Phase 5) | `diff.spec.ts` |

## 3.6 UX / quality-of-life

| Feature | Status | Implementation | Tests |
| --- | --- | --- | --- |
| Keyboard shortcuts map | ⬜ | (Phase 6) | |
| Light / dark theme + tokens | ✅ | `styles/_tokens.scss` | component renders both |
| Responsive / split-pane | 🟡 | host flex layout | |
| i18n (injectable strings) | ✅ | `models/i18n.ts` | merged in component |
| Accessibility (WCAG AA, aria) | ⬜ | (Phase 6) | |

## Foundations (not a §3 row, but required)

| Item | Status | Implementation | Tests |
| --- | --- | --- | --- |
| Framework-free core engine (parse, repair, patch, diff, sort, query, schema) | ✅ | `core/src/lib/*` — 93.8% stmts, 100% fns, 84.9% branches (75 specs) | `core/**/*.spec.ts` |
| Framework-free core types | ✅ | `core/types.ts`, `value-type.ts`, `json-pointer.ts`, `patch-types.ts` | `*.spec.ts` |
| Library builds (ng-packagr, 2 entry points) | ✅ | `ng-package.json` + `core/ng-package.json` | CI build step |
| Playground renders the editor | ✅ | `projects/playground` | build + component spec |
| Lint / format / typecheck | ✅ | `eslint.config.js`, prettier | CI |

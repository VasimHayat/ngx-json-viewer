# Feature Parity Matrix

Maps every §3 acceptance item to its implementing file(s) and test(s). This is
the sign-off artifact; the library stays `0.x` until every row is ✅.

Legend: ✅ done & tested · 🟡 partial · ⬜ not started

## 3.1 Editor modes

| Feature | Status | Implementation | Tests |
| --- | --- | --- | --- |
| Tree mode | ⬜ | `components/tree/` (Phase 3) | |
| Text/Code mode | ⬜ | `components/text/` (Phase 2) | |
| Table mode | ⬜ | `components/table/` (Phase 4) | |
| Runtime mode switch | 🟡 | `components/editor/ngx-json-editor.component.ts` `setMode` | `ngx-json-editor.component.spec.ts` |

## 3.2 Tree mode

| Feature | Status | Implementation | Tests |
| --- | --- | --- | --- |
| Inline key/value edit | ⬜ | (Phase 3) | |
| Type-aware value editors | ⬜ | (Phase 3) | |
| Change value type | ⬜ | `core/value-type.ts` `coerceToType` | `value-type.spec.ts` |
| Context menu actions | ⬜ | (Phase 3) | |
| Drag-and-drop | ⬜ | (Phase 3) | |
| Multi-select + bulk | ⬜ | (Phase 3) | |
| Color/link value renderers | ⬜ | `models/config.ts` `ValueRenderer` | |
| Expand/collapse + persistence | ⬜ | (Phase 3) | |
| Inline validation markers | ⬜ | (Phase 4) | |

## 3.3 Text mode

| Feature | Status | Implementation | Tests |
| --- | --- | --- | --- |
| Format / Compact | 🟡 | `components/editor/...` `format`/`compact` | `ngx-json-editor.component.spec.ts` |
| Repair malformed JSON | 🟡 | `core/repair.ts` (engine ✅, UI Phase 2) | `repair.spec.ts` |
| Real-time parse errors | 🟡 | `core/parse.ts` (located errors ✅, gutters Phase 2) | `parse.spec.ts` |
| Configurable indentation | 🟡 | `indentation` input | |

## 3.4 Cross-mode toolbar

| Feature | Status | Implementation | Tests |
| --- | --- | --- | --- |
| Undo / redo | 🟡 | `core/patch.ts` invert (engine ✅, history Phase 2) | `patch.spec.ts` |
| Search + highlight | ⬜ | (Phase 4) | |
| Search & replace (text) | ⬜ | (Phase 4) | |
| Sort dialog | 🟡 | `core/sort.ts` (engine ✅, dialog Phase 4) | `sort.spec.ts` |
| Filter dialog | ⬜ | (Phase 4) | |
| Transform (JMESPath) | 🟡 | `core/query.ts` (engine ✅, dialog Phase 4) | `query.spec.ts` |
| JSON Schema validation (Ajv) | 🟡 | `core/schema.ts` (engine ✅, surfacing Phase 4) | `schema.spec.ts` |
| Status bar | 🟡 | `components/editor/...` statusbar | |

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

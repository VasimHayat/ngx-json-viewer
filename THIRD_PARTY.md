# Third-Party Dependencies & Licenses

All code in this repository is original. The library depends on the following
third-party packages (used as behavioral reference and/or runtime/peer deps).
No proprietary or copyleft source has been copied. Licenses are SPDX
identifiers; verify against each package's `LICENSE` before redistribution.

## Runtime / peer dependencies (shipped-against)

| Package                    | License    | Role                                                                |
| -------------------------- | ---------- | ------------------------------------------------------------------- |
| @angular/core, common, cdk | MIT        | Framework + virtual scroll, drag-drop, a11y, overlay                |
| primeng                    | MIT        | Menus, dialogs, dropdowns, buttons, tooltips, toasts, context menus |
| @primeng/themes            | MIT        | PrimeNG theming presets (host-provided)                             |
| primeicons                 | MIT        | Toolbar/menu icons                                                  |
| codemirror, @codemirror/\* | MIT        | Text-mode code editor (lazy-loaded, behind adapter)                 |
| @lezer/highlight           | MIT        | Syntax highlighting for CodeMirror                                  |
| ajv, ajv-formats           | MIT        | JSON Schema validation                                              |
| jmespath                   | Apache-2.0 | Default query engine for Transform                                  |
| tslib                      | 0BSD       | TypeScript runtime helpers                                          |

## Dev / tooling dependencies

| Package                                   | License                | Role                        |
| ----------------------------------------- | ---------------------- | --------------------------- |
| @angular/cli, @angular/build, ng-packagr  | MIT                    | Build & packaging           |
| typescript                                | Apache-2.0             | Compiler                    |
| eslint, typescript-eslint, angular-eslint | MIT (BSD-2 for eslint) | Linting                     |
| prettier, eslint-config-prettier          | MIT                    | Formatting                  |
| tailwindcss, postcss, autoprefixer        | MIT                    | Playground layout utilities |
| karma, jasmine, karma-\*                  | MIT                    | Unit/component test runner  |
| @playwright/test                          | Apache-2.0             | E2E (Phase 6)               |

## Behavioral references (NOT dependencies, NOT copied)

The UX and feature set were studied for parity only; no source was copied:

- jsoneditoronline.org — feature/UX reference
- svelte-jsoneditor, josdejong/jsoneditor (MIT) — behavior reference
- jmespath.org — query language semantics
- CodeMirror / Ace docs — editor behavior reference

> Note: the `jmespath` npm package is Apache-2.0. If a consumer prefers to avoid
> it, the `QUERY_ENGINE` adapter can be replaced with any other implementation.

# Performance

Targets are from spec §7. Numbers below are measured by the benchmark specs in
`projects/ngx-json-editor/src/lib/state/perf.spec.ts` (headless Chrome, dev
laptop) and printed to the Karma log on every run, so they don't drift silently.

## Budgets vs. measured

| Budget (§7)                                 | Target        | Measured                                                        |
| ------------------------------------------- | ------------- | --------------------------------------------------------------- |
| Open & render a 1 MB document — interactive | < 300 ms      | **parse 11 ms + flatten 18 ms + table 2.5 ms ≈ 32 ms**          |
| Large doc, no main-thread block             | < 50 ms/frame | collapsed flatten of a 20k-row doc: **~24 ms** (one-time)       |
| Tree scrolls at 60 fps                      | 60 fps        | CDK virtual scroll renders only visible rows                    |
| Keystroke-to-paint in text mode             | < 16 ms       | CodeMirror 6 incremental updates; store edit is O(1) signal set |

## Why it's fast

- **Lazy flattening.** `flattenTree` never traverses collapsed subtrees, so a
  fully-collapsed 25 MB document flattens to a handful of rows. Expanding a node
  only flattens that node's children.
- **Virtualization.** Tree and table use CDK virtual scroll — the DOM only ever
  holds the visible rows regardless of document size.
- **Native parse fast-path.** `parseJson` uses the engine's `JSON.parse` and
  only falls back to the (slower) location-tracking parser to report an error.
- **Signal-based store.** Edits are single signal writes; derived views
  recompute lazily and only what changed re-renders (`OnPush` everywhere).
- **Lazy code editor.** CodeMirror is a dynamic-import chunk (~115 KB transfer),
  loaded only when text mode is first shown — tree/table-only apps never pay it.

## Worker offloading

The `core` logic is framework- and DOM-free, so the expensive one-shot
operations (transform / diff / repair / schema validation) can run on a Web
Worker. They are reached through the `HEAVY_COMPUTE` DI token, whose default is
a main-thread implementation; a host supplies a worker-backed implementation for
very large documents (`limits.workerThresholdBytes`). See ARCHITECTURE.md §6.

> Note: the synchronous tree/text/table derivations stay on the main thread by
> design — measured latency (above) is already well inside budget. Worker
> offload targets multi-megabyte one-shot transforms/validation.

## Reproduce

```bash
npm run test:lib   # perf timings are printed as [perf] … lines
```

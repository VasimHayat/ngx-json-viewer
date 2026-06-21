import { JsonValue, parseJson, tableModel } from '@vasimhayat007/ngx-json-editor/core';
import { flattenTree } from './tree-model';

/**
 * Performance smoke benchmarks (spec §7). These log timings (visible in the
 * Karma output) and assert generous upper bounds so they document performance
 * without being flaky in CI. See PERF.md for representative measured numbers.
 */
describe('performance', () => {
  function makeDoc(rows: number): JsonValue {
    const arr: JsonValue[] = [];
    for (let i = 0; i < rows; i++) {
      arr.push({
        id: i,
        name: `item-${i}`,
        active: i % 2 === 0,
        score: i * 1.5,
        tags: ['alpha', 'beta', 'gamma'],
        nested: { a: i, b: `v${i}`, c: [i, i + 1] },
      });
    }
    return arr;
  }

  it('parses, flattens (collapsed), and builds a table for a ~1MB document quickly', () => {
    const doc = makeDoc(8000);
    const text = JSON.stringify(doc);
    const bytes = text.length;

    const t0 = performance.now();
    const parsed = parseJson(text);
    const t1 = performance.now();
    expect(parsed.ok).toBeTrue();
    if (!parsed.ok) return;

    const t2 = performance.now();
    const rows = flattenTree(parsed.value, new Set()); // collapsed: root + N rows
    const t3 = performance.now();

    const t4 = performance.now();
    const model = tableModel(parsed.value);
    const t5 = performance.now();

    const parseMs = (t1 - t0).toFixed(1);
    const flattenMs = (t3 - t2).toFixed(1);
    const tableMs = (t5 - t4).toFixed(1);
    console.log(
      `[perf] doc=${(bytes / 1024 / 1024).toFixed(2)}MB rows=${rows.length} | ` +
        `parse=${parseMs}ms flatten=${flattenMs}ms table=${tableMs}ms`,
    );

    expect(bytes).toBeGreaterThan(900_000); // ~1MB
    expect(t1 - t0).toBeLessThan(2000);
    expect(t3 - t2).toBeLessThan(1000);
    expect(model.columns.length).toBeGreaterThan(0);
  });

  it('flattens only the visible rows (lazy) for a deep collapsed document', () => {
    const doc = makeDoc(20000);
    const t0 = performance.now();
    const rows = flattenTree(doc, new Set()); // top-level only — children collapsed
    const t1 = performance.now();
    console.log(
      `[perf] 20k-row doc, collapsed flatten=${(t1 - t0).toFixed(1)}ms rows=${rows.length}`,
    );
    expect(rows.length).toBe(20001); // root + 20k items, children not traversed
    expect(t1 - t0).toBeLessThan(500);
  });
});

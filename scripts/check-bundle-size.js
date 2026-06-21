// Bundle-size gate (spec §7): the core library, EXCLUDING the lazily-loaded code
// editor engine, must be < 120 KB gzipped. The CodeMirror adapter ships as a
// separate chunk and is intentionally not counted.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const FESM = path.join(__dirname, '..', 'dist', 'ngx-json-editor', 'fesm2022');
const LIMIT_KB = 120;

if (!fs.existsSync(FESM)) {
  console.error('dist not found — run `npm run build:lib` first.');
  process.exit(1);
}

let total = 0;
const rows = [];
for (const file of fs.readdirSync(FESM)) {
  if (!file.endsWith('.mjs')) continue;
  const isCodeEditor = file.includes('codemirror');
  const gz = zlib.gzipSync(fs.readFileSync(path.join(FESM, file))).length;
  rows.push({ file, kb: (gz / 1024).toFixed(1), counted: !isCodeEditor });
  if (!isCodeEditor) total += gz;
}

rows.sort((a, b) => Number(b.kb) - Number(a.kb));
for (const r of rows) {
  console.log(`${r.counted ? ' ' : '~'} ${String(r.kb).padStart(7)} KB gz  ${r.file}`);
}
const totalKb = total / 1024;
console.log(`\nCore total (excl. code editor): ${totalKb.toFixed(1)} KB gz (limit ${LIMIT_KB} KB)`);
console.log('  (~ = code-editor chunk, lazy-loaded, not counted)');

if (totalKb > LIMIT_KB) {
  console.error(`\n✖ Bundle-size budget exceeded: ${totalKb.toFixed(1)} KB > ${LIMIT_KB} KB`);
  process.exit(1);
}
console.log('\n✔ Within bundle-size budget.');

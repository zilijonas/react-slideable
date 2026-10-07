import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { transform } from 'esbuild';
const old = execFileSync('tar', [
  '-xOf',
  'output/playwright/react-slideable-1.1.1.tgz',
  'package/dist/index.modern.js',
]);
const polyfill = execFileSync('tar', [
  '-xOf',
  'output/playwright/smoothscroll-polyfill-0.4.4.tgz',
  'package/dist/smoothscroll.js',
]);
const minified = (await transform(polyfill.toString(), { minify: true })).code;
const current = await readFile('dist/index.js');
for (const [label, code] of [
  ['v1 ESM', old],
  ['v1 polyfill (minified)', minified],
  ['v2 ESM', current],
  ['v2 CSS', await readFile('dist/index.css')],
]) {
  console.log(`${label}: ${Buffer.byteLength(code)} bytes, ${gzipSync(code).length} bytes gzip`);
}

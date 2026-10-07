import { readFile, writeFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const { code } = await transform(await readFile('src/styles.css', 'utf8'), { loader: 'css', minify: true });
await writeFile('dist/index.css', code);

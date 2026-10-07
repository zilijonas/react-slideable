import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const source = JSON.parse(await readFile('package.json', 'utf8'));
for (const reactVersion of ['18.3.1', '19.3.0']) {
  const directory = await mkdtemp(join(tmpdir(), 'slideable-smoke-'));
  try {
    const { devDependencies, scripts, ...manifest } = source;
    await writeFile(join(directory, 'package.json'), JSON.stringify(manifest));
    await cp('dist', join(directory, 'dist'), { recursive: true });
    await run(
      'npm',
      ['install', '--ignore-scripts', '--no-package-lock', `react@${reactVersion}`, `react-dom@${reactVersion}`],
      { cwd: directory },
    );
    await writeFile(
      join(directory, 'smoke.mjs'),
      `
      import assert from 'node:assert/strict';
      import React from 'react';
      import { renderToString } from 'react-dom/server';
      import { createRequire } from 'node:module';
      import { Slideable } from 'react-slideable';
      const cjs = createRequire(import.meta.url)('react-slideable');
      for (const Component of [Slideable, cjs.Slideable]) {
        const html = renderToString(React.createElement(Component, {
          items: [React.createElement('button', {key:'a'}, 'A'), React.createElement('button', {key:'b'}, 'B')],
          looped: true, slidesPerView: 1,
        }));
        assert.match(html, /inert=""/);
        assert.match(html, /aria-roledescription="carousel"/);
      }
      console.log('React ${reactVersion}: ESM, CJS, SSR, inert OK');
    `,
    );
    const result = await run('node', ['smoke.mjs'], { cwd: directory });
    if (result.stderr.trim()) throw new Error(result.stderr);
    console.log(result.stdout.trim());
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

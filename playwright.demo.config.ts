import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/deploy',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173/react-slideable/' },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js preview --base=/react-slideable/ --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/react-slideable/',
  },
});

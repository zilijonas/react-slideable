import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { outDir: 'demo-dist' }, server: { port: 5173, strictPort: true } });

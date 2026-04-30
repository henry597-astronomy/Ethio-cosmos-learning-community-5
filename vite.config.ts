import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { inspectAttr } from 'kimi-plugin-inspect-react';

// ESM-safe equivalent of __dirname. The previous version relied on the CommonJS
// `__dirname` global which is not defined when the project's `package.json`
// declares `"type": "module"` (which this one does), so the alias resolution
// silently broke at build time on some environments.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

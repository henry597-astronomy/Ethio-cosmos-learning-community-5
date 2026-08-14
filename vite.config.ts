import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// ESM-safe equivalent of __dirname.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Use default esbuild minifier (faster and already included)
    minify: 'esbuild',
    // Standard rollup options without artificial chunk splitting to ensure reliable load order in mobile WebViews
    rollupOptions: {},
    // Optimize chunk size
    chunkSizeWarningLimit: 2000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Ensure sourcemaps are not generated for production
    sourcemap: false,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-scroll-area',
    ],
  },
});

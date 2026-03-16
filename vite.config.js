import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        raw: resolve(__dirname, 'src/raw-json-explorer.html'),
        builder: resolve(__dirname, 'src/query-builder-explorer.html'),
      },
    },
  },
  server: {
    port: 6658,
    open: true,
  },
});

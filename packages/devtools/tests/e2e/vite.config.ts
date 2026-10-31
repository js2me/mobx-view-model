import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./fixture', import.meta.url)),
  server: {
    host: '127.0.0.1',
    port: 4178,
    strictPort: true,
  },
});

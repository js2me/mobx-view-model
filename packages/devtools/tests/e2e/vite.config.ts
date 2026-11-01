import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  root: fileURLToPath(new URL('./fixture', import.meta.url)),
  plugins: [solid({ include: /solid-app\.tsx$/ })],
  server: {
    host: '127.0.0.1',
    port: 4178,
    strictPort: true,
  },
});

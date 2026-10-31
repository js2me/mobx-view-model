import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [solid({ ssr: true, dev: false })],
  resolve: {
    conditions: ['node'],
    alias: [
      {
        find: /^solid-js\/web$/,
        replacement: path.resolve(__dirname, 'node_modules/solid-js/web/dist/server.js'),
      },
      {
        find: /^solid-js$/,
        replacement: path.resolve(__dirname, 'node_modules/solid-js/dist/server.js'),
      },
      {
        find: 'mobx-view-model',
        replacement: path.resolve(__dirname, '../core/src/index.ts'),
      },
      {
        find: 'mobx-view-model-solid',
        replacement: path.resolve(__dirname, './src/index.ts'),
      },
    ],
  },
  ssr: {
    noExternal: ['solid-js', 'mobx-solid'],
    resolve: { conditions: ['node'] },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.ssr.test.ts', 'src/**/*.ssr.test.tsx'],
  },
});

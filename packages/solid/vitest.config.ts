import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [solid()],
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 5000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'istanbul',
      include: ['src'],
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    conditions: ['development', 'browser'],
    alias: [
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
});

import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4186';

export default defineConfig({
  testMatch: 'navigation.pw.ts',
  use: { baseURL },
  webServer: {
    command: 'pnpm exec tsx --tsconfig ../tsconfig.json server.tsx',
    env: { NODE_ENV: 'production' },
    url: baseURL,
  },
});

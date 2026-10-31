import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/storybook',
  use: {
    baseURL: 'http://127.0.0.1:6006',
    viewport: { width: 1600, height: 1000 },
  },
  webServer: {
    command:
      'pnpm exec http-server storybook-static -p 6006 -a 127.0.0.1 --silent',
    url: 'http://127.0.0.1:6006',
    reuseExistingServer: !process.env.CI,
  },
});

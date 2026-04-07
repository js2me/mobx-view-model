import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const nextConfig: NextConfig = {
  /** Needed because this example depends on `mobx-view-model` via `file:../../dist`. */
  transpilePackages: ['mobx-view-model'],
  reactStrictMode: false,
  /** Silence the “multiple lockfiles” warning when the app lives inside a monorepo. */
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;

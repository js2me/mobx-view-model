import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['mobx-view-model'],
  /** Silence the “multiple lockfiles” warning when the app lives inside a monorepo. */
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;

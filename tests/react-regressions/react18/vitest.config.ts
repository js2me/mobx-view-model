import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(
        __dirname,
        './node_modules/react/jsx-runtime.js',
      ),
      'react/jsx-dev-runtime': path.resolve(
        __dirname,
        './node_modules/react/jsx-dev-runtime.js',
      ),
      'mobx-react-lite': path.resolve(
        __dirname,
        './node_modules/mobx-react-lite',
      ),
      'mobx-view-model': path.resolve(repoRoot, 'packages/core/src/index.ts'),
      'mobx-view-model-react': path.resolve(
        repoRoot,
        'packages/react/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'jsdom',
  },
});

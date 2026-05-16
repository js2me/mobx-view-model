import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigsManager } from 'sborshik/utils';
import { defineLibVitestConfig } from 'sborshik/vite';
import { vitestMobxAliases } from '../react/vitest.resolve-aliases.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactPackageRoot = path.resolve(__dirname, '../react');
const corePackageRoot = path.resolve(__dirname, '../core');

export default defineLibVitestConfig(ConfigsManager.create(), {
  server: {
    fs: {
      allow: [__dirname, reactPackageRoot, corePackageRoot],
    },
  },
  resolve: {
    alias: [...vitestMobxAliases],
  },
  test: {
    include: ['../react/src/**/*.react-matrix.test.tsx'],
    env: {
      MOBX_VM_REACT_MATRIX_EXPECT_OBSERVER_PAYLOAD_VIEW_CALLS: '7',
    },
  },
});

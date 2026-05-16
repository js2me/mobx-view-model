import { ConfigsManager } from 'sborshik/utils';
import { defineLibVitestConfig } from 'sborshik/vite';
import { vitestMobxAliases } from './vitest.resolve-aliases.js';

export default defineLibVitestConfig(ConfigsManager.create(), {
  resolve: {
    alias: [...vitestMobxAliases],
  },
  test: {
    env: {
      MOBX_VM_REACT_MATRIX_EXPECT_OBSERVER_PAYLOAD_VIEW_CALLS: '7',
    },
  },
});

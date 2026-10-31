import { ConfigsManager } from 'sborshik/utils';
import { defineLibViteConfig } from 'sborshik/vite';
export default defineLibViteConfig(
  ConfigsManager.create(process.cwd(), { tsconfigName: 'tsconfig.build' }),
  {
    omitStrangeExportEntries: true,
    distExtraFiles: [{ from: '../../LICENSE' }],
    rewritePackagePaths: true,
    externalDeps: [
      'mobx-view-model',
      'mobx',
      'vue',
      'yummies',
      'yummies/types',
    ],
  },
);

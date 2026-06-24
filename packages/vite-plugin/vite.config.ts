import { ConfigsManager } from 'sborshik/utils';
import { defineLibViteConfig } from 'sborshik/vite';

export default defineLibViteConfig(
  ConfigsManager.create(process.cwd(), { tsconfigName: 'tsconfig.build' }),
  {
    omitStrangeExportEntries: true,
    distExtraFiles: [{ from: '../../LICENSE' }],
    rewritePackagePaths: true,
    externalDeps: [
      'node:module',
      'node:fs',
      'node:path',
      'mobx-view-model',
      'mobx-view-model-react',
      'vite',
      'magic-string',
    ],
  },
);

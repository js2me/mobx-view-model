import { ConfigsManager } from 'sborshik/utils';
import { defineLibViteConfig } from 'sborshik/vite';

export default defineLibViteConfig(
  ConfigsManager.create(process.cwd(), { tsconfigName: 'tsconfig.build' }),
  {
  omitStrangeExportEntries: true,
  distExtraFilesRoot: '../..',
  distExtraFilesNames: ['LICENSE', 'README.md'],
  rewritePackagePaths: true,
  externalDeps: ['mobx-view-model', 'mobx']
  },
);

import { ConfigsManager } from 'sborshik/utils';
import { defineLibViteConfig } from 'sborshik/vite';

export default defineLibViteConfig(
  ConfigsManager.create(process.cwd(), { tsconfigName: 'tsconfig.build' }),
  {
    omitStrangeExportEntries: true,
    distExtraFilesRoot: '../..',
    distExtraFilesNames: ['LICENSE', 'README.md'],
    rewritePackagePaths: true,
    // Keep type-only subpath imports package-based in emitted d.ts files.
    externalDeps: ['mobx-view-model', 'mobx', 'yummies', 'yummies/types'],
  },
);

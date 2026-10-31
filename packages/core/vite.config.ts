import { ConfigsManager } from 'sborshik/utils';
import { defineLibViteConfig } from 'sborshik/vite';

export default defineLibViteConfig(ConfigsManager.create(), {
  omitStrangeExportEntries: true,
  distExtraFilesRoot: '../..',
  distExtraFilesNames: ['LICENSE', 'README.md'],
  rewritePackagePaths: true,
});

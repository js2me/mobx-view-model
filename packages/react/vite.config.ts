import { ConfigsManager } from 'sborshik/utils';
import { defineLibViteConfig } from 'sborshik/vite';

export default defineLibViteConfig(ConfigsManager.create(), {
  omitStrangeExportEntries: true,
  externalDeps: ['mobx-view-model'],
  distExtraFilesRoot: '../..',
  distExtraFilesNames: ['LICENSE', 'README.md'],
});

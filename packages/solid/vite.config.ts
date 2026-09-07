import solid from 'vite-plugin-solid';
import { ConfigsManager } from 'sborshik/utils';
import { defineLibViteConfig } from 'sborshik/vite';
import { mergeConfig } from 'vite';

export default mergeConfig(
  defineLibViteConfig(
    ConfigsManager.create(process.cwd(), { tsconfigName: 'tsconfig.build' }),
    {
      omitStrangeExportEntries: true,
      distExtraFiles: [{ from: '../../LICENSE' }],
      rewritePackagePaths: true,
      externalDeps: [
        'mobx-view-model',
        'mobx',
        'mobx-solid',
        'solid-js',
        'solid-js/web',
        'yummies',
        'yummies/types',
      ],
    },
  ),
  {
    plugins: [solid()],
  },
);

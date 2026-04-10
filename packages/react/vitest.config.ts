import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigsManager } from 'sborshik/utils';
import { defineLibVitestConfig } from 'sborshik/vite';
import { mergeConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  defineLibVitestConfig(ConfigsManager.create()),
  {
    resolve: {
      alias: [
        {
          find: 'mobx-view-model/react',
          replacement: path.resolve(
            __dirname,
            '../core/src/react-subpath.ts',
          ),
        },
        {
          find: 'mobx-view-model',
          replacement: path.resolve(
            __dirname,
            '../core/src/index.ts',
          ),
        },
        {
          find: 'mobx-view-model-react',
          replacement: path.resolve(__dirname, './src/index.ts'),
        },
      ],
    },
  },
);

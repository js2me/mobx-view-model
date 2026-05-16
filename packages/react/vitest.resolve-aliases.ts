import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const vitestMobxAliases = [
  {
    find: 'mobx-view-model/react',
    replacement: path.resolve(__dirname, '../core/src/react-subpath.ts'),
  },
  {
    find: 'mobx-view-model',
    replacement: path.resolve(__dirname, '../core/src/index.ts'),
  },
  {
    find: 'mobx-view-model-react',
    replacement: path.resolve(__dirname, './src/index.ts'),
  },
] as const;

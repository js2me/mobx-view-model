import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.tsx'],
  framework: '@storybook/react-vite',
  async viteFinal(config) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(root, 'src'),
      react: path.join(root, 'node_modules/react'),
      'react-dom': path.join(root, 'node_modules/react-dom'),
      'mobx-react-lite': path.join(root, 'node_modules/mobx-react-lite'),
    };
    config.resolve.dedupe = ['react', 'react-dom', 'mobx-react-lite', 'mobx'];
    return config;
  },
};
export default config;

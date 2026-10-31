document.body.dataset.backdrop =
  new URLSearchParams(location.search).get('backdrop') ?? 'light';

import { ViewModelDevtools } from '../../../dist/index.js';

const data = {
  accountName: 'Ada Lovelace',
  isAuthenticated: true,
  preferences: { theme: 'dark', compactMode: false },
  recentProjects: ['engine', 'dashboard'],
};
const config = {
  defaultIsOpened: true,
  position: 'top-right' as const,
  display: { sortPropertiesBy: 'asc' as const },
  extras: data,
};
const fixture = {
  data,
  devtools: ViewModelDevtools.define(config),
  recreate() {
    this.devtools = ViewModelDevtools.define(config);
  },
};
Object.assign(globalThis, { fixture });

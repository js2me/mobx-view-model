import { ViewModelDevtools } from '../../../dist/index.js';

ViewModelDevtools.define({
  defaultIsOpened: true,
  position: 'top-right',
  display: {
    theme: 'light',
    sortPropertiesBy: 'asc',
  },
  extras: {
    accountName: 'Ada Lovelace',
    isAuthenticated: true,
    preferences: {
      theme: 'dark',
      compactMode: false,
    },
    recentProjects: ['engine', 'dashboard'],
  },
});

import { createStorageData } from 'mobx-web-api';

export type DevtoolsTheme = 'light' | 'auto' | 'dark';
export type ResolvedDevtoolsTheme = 'light' | 'dark';

const settingsStorage = createStorageData({
  prefix: 'mobx-view-model-devtools:',
});

export const devtoolsThemeKey = settingsStorage.key<DevtoolsTheme>(
  'theme',
  'auto',
);

export const devtoolsHideViewModelBaseKey = settingsStorage.key<boolean>(
  'hideViewModelBaseMembers',
  false,
);

export const devtoolsHighlightUpdatesKey = settingsStorage.key<boolean>(
  'highlightUpdates',
  true,
);

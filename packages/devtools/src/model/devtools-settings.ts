import { Storage } from 'mobx-swiss-knife';
import { colorScheme } from 'mobx-web-api';
import {
  annotation,
  applyObservable,
  type ObservableAnnotationsArray,
} from 'yummies/mobx';
import type {
  DevtoolsPosition,
  ViewModelDevtoolsConfig,
  ViewModelDevtoolsPresentationMode,
  ViewModelDevtoolsSortPropertiesBy,
} from './devtools-config';
import {
  type DevtoolsTheme,
  devtoolsHideViewModelBaseKey,
  devtoolsHighlightUpdatesKey,
  devtoolsThemeKey,
  hasPersistedDevtoolsSetting,
  type ResolvedDevtoolsTheme,
} from './devtools-settings-storage';
import type { InspectorSearch } from './search/search-model';

const annotations: ObservableAnnotationsArray<DevtoolsSettings> = [
  [
    annotation.observableRef,
    'presentationMode',
    'sortPropertiesBy',
    'position',
    'groupViewModelBaseMembers',
  ],
  [
    annotation.computed,
    'theme',
    'resolvedTheme',
    'hideViewModelBaseMembers',
    'highlightUpdates',
  ],
  [
    annotation.actionBound,
    'setPresentationMode',
    'setSortPropertiesBy',
    'setTheme',
    'setShowInternals',
    'setGroupViewModelBaseMembers',
    'setHighlightUpdates',
    'setPosition',
  ],
];

export class DevtoolsSettings {
  private readonly lifetime = new AbortController();
  private readonly storage = new Storage({
    namespace: 'mobx-view-model-devtools',
    type: 'local',
    abortSignal: this.lifetime.signal,
  });
  presentationMode: ViewModelDevtoolsPresentationMode;
  sortPropertiesBy: ViewModelDevtoolsSortPropertiesBy;
  position: DevtoolsPosition;
  groupViewModelBaseMembers: boolean;

  constructor(config: ViewModelDevtoolsConfig) {
    this.presentationMode =
      this.storage.get({ key: 'presentationMode' }) ??
      config.display?.presentationMode ??
      'tree';
    this.sortPropertiesBy =
      this.storage.get({ key: 'sortPropertiesBy' }) ??
      config.display?.sortPropertiesBy ??
      'none';
    this.groupViewModelBaseMembers =
      this.storage.get({ key: 'groupViewModelBaseMembers' }) ??
      config.display?.groupViewModelBaseMembers ??
      true;
    this.position =
      this.storage.get({ key: 'position' }) ?? config.position ?? 'top-right';
    const display = config.display;
    if (display?.theme !== undefined && !hasPersistedDevtoolsSetting('theme'))
      devtoolsThemeKey.value = display.theme;
    if (
      display?.showInternals !== undefined &&
      !hasPersistedDevtoolsSetting('hideViewModelBaseMembers')
    )
      devtoolsHideViewModelBaseKey.value = !display.showInternals;
    if (
      display?.highlightUpdates !== undefined &&
      !hasPersistedDevtoolsSetting('highlightUpdates')
    )
      devtoolsHighlightUpdatesKey.value = display.highlightUpdates;
    applyObservable(this, annotations);
    this.storage.syncProperty(this, 'presentationMode');
    this.storage.syncProperty(this, 'sortPropertiesBy');
    this.storage.syncProperty(this, 'position');
    this.storage.syncProperty(this, 'groupViewModelBaseMembers');
  }

  get theme(): DevtoolsTheme {
    return devtoolsThemeKey.value;
  }
  get resolvedTheme(): ResolvedDevtoolsTheme {
    return this.theme === 'auto'
      ? colorScheme.isLight
        ? 'light'
        : 'dark'
      : this.theme;
  }
  get hideViewModelBaseMembers() {
    return devtoolsHideViewModelBaseKey.value;
  }
  shouldHideBaseProperties(isSearching: boolean) {
    return this.groupViewModelBaseMembers
      ? isSearching
      : this.hideViewModelBaseMembers;
  }
  get highlightUpdates() {
    return devtoolsHighlightUpdatesKey.value;
  }
  get savedSearchText(): string {
    return this.storage.get({ key: 'searchText' }) ?? '';
  }

  setPresentationMode(mode: string) {
    this.presentationMode = mode === 'list' ? 'list' : 'tree';
  }
  setSortPropertiesBy(sort: string) {
    this.sortPropertiesBy = sort === 'asc' || sort === 'desc' ? sort : 'none';
  }
  setPosition(position: DevtoolsPosition) {
    this.position = position;
  }
  setTheme(theme: string) {
    devtoolsThemeKey.value =
      theme === 'light' || theme === 'dark' ? theme : 'auto';
  }
  setShowInternals(show: boolean) {
    devtoolsHideViewModelBaseKey.value = !show;
  }
  setGroupViewModelBaseMembers(group: boolean) {
    this.groupViewModelBaseMembers = group;
  }
  setHighlightUpdates(highlight: boolean) {
    devtoolsHighlightUpdatesKey.value = highlight;
  }
  persistSearch(search: InspectorSearch) {
    this.storage.syncProperty(search, 'searchText');
  }
  destroy() {
    this.lifetime.abort();
  }
}

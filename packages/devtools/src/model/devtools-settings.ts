import { action, computed, makeObservable, observable } from 'mobx';
import { Storage } from 'mobx-swiss-knife';
import { colorScheme } from 'mobx-web-api';
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

  constructor(config: ViewModelDevtoolsConfig) {
    this.presentationMode =
      this.storage.get({ key: 'presentationMode' }) ??
      config.display?.presentationMode ??
      'tree';
    this.sortPropertiesBy =
      this.storage.get({ key: 'sortPropertiesBy' }) ??
      config.display?.sortPropertiesBy ??
      'none';
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
    makeObservable(this, {
      presentationMode: observable.ref,
      sortPropertiesBy: observable.ref,
      position: observable.ref,
      theme: computed,
      resolvedTheme: computed,
      hideViewModelBaseMembers: computed,
      highlightUpdates: computed,
      setPresentationMode: action.bound,
      setSortPropertiesBy: action.bound,
      setTheme: action.bound,
      setShowInternals: action.bound,
      setHighlightUpdates: action.bound,
      setPosition: action.bound,
    });
    this.storage.syncProperty(this, 'presentationMode');
    this.storage.syncProperty(this, 'sortPropertiesBy');
    this.storage.syncProperty(this, 'position');
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

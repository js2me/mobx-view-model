import {
  action,
  computed,
  createAtom,
  makeObservable,
  observable,
  reaction,
} from 'mobx';
import { Storage } from 'mobx-swiss-knife';
import type { AnyViewModel, ViewModelStoreBase } from 'mobx-view-model';
import type { AnyObject, Maybe } from 'yummies/types';
import type { DevtoolsSettings } from './devtools-settings';
import { ViewModelImpl } from './lib/view-model.impl';
import { ExtraListItem } from './list-item/extra-list-item';
import type { ListItem } from './list-item/list-item';
import { PropertyListItem } from './list-item/property-list-item';
import { VMListItem } from './list-item/vm-list-item';
import type { NotificationSink } from './notifications';
import { InspectorSearch } from './search/search-model';
import type { AnyVM } from './types';

export interface InspectorViewport {
  scrollTo(offset: number): void;
  scrollBy(offset: number): void;
}

export class DevtoolsInspector {
  private readonly lifetime = new AbortController();
  private readonly changed = createAtom('inspected view models');
  readonly expansion = observable.map<string, boolean>();
  readonly items = new Map<string, ListItem<any>>();
  readonly search: InspectorSearch;
  viewport?: InspectorViewport;
  store?: Maybe<ViewModelStoreBase<AnyViewModel>>;
  extras?: Maybe<AnyObject>;
  watchedPropertyKeys: string[];

  constructor(
    readonly settings: DevtoolsSettings,
    readonly notifications: NotificationSink,
  ) {
    const session = new Storage({
      namespace: 'mobx-view-model-devtools',
      type: 'session',
      abortSignal: this.lifetime.signal,
    });
    this.watchedPropertyKeys =
      session.get({ key: 'watchedPropertyKeys' }) ?? [];
    this.search = new InspectorSearch({
      getRootItems: () => this.rootItems,
      getPresentationMode: () => settings.presentationMode,
      scrollToOffset: (offset) => this.viewport?.scrollTo(offset),
      initialSearchText: settings.savedSearchText,
    });
    makeObservable(this, {
      store: observable.ref,
      extras: observable.ref,
      watchedPropertyKeys: observable.ref,
      rootItems: computed.struct,
      listItems: computed.struct,
      isActive: computed,
      setStore: action.bound,
      setExtras: action.bound,
      addWatchedPropertyKey: action.bound,
      removeWatchedPropertyKey: action.bound,
      expandAll: action.bound,
      collapseAll: action.bound,
    });
    session.syncProperty(this, 'watchedPropertyKeys');
    settings.persistSearch(this.search);
    reaction(
      () => settings.presentationMode,
      () => this.clearExpansion(),
      { signal: this.lifetime.signal },
    );
  }

  get allVms(): AnyVM[] {
    this.changed.reportObserved();
    const map = (
      this.store as unknown as { viewModels?: Map<string, AnyVM> } | undefined
    )?.viewModels;
    return [...(map?.values() ?? [])].filter(
      (vm) =>
        !Object.prototype.isPrototypeOf.call(ViewModelImpl, vm.constructor),
    );
  }
  get rootItems(): ListItem<any>[] {
    const vms = this.allVms;
    const roots: ListItem<any>[] = vms
      .filter((vm) => vm.parentViewModel == null)
      .map((vm) => new VMListItem(this, vm, vms));
    if (this.extras) roots.push(new ExtraListItem(this, this.extras));
    return roots;
  }
  get listItems() {
    return this.search.getListItems(this.rootItems);
  }
  get isActive() {
    return !!this.store || Object.keys(this.extras ?? {}).length > 0;
  }
  setStore(store: ViewModelStoreBase<AnyViewModel> | undefined) {
    if (this.store === store) return;
    this.clearItems();
    this.store = store;
  }
  setExtras(extras: Maybe<AnyObject>) {
    if (this.extras === extras) return;
    this.clearItems();
    this.extras = extras;
  }
  notifyVmChange() {
    this.changed.reportChanged();
  }
  addWatchedPropertyKey(key: string) {
    if (!this.watchedPropertyKeys.includes(key))
      this.watchedPropertyKeys = [...this.watchedPropertyKeys, key];
  }
  removeWatchedPropertyKey(key: string) {
    this.watchedPropertyKeys = this.watchedPropertyKeys.filter(
      (existing) => existing !== key,
    );
  }
  isExpandable(item: VMListItem) {
    return this.settings.presentationMode === 'list'
      ? item.children.some((child) => !(child instanceof VMListItem))
      : item.isExpandable;
  }
  private clearExpansion() {
    this.expansion.clear();
  }
  expandAll() {
    for (const item of this.rootItems) item.expand();
  }
  collapseAll() {
    for (const item of this.rootItems) item.collapse();
  }
  private clearItems() {
    for (const item of this.items.values()) {
      if (item instanceof PropertyListItem) item.destroy();
    }
    this.items.clear();
  }
  destroy() {
    this.lifetime.abort();
    this.search.destroy();
    this.clearItems();
    this.expansion.clear();
    this.viewport = undefined;
  }
}

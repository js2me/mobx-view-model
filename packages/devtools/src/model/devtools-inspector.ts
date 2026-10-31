import {
  action,
  comparer,
  computed,
  createAtom,
  makeObservable,
  observable,
  reaction,
} from 'mobx';
import { Storage } from 'mobx-swiss-knife';
import type { AnyObject, Maybe } from 'yummies/types';
import { createInspectorRows } from './create-inspector-rows';
import type { ViewModelStoreSource } from './devtools-config';
import type { DevtoolsSettings } from './devtools-settings';
import { getStoreViewModels } from './inspection/get-store-view-models';
import { ViewModelImpl } from './lib/view-model.impl';
import { ExtraListItem } from './list-item/extra-list-item';
import { getOwnerVm } from './list-item/get-owner-vm';
import type { ListItem } from './list-item/list-item';
import { PropertyListItem } from './list-item/property-list-item';
import { getViewModelItemKey, VMListItem } from './list-item/vm-list-item';
import type { NotificationSink } from './notifications';
import { InspectorSearch } from './search/search-model';
import type { AnyVM } from './types';
import { ViewModelTree } from './view-model-tree';

export interface InspectorViewport {
  scrollTo(offset: number): void;
  scrollBy(offset: number): void;
}

export class DevtoolsInspector {
  private readonly lifetime = new AbortController();
  private readonly changed = createAtom('inspected view models');
  private readonly layoutChanged = createAtom('inspector row layout');
  private readonly vmItems = new Map<AnyVM, VMListItem>();
  readonly expansion = observable.map<string, boolean>();
  readonly items = new Map<string, ListItem<any>>();
  readonly search: InspectorSearch;
  viewport?: InspectorViewport;
  store?: Maybe<ViewModelStoreSource>;
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
      getRows: () => this.rows,
      getPresentationMode: () => settings.presentationMode,
      scrollToOffset: (offset) => this.viewport?.scrollTo(offset),
      initialSearchText: settings.savedSearchText,
    });
    makeObservable(this, {
      store: observable.ref,
      extras: observable.ref,
      watchedPropertyKeys: observable.ref,
      allVms: computed({ equals: comparer.shallow }),
      tree: computed,
      rootItems: computed,
      rows: computed,
      isActive: computed,
      setStore: action.bound,
      setExtras: action.bound,
      addWatchedPropertyKey: action.bound,
      removeWatchedPropertyKey: action.bound,
      expandAll: action.bound,
      collapseAll: action.bound,
    });
    reaction(
      () => this.tree,
      (tree, previous) => {
        const live = new Set(tree.viewModels);
        const removed = new Set<AnyVM>();
        for (const vm of previous.viewModels) {
          if (live.has(vm)) continue;
          removed.add(vm);
          this.vmItems.delete(vm);
          this.expansion.delete(getViewModelItemKey(vm));
        }
        if (!removed.size) return;
        for (const [key, item] of this.items) {
          const owner = getOwnerVm(item);
          if (owner && removed.has(owner)) {
            if (item instanceof PropertyListItem) item.destroy();
            this.expansion.delete(item.key);
            this.items.delete(key);
          }
        }
      },
      { signal: this.lifetime.signal },
    );
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
    return this.readViewModels();
  }
  readViewModels(): AnyVM[] {
    const values = this.store ? getStoreViewModels(this.store) : [];
    return [...values].filter(
      (vm) =>
        !Object.prototype.isPrototypeOf.call(ViewModelImpl, vm.constructor),
    );
  }
  get tree() {
    this.changed.reportObserved();
    return new ViewModelTree(this.allVms);
  }
  get autoExpandViewModels() {
    return this.allVms.length <= 100;
  }
  getVmItem(vm: AnyVM): VMListItem {
    const cached = this.vmItems.get(vm);
    if (cached) return cached;
    const item = new VMListItem(this, vm);
    this.vmItems.set(vm, item);
    return item;
  }

  get rootItems(): ListItem<any>[] {
    const roots: ListItem<any>[] = this.tree.roots.map((vm) =>
      this.getVmItem(vm),
    );
    if (this.extras) roots.push(new ExtraListItem(this, this.extras));
    return roots;
  }
  get rows() {
    this.layoutChanged.reportObserved();
    return createInspectorRows(this);
  }
  get listItems() {
    return this.rows.slice();
  }
  notifyLayoutChange() {
    this.layoutChanged.reportChanged();
  }
  get isActive() {
    return !!this.store || Object.keys(this.extras ?? {}).length > 0;
  }
  setStore(store: ViewModelStoreSource | undefined) {
    if (store !== undefined) getStoreViewModels(store);
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
      ? item.propertyKeys.length > 0
      : item.isExpandable;
  }
  private clearExpansion() {
    this.expansion.clear();
  }
  expandAll() {
    for (const vm of this.allVms)
      this.expansion.set(`${vm.constructor.name}-${vm.id}`, true);
  }
  collapseAll() {
    for (const vm of this.allVms)
      this.expansion.set(`${vm.constructor.name}-${vm.id}`, false);
  }
  private clearItems() {
    for (const item of this.items.values()) {
      if (item instanceof PropertyListItem) item.destroy();
    }
    this.items.clear();
    this.vmItems.clear();
  }
  destroy() {
    this.lifetime.abort();
    this.search.destroy();
    this.clearItems();
    this.expansion.clear();
    this.viewport = undefined;
  }
}

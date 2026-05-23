import {
  action,
  computed,
  makeObservable,
  type ObservableSet,
  observable,
  reaction,
} from 'mobx';
import { Storage } from 'mobx-swiss-knife';
import { colorScheme } from 'mobx-web-api';
import {
  type DevtoolsTheme,
  devtoolsHideViewModelBaseKey,
  devtoolsThemeKey,
  type ResolvedDevtoolsTheme,
} from './devtools-settings-storage';

export type { DevtoolsTheme, ResolvedDevtoolsTheme };
import type {
  AnyViewModel,
  ViewModelParams,
  ViewModelStoreBase,
} from 'mobx-view-model';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { VirtualizerHandle, VListHandle } from 'virtua';
import { createRef, type Ref } from 'yummies/mobx';
import type { AnyObject, Defined, Maybe } from 'yummies/types';
import { DevtoolsClient } from '@/ui/devtools-client';
import { Notifications } from '@/ui/devtools-content/notifications';
import css from '../styles.module.css';
import { KeyboardHandler } from './keyboard-handler';
import { ViewModelImpl } from './lib/view-model.impl';
import { ViewModelStoreImpl } from './lib/view-model-store.impl';
import { ExtraListItem } from './list-item/extra-list-item';
import type { ListItem } from './list-item/list-item';
import type { PropertyListItem } from './list-item/property-list-item';
import { VMListItem } from './list-item/vm-list-item';
import { SearchEngine } from './search-engine';
import type { AnyVM } from './types';

export interface ViewModelDevtoolsConfig {
  containerId?: string;
  defaultIsOpened?: boolean;
  viewModels?: ViewModelStoreBase;
  position?: 'top-right' | 'top-left' | 'bottom-left' | 'bottom-right';
  buttonClassName?: string;
  extras?: AnyObject;
}

export class ViewModelDevtools {
  isPopupOpened: boolean;
  displayType: string;
  vmStore: ViewModelStoreBase;
  projectVmStore?: Maybe<ViewModelStoreBase<AnyViewModel>>;
  extras: Maybe<AnyObject>;
  expandedVmItemsPaths: ObservableSet<string>;
  logoUrl: string;
  scrollContentRef: Ref<HTMLDivElement>;
  keyboardHandler: KeyboardHandler;
  searchEngine: SearchEngine;
  presentationMode: 'tree' | 'list';
  sortPropertiesBy: 'asc' | 'desc' | 'none';
  position: Defined<ViewModelDevtoolsConfig['position']>;
  scrollListRef: Ref<VirtualizerHandle>;

  private storage = new Storage({
    namespace: 'mobx-view-model-devtools',
    type: 'session',
  });

  anyCache = observable.map<string, any>();

  get allVms() {
    const vmStore = this.projectVmStore as Maybe<ViewModelStoreBase>;
    const viewModelsMap =
      ((vmStore as any)?.viewModels as Map<string, AnyVM>) ?? new Map();

    return [...viewModelsMap.values()].filter(
      (vm) => !Object.prototype.isPrototypeOf.call(ViewModelImpl, vm.constructor),
    );
  }

  private get rootVmListItems() {
    return this.allVms
      .filter((vm) => {
        const vmParams = this.getVmParams(vm);
        return !vmParams || vmParams.parentViewModel == null;
      })
      .map((vm) => new VMListItem(this, vm, this.allVms));
  }

  private get extraListItems() {
    if (!this.extras) {
      return [];
    }
    return [new ExtraListItem(this, this.extras)];
  }

  private get searchRootItems(): ListItem<any>[] {
    return [...this.rootVmListItems, ...this.extraListItems];
  }

  get listItems(): ListItem<any>[] {
    return this.searchEngine.getListItems(this.searchRootItems);
  }


  get isActive() {
    return !!this.projectVmStore || Object.keys(this.extras || {}).length > 0;
  }

  private get containerId() {
    return this.config.containerId ?? 'view-model-devtools';
  }

  isExpanded(vmItem: VMListItem) {
    return this.searchEngine.isVmItemExpanded(vmItem);
  }

  checkIsExtraPathExpanded(path: string) {
    const expandedKey = `__EXTRA__%%%${path}`;

    return this.expandedVmItemsPaths.has(expandedKey);
  }

  handleExpandVmPropertyClick(vmItem: VMListItem, path: string) {
    const expandedKey = `${vmItem.key}%%%${path}`;

    if (this.expandedVmItemsPaths.has(expandedKey)) {
      this.expandedVmItemsPaths.delete(expandedKey);
    } else {
      this.expandedVmItemsPaths.add(expandedKey);
    }
  }

  handlePropertyClick(
    item: PropertyListItem,
    _e: React.MouseEvent<HTMLElement>,
  ) {
    item.toggleExpand();
  }

  handleVmItemHeaderClick(vmItem: VMListItem): void {
    vmItem.toggleExpand();
  }

  isExpandable(vmItem: VMListItem): boolean | undefined {
    if (this.presentationMode === 'list') {
      return vmItem.children.some((c) => !(c instanceof VMListItem));
    }
    return vmItem.isExpandable;
  }

  private getVmParams(vm: AnyVM): null | ViewModelParams {
    if ('vmParams' in vm) {
      return vm.vmParams as ViewModelParams;
    }

    return null;
  }

  setStore(viewModels: ViewModelStoreBase<AnyViewModel> | undefined) {
    this.projectVmStore = viewModels;
  }

  setExtras(extras: Maybe<AnyObject>) {
    this.extras = extras;
  }

  handleChangePresentationMode = (mode: string) => {
    this.presentationMode = mode === 'list' ? 'list' : 'tree';
    this.expandedVmItemsPaths.clear();
    // this.expandedVmsMap.clear();
  };

  handleSortPropertiesChange = (sortBy: string) => {
    this.sortPropertiesBy = sortBy as any;
  };

  get theme(): DevtoolsTheme {
    return devtoolsThemeKey.value;
  }

  get hideViewModelBaseMembers(): boolean {
    return devtoolsHideViewModelBaseKey.value;
  }

  handleThemeChange = (theme: string) => {
    devtoolsThemeKey.value =
      theme === 'light' || theme === 'dark' ? theme : 'auto';
    this.applyThemeToContainer();
  };

  handleHideViewModelBaseMembersChange = (hide: boolean) => {
    devtoolsHideViewModelBaseKey.value = hide;
  };

  get resolvedTheme(): ResolvedDevtoolsTheme {
    if (this.theme === 'light') {
      return 'light';
    }

    if (this.theme === 'dark') {
      return 'dark';
    }

    return colorScheme.isLight ? 'light' : 'dark';
  }

  private applyThemeToContainer() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.dataset.vmdTheme = this.resolvedTheme;
    }
  }

  expandAllVMs() {
    // this.expandedVmsMap.replace(
    //   this.vmsData.flatten.map((it) => [it.key, true] as const),
    // );
  }

  collapseAllVms() {
    // this.expandedVmsMap.clear();
  }

  showPopup() {
    this.isPopupOpened = true;
    this.expandAllVMs();
  }

  get notifications() {
    return this.vmStore.get(Notifications)!;
  }

  hidePopup() {
    this.isPopupOpened = false;
  }

  private init() {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    this.storage.syncProperty(this, 'sortPropertiesBy');
    this.storage.syncProperty(this, 'presentationMode');
    this.storage.syncProperty(this, 'position');
    this.applyThemeToContainer();

    reaction(() => devtoolsThemeKey.value, () => this.applyThemeToContainer());

    reaction(
      () => colorScheme.scheme,
      () => {
        if (this.theme === 'auto') {
          this.applyThemeToContainer();
        }
      },
    );
  }

  private isInitialized = false;

  render() {
    let container = document.querySelector(
      `#${this.containerId}`,
    ) as Maybe<HTMLDivElement>;

    if (!container) {
      container = document.createElement('div');
      container.className = css.root;
      container.id = this.containerId;
      container.dataset.vmdTheme = this.resolvedTheme;

      if (document.body) {
        document.body.appendChild(container);
        const root = createRoot(container!);
        root.render(
          createElement(DevtoolsClient, { payload: { devtools: this } }),
        );
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(container!);
          const root = createRoot(container!);
          root.render(
            createElement(DevtoolsClient, { payload: { devtools: this } }),
          );
        });
      }
    }

    this.init();
  }

  private static _instance: ViewModelDevtools | null = null;

  private constructor(public config: ViewModelDevtoolsConfig) {
    this.isPopupOpened = !!this.config.defaultIsOpened;
    this.displayType = 'popup';
    this.position =
      this.storage.get({ key: 'position' }) ??
      this.config.position ??
      'top-right';
    this.vmStore = new ViewModelStoreImpl();
    this.setExtras(this.config.extras);
    this.setStore(this.config.viewModels);
    this.presentationMode =
      this.storage.get({ key: 'presentationMode' }) ?? 'tree';
    this.sortPropertiesBy =
      this.storage.get({ key: 'sortPropertiesBy' }) ?? 'none';
    this.expandedVmItemsPaths = observable.set<string>();
    this.logoUrl =
      'data:image/png;base64,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';
    this.scrollContentRef = createRef<HTMLDivElement>();
    this.scrollListRef = createRef<VListHandle>();
    this.keyboardHandler = new KeyboardHandler(this);
    this.searchEngine = new SearchEngine({
      getContainerId: () => this.containerId,
      getIsActive: () => this.isActive,
      getItemOffset: (index) => this.scrollListRef.current?.getItemOffset(index) ?? 0,
      scrollToOffset: (offset) => this.scrollListRef.current?.scrollTo(offset),
      getRootItems: () => this.searchRootItems,
      getPresentationMode: () => this.presentationMode,
    });

    makeObservable<typeof this, 'rootVmListItems' | 'extraListItems'>(this, {
      position: observable.ref,
      isPopupOpened: observable.ref,
      projectVmStore: observable.ref,
      presentationMode: observable.ref,
      sortPropertiesBy: observable.ref,
      theme: computed,
      hideViewModelBaseMembers: computed,
      extras: observable.ref,
      setStore: action.bound,
      setExtras: action.bound,
      showPopup: action.bound,
      hidePopup: action.bound,
      handleChangePresentationMode: action.bound,
      handleSortPropertiesChange: action.bound,
      handleThemeChange: action.bound,
      handleHideViewModelBaseMembersChange: action.bound,
      handleExpandVmPropertyClick: action.bound,
      expandAllVMs: action.bound,
      collapseAllVms: action.bound,
      isActive: computed,
      resolvedTheme: computed,
      listItems: computed.struct,
      rootVmListItems: computed.struct,
      extraListItems: computed.struct,
    });

    this.render();
  }

  static define(config?: ViewModelDevtoolsConfig) {
    if (!ViewModelDevtools._instance) {
      ViewModelDevtools._instance = new ViewModelDevtools(config ?? {});
    }

    return ViewModelDevtools._instance;
  }

  static connect(
    viewModels: ViewModelDevtoolsConfig['viewModels'],
    extras?: AnyObject,
  ) {
    const devtools = ViewModelDevtools.define();

    devtools.setStore(viewModels);
    devtools.setExtras(extras);

    return devtools;
  }

  static connectViewModels(viewModels: ViewModelDevtoolsConfig['viewModels']) {
    const devtools = ViewModelDevtools.define();
    devtools.setStore(viewModels);
    return devtools;
  }

  static connectExtras(extras: AnyObject) {
    const devtools = ViewModelDevtools.define();
    devtools.setExtras(extras);
    return devtools;
  }
}

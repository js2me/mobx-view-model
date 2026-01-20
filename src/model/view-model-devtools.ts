import {
  action,
  computed,
  makeObservable,
  type ObservableSet,
  observable,
  reaction,
  runInAction,
} from 'mobx';
import { Storage } from 'mobx-swiss-knife';
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

  private autoscrollTimeout: number | undefined;

  // Кэш для результатов поиска (ленивый поиск)
  searchResultsCache = observable.array<ListItem<any>>([]);
  searchCacheKey = '';
  private searchTaskId: number | undefined;
  isSearching = false;
  private searchInitTaskId: number | undefined;

  get allVms() {
    const vmStore = this.projectVmStore as Maybe<ViewModelStoreBase>;
    const viewModelsMap =
      ((vmStore as any)?.viewModels as Map<string, AnyVM>) ?? new Map();

    return [...viewModelsMap.values()].filter(
      (vm) => !ViewModelImpl.isPrototypeOf(vm.constructor),
    );
  }

  private get rootVmListItems() {
    console.log('tick root vm list items?');
    return this.allVms
      .filter((vm) => {
        const vmParams = this.getVmParams(vm);
        return !vmParams || vmParams.parentViewModel == null;
      })
      .map((vm) => new VMListItem(this, vm, this.allVms));
  }

  private get extraListItems() {
    console.log('tick extra list items?');
    if (!this.extras) {
      return [];
    }
    return [new ExtraListItem(this, this.extras)];
  }

  get listItems(): ListItem<any>[] {
    if (!this.searchEngine.isActive) {
      // Когда поиск не активен, возвращаем все элементы как раньше
      const listItems: ListItem<any>[] = [];
      this.rootVmListItems.forEach((vmListItem) => {
        listItems.push(...vmListItem.expandedChildrenWithSelf);
      });
      this.extraListItems.forEach((listItem) => {
        listItems.push(...listItem.expandedChildrenWithSelf);
      });
      return listItems;
    }

    // Когда поиск активен, используем ленивый поиск
    const cacheKey = this.searchEngine.formattedSearchText;
    
    // Если кэш актуален, возвращаем его
    if (this.searchCacheKey === cacheKey && this.searchResultsCache.length > 0) {
      return this.searchResultsCache;
    }

    // Если поиск уже выполняется, возвращаем предыдущие результаты
    if (this.isSearching || this.searchInitTaskId !== undefined) {
      return this.searchResultsCache;
    }

    // Запускаем ленивый поиск АСИНХРОННО
    const scheduleInit = 
      typeof requestIdleCallback !== 'undefined'
        ? (cb: IdleRequestCallback) => requestIdleCallback(cb, { timeout: 50 })
        : (cb: () => void) => {
            this.searchInitTaskId = setTimeout(cb, 0) as any;
          };

    scheduleInit(() => {
      this.searchInitTaskId = undefined;
      // Проверяем, не изменился ли поисковый запрос
      if (this.searchEngine.formattedSearchText !== cacheKey) {
        return;
      }
      this.startLazySearch();
    });
    
    // Возвращаем пустой массив пока идет поиск (или предыдущие результаты)
    return this.searchResultsCache;
  }

  // Запускает ленивый поиск с разбивкой на чанки
  private startLazySearch() {
    const cacheKey = this.searchEngine.formattedSearchText;
    
    // Очищаем предыдущую задачу
    if (this.searchTaskId !== undefined) {
      clearTimeout(this.searchTaskId);
      this.searchTaskId = undefined;
    }

    runInAction(() => {
      this.isSearching = true;
      this.searchCacheKey = '';
      this.searchResultsCache.clear();
    });

    // Собираем корневые элементы асинхронно
    const scheduleTask = 
      typeof requestIdleCallback !== 'undefined'
        ? (cb: IdleRequestCallback) => requestIdleCallback(cb, { timeout: 50 })
        : (cb: () => void) => setTimeout(cb, 0);

    scheduleTask(() => {
      // Проверяем, не изменился ли поисковый запрос
      if (this.searchEngine.formattedSearchText !== cacheKey) {
        this.isSearching = false;
        return;
      }

      // Собираем все корневые элементы для поиска
      const rootItems: ListItem<any>[] = [
        ...this.rootVmListItems,
        ...this.extraListItems,
      ];

      // Запускаем асинхронный поиск
      this.searchTaskId = setTimeout(() => {
        this.performLazySearch(rootItems, cacheKey);
      }, 0);
    });
  }

  // Выполняет ленивый поиск с разбивкой на чанки
  private performLazySearch(rootItems: ListItem<any>[], cacheKey: string) {
    const searchSegments = this.searchEngine.segments;
    const endsWithDot = this.searchEngine.endsWithDot;
    // Если поиск заканчивается точкой, собираем на один уровень глубже
    const maxDepth = searchSegments.length + (endsWithDot ? 1 : 0);
    
    const visited = new Set<ListItem<any>>();
    const allItems: ListItem<any>[] = [];
    const itemDepthMap = new Map<ListItem<any>, number>();
    
    // Используем стек для итеративного обхода вместо рекурсии
    const stack: Array<{ item: ListItem<any>; depth: number }> = rootItems.map(item => ({ item, depth: 0 }));
    
    // Собираем элементы по чанкам (чтобы не блокировать UI)
    const CHUNK_SIZE = 50; // Количество элементов за раз
    let processedCount = 0;
    
    const processChunk = () => {
      const startTime = performance.now();
      const maxTime = 2; // Максимум 2ms на чанк
      
      while (stack.length > 0 && processedCount < allItems.length + CHUNK_SIZE) {
        if (performance.now() - startTime > maxTime) {
          // Превысили лимит времени, продолжаем в следующем чанке
          break;
        }
        
        const { item, depth } = stack.shift()!;
        
        if (visited.has(item)) continue;
        visited.add(item);
        
        // Ограничиваем глубину сбора
        if (depth <= maxDepth) {
          allItems.push(item);
          itemDepthMap.set(item, depth);
          
          // Добавляем дочерние элементы только если не достигли максимальной глубины
          if (depth < maxDepth && item.isExpandable) {
            for (const child of item.children) {
              stack.push({ item: child, depth: depth + 1 });
            }
          }
        }
        
        processedCount++;
      }
      
      if (stack.length > 0) {
        // Продолжаем в следующем чанке
        this.searchTaskId = setTimeout(processChunk, 0);
      } else {
        // Все элементы собраны, фильтруем
        this.filterAndCacheResults(allItems, cacheKey);
      }
    };
    
    processChunk();
  }

  private filterAndCacheResults(allItems: ListItem<any>[], cacheKey: string) {
    const filteredItems = this.filterItemsWithParentsLazy(allItems, cacheKey);
    
    runInAction(() => {
      this.searchResultsCache.replace(filteredItems);
      this.searchCacheKey = cacheKey;
      this.isSearching = false;
    });
  }

  private filterItemsWithParentsLazy(allItems: ListItem<any>[], cacheKey: string): ListItem<any>[] {
    // Проверяем, не изменился ли поисковый запрос
    if (this.searchEngine.formattedSearchText !== cacheKey) {
      return [];
    }
    
    const searchSegments = this.searchEngine.segments;
    const endsWithDot = this.searchEngine.endsWithDot;
    
    // Функция для проверки, подходит ли PropertyListItem под поиск
    const isPropertyFitted = (item: any): boolean => {
      if (!item.path || !item.property) return false;
      
      const pathSegments = item.path.split('.').filter(Boolean);
      const depth = pathSegments.length;
      const propertyLower = item.property.toLowerCase();
      const searchSegmentIndex = depth - 1;
      
      if (searchSegmentIndex >= searchSegments.length) {
        return false;
      }
      
      // Проверяем все предыдущие сегменты пути
      for (let i = 0; i < searchSegmentIndex; i++) {
        const pathSegment = pathSegments[i]?.toLowerCase() || '';
        const searchSegment = searchSegments[i];
        if (!pathSegment.includes(searchSegment)) {
          return false;
        }
      }
      
      // Проверяем текущий сегмент
      const currentSearchSegment = searchSegments[searchSegmentIndex];
      return propertyLower.includes(currentSearchSegment);
    };
    
    // Находим все подходящие элементы
    const fittedItems = new Set<ListItem<any>>();
    
    for (const item of allItems) {
      try {
        if (item instanceof VMListItem || item.constructor.name === 'ExtraListItem') {
          if (item.isFitted) {
            fittedItems.add(item);
          }
        } else {
          const propItem = item as any;
          if (propItem.path && propItem.property) {
            if (isPropertyFitted(propItem)) {
              fittedItems.add(item);
            }
          }
        }
      } catch {
        // Игнорируем ошибки
      }
    }
    
    if (fittedItems.size === 0) {
      return [];
    }
    
    // Создаем карту родитель -> дети
    const parentMap = new Map<ListItem<any>, ListItem<any>>();
    for (const item of allItems) {
      for (const child of item.children) {
        parentMap.set(child, item);
      }
    }
    
    const resultSet = new Set<ListItem<any>>();
    const allItemsSet = new Set(allItems);
    
    const addItemWithParents = (item: ListItem<any>) => {
      if (resultSet.has(item)) return;
      resultSet.add(item);
      
      // Если это VMListItem или ExtraListItem, добавляем ВСЕ его прямые дочерние элементы
      // (свойства первого уровня), даже если они не соответствуют поиску
      // Но только те, которые есть в allItems (т.е. были собраны при обходе)
      if (item instanceof VMListItem || item.constructor.name === 'ExtraListItem') {
        for (const child of item.children) {
          // Добавляем только те дети, которые есть в allItems
          if (allItemsSet.has(child) && !resultSet.has(child)) {
            resultSet.add(child);
          }
        }
      }
      
      const parent = parentMap.get(item);
      if (parent) {
        // Проверяем, подходит ли родитель под поиск (для PropertyListItem)
        const propParent = parent as any;
        if (propParent.path && propParent.property) {
          if (isPropertyFitted(propParent)) {
            addItemWithParents(parent);
          }
        } else {
          // Для VMListItem и ExtraListItem добавляем без проверки
          addItemWithParents(parent);
        }
      }
    };
    
    for (const fittedItem of fittedItems) {
      addItemWithParents(fittedItem);
    }
    
    // Если поиск заканчивается точкой, автоматически раскрываем соответствующее свойство
    if (endsWithDot && searchSegments.length > 0) {
      const lastSegment = searchSegments[searchSegments.length - 1];
      
      // Ищем PropertyListItem, который соответствует последнему сегменту
      for (const item of resultSet) {
        const propItem = item as any;
        if (propItem.path && propItem.property) {
          const pathSegments = propItem.path.split('.').filter(Boolean);
          const depth = pathSegments.length;
          
          // Проверяем, соответствует ли это свойство последнему сегменту на правильной глубине
          if (depth === searchSegments.length) {
            const propertyLower = propItem.property.toLowerCase();
            if (propertyLower.includes(lastSegment)) {
              // Проверяем, что все предыдущие сегменты пути соответствуют предыдущим сегментам поиска
              let matches = true;
              for (let i = 0; i < depth - 1; i++) {
                const pathSegment = pathSegments[i]?.toLowerCase() || '';
                const searchSegment = searchSegments[i];
                if (!pathSegment.includes(searchSegment)) {
                  matches = false;
                  break;
                }
              }
              
              if (matches && propItem.isExpandable) {
                propItem.expand();
                // Добавляем прямых детей раскрытого свойства в результаты
                for (const child of propItem.children) {
                  if (allItemsSet.has(child)) {
                    resultSet.add(child);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Строим правильный порядок: проходим по allItems и добавляем элементы в правильной последовательности
    // с учетом иерархии (родители перед детьми)
    const orderedResult: ListItem<any>[] = [];
    const added = new Set<ListItem<any>>();
    
    // Создаем карту родитель -> дети (только для элементов в resultSet)
    const childrenMap = new Map<ListItem<any>, ListItem<any>[]>();
    for (const item of allItems) {
      if (resultSet.has(item)) {
        for (const child of item.children) {
          if (resultSet.has(child)) {
            if (!childrenMap.has(item)) {
              childrenMap.set(item, []);
            }
            childrenMap.get(item)!.push(child);
          }
        }
      }
    }
    
    // Рекурсивно добавляем элемент и всех его потомков в правильном порядке
    const addItemRecursive = (item: ListItem<any>) => {
      if (added.has(item)) return;
      
      // Добавляем элемент
      orderedResult.push(item);
      added.add(item);
      
      // Добавляем детей в порядке их появления в allItems
      const children = childrenMap.get(item) || [];
      if (children.length > 0) {
        // Находим позиции детей в allItems для сохранения исходного порядка
        const childrenWithIndex = children.map(child => ({
          child,
          index: allItems.indexOf(child),
        })).filter(({ index }) => index !== -1);
        
        childrenWithIndex.sort((a, b) => a.index - b.index);
        
        for (const { child } of childrenWithIndex) {
          addItemRecursive(child);
        }
      }
    };
    
    // Проходим по allItems и добавляем элементы, начиная с корневых
    for (const item of allItems) {
      if (resultSet.has(item) && !added.has(item)) {
        // Проверяем, есть ли у этого элемента родитель в resultSet
        const parent = parentMap.get(item);
        if (!parent || !resultSet.has(parent) || added.has(parent)) {
          // Это корневой элемент или его родитель уже добавлен - добавляем его
          addItemRecursive(item);
        }
      }
    }
    
    return orderedResult;
  }

  // Helper method to get parent items that contain matched children
  private getParentItemsWithMatchedChildren(
    rootItem: ListItem<any>,
    matchedChildren: ListItem<any>[],
    isPropertyFitted?: (item: any) => boolean,
  ): ListItem<any>[] {
    const parentItems: ListItem<any>[] = [rootItem]; // Always include the root item

    // Add intermediate parent items that are in the path to matched children
    for (const matchedChild of matchedChildren) {
      let current: ListItem<any> | undefined = matchedChild;

      // Traverse up the hierarchy from the matched child to the root
      while (current && current !== rootItem) {
        // Try to find the parent of current item by checking if it's in the children of rootItem or its descendants
        const parent = this.findParent(rootItem, current);
        if (parent && !parentItems.includes(parent)) {
          // Для PropertyListItem проверяем, подходит ли он под поиск
          const propParent = parent as any;
          if (propParent.path && propParent.property && isPropertyFitted) {
            const fitted = isPropertyFitted(propParent);
            console.log(`  Checking parent ${propParent.path}: isFitted=${fitted}`);
            if (fitted) {
              parentItems.push(parent);
            } else {
              console.log(`  Skipping parent ${propParent.path} - doesn't match search`);
            }
          } else {
            // Для VMListItem и других - добавляем без проверки
            parentItems.push(parent);
          }
        }
        current = parent;
      }
    }

    return parentItems;
  }

  // Helper method to find the parent of a specific item within a root item
  private findParent(
    rootItem: ListItem<any>,
    targetItem: ListItem<any>,
  ): ListItem<any> | undefined {
    // Check if targetItem is a direct child of rootItem
    if (rootItem.children.includes(targetItem)) {
      return rootItem;
    }

    // Recursively check each child's subtree
    for (const child of rootItem.children) {
      if (child.children.includes(targetItem)) {
        return child;
      }

      const result = this.findParent(child, targetItem);
      if (result) {
        return result;
      }
    }

    return undefined;
  }


  get isActive() {
    return !!this.projectVmStore || Object.keys(this.extras || {}).length > 0;
  }

  private get containerId() {
    return this.config.containerId ?? 'view-model-devtools';
  }

  isExpanded(vmItem: VMListItem) {
    return vmItem.isExpanded || this.searchEngine.isActive;
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
    e: React.MouseEvent<HTMLElement>,
  ) {
    item.toggleExpand();
  }

  handleVmItemHeaderClick(vmItem: VMListItem): void {
    vmItem.toggleExpand();
  }

  isExpandable(vmItem: VMListItem): boolean | undefined {
    return vmItem.isExpandable && this.presentationMode !== 'list';
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

    reaction(
      () => this.searchEngine.formattedSearchText,
      () => {
        clearTimeout(this.autoscrollTimeout!);

        this.autoscrollTimeout = setTimeout(() => {
          if (!this.isActive) {
            this.scrollListRef.current?.scrollTo(0);
            return;
          }

          let nextOffset: number = 0;
          let maxLevel = 0;

          const htmlCollection = document.querySelectorAll(
            `#${this.containerId} [data-fitted]`,
          );

          (htmlCollection as any).forEach(
            (element: HTMLElement, index: number) => {
              if (
                element.dataset.fitted === 'true' &&
                element.dataset.depth &&
                element.dataset.depth.length >= maxLevel
              ) {
                maxLevel = element.dataset.depth!.length;
                nextOffset =
                  this.scrollListRef.current?.getItemOffset(index) ?? 0;
              }
            },
          );

          this.scrollListRef.current?.scrollTo(nextOffset);
        }, 200);
      },
    );

    this.storage.syncProperty(this, 'sortPropertiesBy');
    this.storage.syncProperty(this, 'presentationMode');
    this.storage.syncProperty(this, 'position');
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
    this.searchEngine = new SearchEngine();

    makeObservable<typeof this, 'rootVmListItems' | 'extraListItems'>(this, {
      position: observable.ref,
      isPopupOpened: observable.ref,
      projectVmStore: observable.ref,
      presentationMode: observable.ref,
      sortPropertiesBy: observable.ref,
      extras: observable.ref,
      searchResultsCache: observable,
      searchCacheKey: observable,
      isSearching: observable,
      setStore: action.bound,
      setExtras: action.bound,
      showPopup: action.bound,
      hidePopup: action.bound,
      handleChangePresentationMode: action.bound,
      handleSortPropertiesChange: action.bound,
      handleExpandVmPropertyClick: action.bound,
      expandAllVMs: action.bound,
      collapseAllVms: action.bound,
      isActive: computed,
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

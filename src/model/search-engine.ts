import {
  action,
  computed,
  makeObservable,
  observable,
  reaction,
  runInAction,
} from 'mobx';
import type { AnyObject } from 'yummies/types';
import { ExtraListItem } from './list-item/extra-list-item';
import type { ListItem } from './list-item/list-item';
import { PropertyListItem } from './list-item/property-list-item';
import type { VMListItem } from './list-item/vm-list-item';
import { VMListItem as VMListItemClass } from './list-item/vm-list-item';
import { getAllKeys } from './utils/get-all-keys';
import {
  createFocusableRef,
  type FocusableRef,
} from './utils/create-focusable-ref';

export type SearchInput =
  | { type: 'vm'; item: VMListItem }
  | { type: 'extras'; item: AnyObject };

interface SearchEngineConfig {
  getContainerId: () => string;
  getIsActive: () => boolean;
  getItemOffset: (index: number) => number;
  scrollToOffset: (offset: number) => void;
}

export class SearchEngine {
  searchInputRef: FocusableRef<HTMLInputElement>;

  private rawSearchText!: string;
  public formattedSearchText!: string;

  private searchTextUpdateTimeout: number | undefined;
  private searchTaskId: number | undefined;
  private searchInitTaskId: number | undefined;
  private autoscrollTimeout: number | undefined;

  segments: string[] = [];
  searchResultsCache = observable.array<ListItem<any>>([]);
  searchCacheKey = '';
  isSearching = false;

  get isActive() {
    return !!this.formattedSearchText;
  }

  get endsWithDot() {
    const trimmed = this.rawSearchText?.trim() || '';
    return trimmed.length > 0 && trimmed[trimmed.length - 1] === '.';
  }

  getListItems(rootItems: ListItem<any>[]) {
    if (!this.isActive) {
      return rootItems.flatMap((item) => item.expandedChildrenWithSelf);
    }

    const cacheKey = this.formattedSearchText;

    if (
      this.searchCacheKey === cacheKey &&
      !this.isSearching &&
      this.searchInitTaskId === undefined
    ) {
      return this.searchResultsCache;
    }

    if (this.isSearching || this.searchInitTaskId !== undefined) {
      return this.searchResultsCache;
    }

    const scheduleInit =
      typeof requestIdleCallback !== 'undefined'
        ? (cb: IdleRequestCallback) => requestIdleCallback(cb, { timeout: 50 })
        : (cb: () => void) => setTimeout(cb, 0) as unknown as number;

    this.searchInitTaskId = scheduleInit(() => {
      this.searchInitTaskId = undefined;

      if (this.formattedSearchText !== cacheKey) {
        return;
      }

      this.startLazySearch(rootItems, cacheKey);
    }) as unknown as number;

    return this.searchResultsCache;
  }

  isVmItemFitted(item: VMListItem) {
    if (!this.isActive || this.segments.length === 0) {
      return true;
    }

    const firstSegment = this.segments[0];
    const isFittedById = item.searchData.id.includes(firstSegment);
    const isFittedByName = item.searchData.name.includes(firstSegment);

    let hasPropertyWithName = false;

    try {
      hasPropertyWithName = getAllKeys(item.data).some((key) =>
        key.toLowerCase().includes(firstSegment),
      );
    } catch {
      hasPropertyWithName = false;
    }

    return isFittedByName || isFittedById || hasPropertyWithName;
  }

  isExtraItemFitted(item: ExtraListItem) {
    if (!this.isActive || this.segments.length === 0) {
      return true;
    }

    return item.searchData.name.includes(this.segments[0]);
  }

  isPropertyItemFitted(item: PropertyListItem) {
    if (!this.isActive) {
      return true;
    }

    if (!item.property || this.segments.length === 0) {
      return !!item.property || this.segments.length === 0;
    }

    const pathSegments = item.path
      .split('.')
      .filter(Boolean)
      .map((segment) => segment.toLowerCase());
    const searchSegmentIndex = pathSegments.length - 1;

    if (searchSegmentIndex >= this.segments.length) {
      return false;
    }

    for (let i = 0; i < searchSegmentIndex; i++) {
      if (!pathSegments[i]?.includes(this.segments[i])) {
        return false;
      }
    }

    return item.searchData.property.includes(this.segments[searchSegmentIndex]);
  }

  isPropertyItemExpanded(item: PropertyListItem) {
    if (this.isActive && !this.endsWithDot && this.segments.length === 1) {
      return false;
    }

    return item.cache.get(item.expandKey) === true;
  }

  isPropertyItemExpandable(item: PropertyListItem) {
    if (!this.isActive) {
      return item.children.length > 0;
    }

    switch (item.type) {
      case 'primitive':
        return false;
      case 'array':
        return Array.isArray(item.data) && item.data.length > 0;
      case 'object':
      case 'instance':
      case 'function': {
        try {
          for (const _key in item.data as Record<string, unknown>) {
            return true;
          }
        } catch {
          return false;
        }

        return false;
      }
    }
  }

  isVmItemExpanded(item: VMListItem) {
    return item.isExpanded || this.isActive;
  }

  private setSearchText(searchText: string) {
    this.cancelScheduledSearch();
    this.rawSearchText = searchText;
    this.formattedSearchText = searchText.toLowerCase().trim();
    this.searchCacheKey = '';
    this.searchResultsCache.clear();
    this.isSearching = false;

    this.segments.length = 0;

    if (!this.formattedSearchText) {
      return;
    }

    // biome-ignore lint/correctness/noUnusedVariables: reserved for future strict property mode
    let strictSearchByProperties = false;

    let startWithNextSegment = true;

    for (let i = 0; i < searchText.length; ) {
      const char = searchText[i];

      if (i === 0 && char === '.') {
        strictSearchByProperties = true;
        i++;
        continue;
      }

      if (char === ' ') {
        i++;
        continue;
      }

      if (char === '.') {
        startWithNextSegment = true;
        i++;
        continue;
      }

      // scenarios
      // foo.bar[0]
      // foo.bar[1000]
      // foo.bar['baz']
      // foo.bar["baz"]
      // if (char === '[') {
      //   let bunch = '';
      //   let charsToCheck = 1;
      //   while (searchText[i + charsToCheck] !== undefined) {
      //     const nextChar = searchText[i + charsToCheck];
      //     bunch += nextChar;
      //     charsToCheck++;
      //   }
      //   segments.push(searchText[i + 1]);
      //   startWithNextSegment = true;
      //   i += 2;
      //   continue;
      // }

      if (startWithNextSegment) {
        this.segments.push('');
        startWithNextSegment = false;
      }

      const lastIndex = this.segments.length - 1;
      this.segments[lastIndex] += char.toLowerCase();

      i++;
    }
  }

  private cancelScheduledSearch() {
    if (this.searchTaskId !== undefined) {
      clearTimeout(this.searchTaskId);
      this.searchTaskId = undefined;
    }

    if (this.searchInitTaskId !== undefined) {
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(this.searchInitTaskId);
      } else {
        clearTimeout(this.searchInitTaskId);
      }

      this.searchInitTaskId = undefined;
    }
  }

  private startLazySearch(rootItems: ListItem<any>[], cacheKey: string) {
    if (this.searchTaskId !== undefined) {
      clearTimeout(this.searchTaskId);
      this.searchTaskId = undefined;
    }

    runInAction(() => {
      this.isSearching = true;
      this.searchCacheKey = '';
      this.searchResultsCache.clear();
    });

    const searchSegments = this.segments;
    const maxDepth = searchSegments.length + (this.endsWithDot ? 1 : 0);
    const visited = new Set<ListItem<any>>();
    const allItems: ListItem<any>[] = [];
    const stack = rootItems.map((item) => ({ item, depth: 0 }));

    const processChunk = () => {
      if (this.formattedSearchText !== cacheKey) {
        this.searchTaskId = undefined;
        return;
      }

      const startTime = performance.now();
      const maxTime = 2;

      while (stack.length > 0 && performance.now() - startTime <= maxTime) {
        const current = stack.shift();

        if (!current) {
          break;
        }

        const { item, depth } = current;

        if (visited.has(item)) {
          continue;
        }

        visited.add(item);

        if (depth > maxDepth) {
          continue;
        }

        allItems.push(item);

        if (depth >= maxDepth) {
          continue;
        }

        for (const child of this.getSearchChildren(item)) {
          stack.push({ item: child, depth: depth + 1 });
        }
      }

      if (stack.length > 0) {
        this.searchTaskId = setTimeout(processChunk, 0) as unknown as number;
        return;
      }

      this.searchTaskId = undefined;
      this.filterAndCacheResults(allItems, cacheKey);
    };

    processChunk();
  }

  private isLargeSearchObject(value: unknown, limit: number) {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
      return false;
    }

    try {
      const globalLike = value as Record<string, unknown>;

      if (
        globalLike === globalThis ||
        globalLike.window === value ||
        globalLike.self === value ||
        globalLike.globalThis === value
      ) {
        return true;
      }
    } catch {
      return true;
    }

    let count = 0;

    try {
      for (const _key in value as Record<string, unknown>) {
        count++;

        if (count > limit) {
          return true;
        }
      }
    } catch {
      return true;
    }

    return false;
  }

  private getSearchChildren(item: ListItem<any>) {
    if (!this.isActive) {
      return item.children;
    }

    if (item instanceof ExtraListItem) {
      const data = item.data;
      const isHuge = this.isLargeSearchObject(data, 100);
      const shouldLimitHuge = this.segments.length > 2;

      if (isHuge && shouldLimitHuge) {
        const nextSegment = this.segments[0];

        if (
          nextSegment &&
          data &&
          (typeof data === 'object' || typeof data === 'function') &&
          nextSegment in (data as Record<string, unknown>)
        ) {
          return [
            PropertyListItem.create(this.getDevtools(item), nextSegment, nextSegment, 0, item),
          ];
        }

        return [];
      }
    }

    if (item instanceof PropertyListItem) {
      const data = item.data;
      const pathSegments = item.path.split('.').filter(Boolean);
      const nextSegment = this.segments[pathSegments.length];
      const isHuge = this.isLargeSearchObject(data, 100);
      const shouldLimitHuge = this.segments.length > 2;

      if (isHuge && shouldLimitHuge) {
        if (
          nextSegment &&
          data &&
          (typeof data === 'object' || typeof data === 'function') &&
          nextSegment in (data as Record<string, unknown>)
        ) {
          return [
            PropertyListItem.create(
              this.getDevtools(item),
              nextSegment,
              `${item.path}.${nextSegment}`,
              0,
              item,
            ),
          ];
        }

        return [];
      }
    }

    return item.children;
  }

  private filterAndCacheResults(allItems: ListItem<any>[], cacheKey: string) {
    const filteredItems = this.filterItemsWithParents(allItems, cacheKey);

    runInAction(() => {
      this.searchResultsCache.replace(filteredItems);
      this.searchCacheKey = cacheKey;
      this.isSearching = false;
    });
  }

  private filterItemsWithParents(allItems: ListItem<any>[], cacheKey: string) {
    if (this.formattedSearchText !== cacheKey) {
      return [];
    }

    const fittedItems = new Set<ListItem<any>>();

    for (const item of allItems) {
      try {
        if (this.isItemFitted(item)) {
          fittedItems.add(item);
        }
      } catch {
        continue;
      }
    }

    if (fittedItems.size === 0) {
      return [];
    }

    const parentMap = this.buildParentMap(allItems);
    const allItemsSet = new Set(allItems);
    const resultSet = this.collectResultSet(
      fittedItems,
      allItemsSet,
      parentMap,
    );

    this.expandTrailingDotMatches(resultSet, allItemsSet);

    return this.orderResultItems(allItems, resultSet, parentMap);
  }

  private isItemFitted(item: ListItem<any>) {
    if (item instanceof VMListItemClass) {
      return this.isVmItemFitted(item);
    }

    if (item instanceof ExtraListItem) {
      return this.isExtraItemFitted(item);
    }

    if (item instanceof PropertyListItem) {
      return this.isPropertyItemFitted(item);
    }

    return true;
  }

  private getDevtools(item: ListItem<any>) {
    return item.devtools;
  }

  private initAutoScrollReaction() {
    reaction(
      () => this.formattedSearchText,
      () => {
        clearTimeout(this.autoscrollTimeout);

        this.autoscrollTimeout = setTimeout(() => {
          if (!this.config.getIsActive()) {
            this.config.scrollToOffset(0);
            return;
          }

          if (typeof document === 'undefined') {
            return;
          }

          let nextOffset = 0;
          let maxLevel = 0;

          const htmlCollection = document.querySelectorAll(
            `#${this.config.getContainerId()} [data-fitted]`,
          );

          (htmlCollection as any).forEach((element: HTMLElement, index: number) => {
            if (
              element.dataset.fitted === 'true' &&
              element.dataset.depth &&
              element.dataset.depth.length >= maxLevel
            ) {
              maxLevel = element.dataset.depth.length;
              nextOffset = this.config.getItemOffset(index);
            }
          });

          this.config.scrollToOffset(nextOffset);
        }, 200) as unknown as number;
      },
    );
  }

  private buildParentMap(allItems: ListItem<any>[]) {
    const parentMap = new Map<ListItem<any>, ListItem<any>>();

    for (const item of allItems) {
      for (const child of this.getSearchChildren(item)) {
        parentMap.set(child, item);
      }
    }

    return parentMap;
  }

  private collectResultSet(
    fittedItems: Set<ListItem<any>>,
    allItemsSet: Set<ListItem<any>>,
    parentMap: Map<ListItem<any>, ListItem<any>>,
  ) {
    const resultSet = new Set<ListItem<any>>();

    const addItemWithParents = (item: ListItem<any>) => {
      if (resultSet.has(item)) {
        return;
      }

      resultSet.add(item);
      this.addMatchingItemChildren(item, resultSet, allItemsSet);

      const parent = parentMap.get(item);

      if (!parent) {
        return;
      }

      if (parent instanceof PropertyListItem && !this.isPropertyItemFitted(parent)) {
        return;
      }

      addItemWithParents(parent);
    };

    for (const item of fittedItems) {
      addItemWithParents(item);
    }

    return resultSet;
  }

  private addMatchingItemChildren(
    item: ListItem<any>,
    resultSet: Set<ListItem<any>>,
    allItemsSet: Set<ListItem<any>>,
  ) {
    const shouldIncludeChildren =
      item instanceof VMListItemClass ||
      item instanceof ExtraListItem ||
      (item instanceof PropertyListItem && this.isPropertyItemFitted(item));

    if (!shouldIncludeChildren) {
      return;
    }

    for (const child of this.getSearchChildren(item)) {
      if (allItemsSet.has(child)) {
        resultSet.add(child);
      }
    }
  }

  private expandTrailingDotMatches(
    resultSet: Set<ListItem<any>>,
    allItemsSet: Set<ListItem<any>>,
  ) {
    if (!this.endsWithDot || this.segments.length === 0) {
      return;
    }

    const lastSegment = this.segments[this.segments.length - 1];

    for (const item of resultSet) {
      if (!(item instanceof PropertyListItem)) {
        continue;
      }

      const depth = item.path.split('.').filter(Boolean).length;
      const shouldExpand =
        depth === this.segments.length &&
        item.searchData.property.includes(lastSegment) &&
        this.isPropertyItemFitted(item) &&
        item.isExpandable;

      if (!shouldExpand) {
        continue;
      }

      item.expand();

      for (const child of this.getSearchChildren(item)) {
        if (allItemsSet.has(child)) {
          resultSet.add(child);
        }
      }
    }
  }

  private orderResultItems(
    allItems: ListItem<any>[],
    resultSet: Set<ListItem<any>>,
    parentMap: Map<ListItem<any>, ListItem<any>>,
  ) {
    const childrenMap = new Map<ListItem<any>, ListItem<any>[]>();

    for (const item of allItems) {
      if (!resultSet.has(item)) {
        continue;
      }

      for (const child of this.getSearchChildren(item)) {
        if (!resultSet.has(child)) {
          continue;
        }

        const children = childrenMap.get(item);

        if (children) {
          children.push(child);
        } else {
          childrenMap.set(item, [child]);
        }
      }
    }

    const orderedResult: ListItem<any>[] = [];
    const added = new Set<ListItem<any>>();

    const addItemRecursive = (item: ListItem<any>) => {
      if (added.has(item)) {
        return;
      }

      orderedResult.push(item);
      added.add(item);

      const children = childrenMap.get(item) || [];
      const childrenWithIndex = children
        .map((child) => ({ child, index: allItems.indexOf(child) }))
        .filter(({ index }) => index !== -1)
        .sort((a, b) => a.index - b.index);

      for (const { child } of childrenWithIndex) {
        addItemRecursive(child);
      }

      const closingItem = item.closingItem;

      if (closingItem && item.isExpanded) {
        orderedResult.push(closingItem);
      }
    };

    for (const item of allItems) {
      if (!resultSet.has(item) || added.has(item)) {
        continue;
      }

      const parent = parentMap.get(item);

      if (!parent || !resultSet.has(parent) || added.has(parent)) {
        addItemRecursive(item);
      }
    }

    return orderedResult;
  }

  resetSearch = () => {
    clearTimeout(this.searchTextUpdateTimeout!);
    this.setSearchText('');
    if (this.searchInputRef.current) {
      this.searchInputRef.current.value = '';
    }
  };

  constructor(private config: SearchEngineConfig) {
    this.setSearchText('');

    this.searchInputRef = createFocusableRef<HTMLInputElement>({
      onSet: (input) => {
        if (this.rawSearchText && input.value !== this.rawSearchText) {
          input.value = this.rawSearchText;
        }

        input.addEventListener('input', () => {
          clearTimeout(this.searchTextUpdateTimeout!);
          // Увеличиваем debounce для больших иерархий
          this.searchTextUpdateTimeout = setTimeout(() => {
            this.setSearchText(input.value);
          }, 300);
        });
      },
    });

    this.initAutoScrollReaction();

    makeObservable<
      typeof this,
      'rawSearchText' | 'formattedSearchText' | 'setSearchText'
    >(this, {
      rawSearchText: observable.ref,
      formattedSearchText: observable.ref,
      isActive: computed,
      segments: observable,
      searchResultsCache: observable,
      searchCacheKey: observable.ref,
      isSearching: observable.ref,
      setSearchText: action.bound,
    });
  }
}

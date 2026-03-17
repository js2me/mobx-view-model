import { observable } from 'mobx';
import type { AnyObject } from 'yummies/types';
import type { ListItem } from './list-item/list-item';
import type { PropertyListItem } from './list-item/property-list-item';
import type { VMListItem } from './list-item/vm-list-item';
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

  public formattedSearchText!: string;

  segments: string[] = [];
  searchResultsCache = observable.array<ListItem<any>>([]);
  searchCacheKey = '';
  isSearching = false;

  get isActive() {
    return false;
  }

  get endsWithDot() {
    return false;
  }

  getListItems(rootItems: ListItem<any>[]) {
    return rootItems.flatMap((item) => item.expandedChildrenWithSelf);
  }

  isPropertyItemExpanded(item: PropertyListItem) {
    return item.cache.get(item.expandKey) === true;
  }

  isPropertyItemExpandable(item: PropertyListItem) {
    return item.children.length > 0;
  }

  isVmItemExpanded(item: VMListItem) {
    return item.isExpanded;
  }

  isItemFitted(item: ListItem<any>) {
    return true;
  }

  resetSearch = () => {
    // no-op
  };

  constructor(private config: SearchEngineConfig) {
    this.searchInputRef = createFocusableRef<HTMLInputElement>();
  }
}

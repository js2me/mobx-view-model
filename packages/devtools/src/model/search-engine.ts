import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react';
import type { AnyObject } from 'yummies/types';
import type { ListItem } from './list-item/list-item';
import type { PropertyListItem } from './list-item/property-list-item';
import type { VMListItem } from './list-item/vm-list-item';
import {
  getListItems as filterGetListItems,
  getOwnerInfo as filterGetOwnerInfo,
  isItemFitted as filterIsItemFitted,
  isPropertySearchAutoExpanded as filterIsPropertySearchAutoExpanded,
  isSearchTargetMatched as filterIsSearchTargetMatched,
  getBestSuggestionAlias,
  getCandidatePropsAtDepth,
  type OwnerInfo,
  propertyMatchesSegmentPartial,
  type SearchContext,
} from './search-filter';
import {
  createFocusableRef,
  type FocusableRef,
} from './utils/create-focusable-ref';
import {
  getSearchPathParts,
  hasSearchPathSyntax,
  parseSearchPath,
} from './utils/parse-search-path';
import {
  applySuggestionToSearchText,
  getSuggestionSuffix,
} from './utils/search-suggestion-text';
import {
  getStickyHeaderScrollPadding,
  LIST_ITEM_HEIGHT,
} from './utils/sticky-tree-item-scroll';

export type SearchInput =
  | { type: 'vm'; item: VMListItem }
  | { type: 'extras'; item: AnyObject };

interface SearchEngineConfig {
  getContainerId: () => string;
  getIsActive: () => boolean;
  getItemOffset: (index: number) => number;
  scrollToOffset: (offset: number) => void;
  getRootItems: () => ListItem<any>[];
  getPresentationMode: () => 'tree' | 'list';
  initialSearchText?: string;
}

export type { OwnerInfo };

export interface SearchSuggestion {
  value: string;
  suffix: string;
  owner: OwnerInfo;
}

export class SearchEngine {
  searchInputRef: FocusableRef<HTMLInputElement>;

  searchText = '';
  searchTextToSearch = '';
  selectedSuggestionIndex = 0;
  isSearchInputFocused = false;
  isSuggestionsDismissed = false;
  selectedPathOwnerKey: string | null = null;
  selectedPathSegment: string | null = null;

  searchCacheKey = '';
  isSearching = false;
  private searchTextToSearchTimeout: ReturnType<typeof setTimeout> | null =
    null;
  private scrollToSearchMatchTimeout: ReturnType<typeof setTimeout> | null =
    null;

  private static readonly searchDebounceMs = 150;
  private static readonly itemHeight = LIST_ITEM_HEIGHT;

  private get searchContext(): SearchContext {
    return {
      segments: this.segments,
      endsWithDot: this.endsWithDot,
      isActive: this.isActive,
      selectedPathOwnerKey: this.selectedPathOwnerKey,
      selectedPathSegment: this.selectedPathSegment,
    };
  }

  get formattedSearchText(): string {
    return this.searchTextToSearch.toLowerCase().trim();
  }

  get segments(): string[] {
    if (!this.formattedSearchText) return [];

    return parseSearchPath(this.formattedSearchText).segments;
  }

  get endsWithDot(): boolean {
    return parseSearchPath(this.formattedSearchText).endsWithDot;
  }

  get isNestedSearch(): boolean {
    return this.endsWithDot || this.segments.length > 1;
  }

  get isActive(): boolean {
    return this.formattedSearchText.length > 0;
  }

  get isSearchTextDebouncing(): boolean {
    return this.searchText !== this.searchTextToSearch;
  }

  get shouldShowSuggestions(): boolean {
    return (
      this.isSearchInputFocused &&
      !this.isSuggestionsDismissed &&
      this.suggestionItems.length > 0
    );
  }

  get suggestionItems(): SearchSuggestion[] {
    if (this.isSearchTextDebouncing && !hasSearchPathSyntax(this.searchText)) {
      return [];
    }
    return this.buildSuggestionItemsForText(this.getActiveSearchText());
  }

  private getActiveSearchText(): string {
    if (hasSearchPathSyntax(this.searchText)) {
      return this.searchText;
    }

    return this.searchTextToSearch;
  }

  private buildSuggestionItemsForText(text: string): SearchSuggestion[] {
    const formatted = text.toLowerCase().trim();
    if (!formatted) return [];

    const {
      pathSegments,
      completingSegment,
      endsWithDot,
      hasBracketKeySyntax,
    } = getSearchPathParts(text);

    if (pathSegments.length === 0 && !completingSegment && !endsWithDot) {
      return [];
    }

    if (!endsWithDot && !completingSegment && !hasBracketKeySyntax) {
      return [];
    }

    const ctx = this.searchContext;
    const rootItems = this.config.getRootItems();
    const candidates = getCandidatePropsAtDepth(ctx, rootItems, pathSegments);
    const suggestionsByVM = new Map<string, SearchSuggestion[]>();
    const seen = new Set<string>();

    for (const prop of candidates) {
      if (!propertyMatchesSegmentPartial(prop, completingSegment)) {
        continue;
      }

      const alias = getBestSuggestionAlias(prop, completingSegment);
      const owner = filterGetOwnerInfo(prop);
      const uniqueKey = `${owner.key}/${alias.lower}`;

      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);

      const suggestions = suggestionsByVM.get(owner.name) ?? [];
      suggestions.push({
        value: alias.original,
        suffix: getSuggestionSuffix(alias.original, completingSegment),
        owner,
      });
      suggestionsByVM.set(owner.name, suggestions);
    }

    const result: SearchSuggestion[] = [];
    const groups = [...suggestionsByVM.values()];
    let offset = 0;

    while (result.length < 10) {
      let hasSuggestion = false;

      for (const group of groups) {
        const suggestion = group[offset];
        if (!suggestion) continue;

        result.push(suggestion);
        hasSuggestion = true;

        if (result.length >= 10) {
          return result;
        }
      }

      if (!hasSuggestion) break;
      offset++;
    }

    return result;
  }

  get selectedSuggestion(): SearchSuggestion | null {
    if (this.suggestionItems.length === 0) return null;
    const index = Math.min(
      this.selectedSuggestionIndex,
      this.suggestionItems.length - 1,
    );
    return this.suggestionItems[index] ?? null;
  }

  get suggestionSuffix(): string {
    return this.selectedSuggestion?.suffix ?? '';
  }

  selectSuggestionAtIndex = (index: number) => {
    if (index < 0 || index >= this.suggestionItems.length) return;

    this.selectedSuggestionIndex = index;
    this.isSuggestionsDismissed = false;
  };

  applySuggestion = (
    suggestion: SearchSuggestion,
    options?: { commitOwner?: boolean; dismissSuggestions?: boolean },
  ) => {
    this.clearSearchDebounce();
    const hadPathSyntax = hasSearchPathSyntax(this.searchText);
    const nextSearchText = applySuggestionToSearchText(
      this.searchText,
      suggestion.value,
    );
    this.searchText = nextSearchText;
    this.searchTextToSearch = nextSearchText;
    this.selectedSuggestionIndex = 0;
    this.isSuggestionsDismissed = options?.dismissSuggestions ?? false;

    const lockedSegment = hadPathSyntax
      ? this.getFirstPathSegment(nextSearchText)
      : undefined;

    if (options?.commitOwner) {
      this.commitSuggestionOwner(suggestion, lockedSegment);
    } else if (!hadPathSyntax) {
      this.commitSuggestionOwner(suggestion);
    } else if (!this.selectedPathOwnerKey) {
      this.commitSuggestionOwner(suggestion, lockedSegment);
    }

    this.searchInputRef.current?.focus();
    this.scheduleScrollToFirstSearchMatch();
  };

  applySuggestionFromClick = (suggestion: SearchSuggestion, index: number) => {
    this.selectSuggestionAtIndex(index);
    this.applySuggestion(suggestion, { commitOwner: true });
  };

  handleSearchInput = (e: ChangeEvent<HTMLInputElement>) => {
    const previousSearchText = this.searchText;
    const previousSelectedSuggestion = this.selectedSuggestion;
    this.searchText = e.target.value;
    this.isSuggestionsDismissed = false;
    this.handlePathOwnerSelectionFromInput(
      previousSearchText,
      this.searchText,
      previousSelectedSuggestion,
    );
    this.selectedSuggestionIndex = 0;
    this.scheduleSearchTextDebounce();
  };

  handleSearchInputFocus = (_e: FocusEvent<HTMLInputElement>) => {
    this.isSearchInputFocused = true;
    this.isSuggestionsDismissed = false;
  };

  handleSearchInputBlur = (_e: FocusEvent<HTMLInputElement>) => {
    this.isSearchInputFocused = false;
  };

  handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.isSuggestionsDismissed = true;
      return;
    }

    if (e.key === 'ArrowDown' && this.suggestionItems.length > 0) {
      e.preventDefault();
      this.selectedSuggestionIndex =
        (this.selectedSuggestionIndex + 1) % this.suggestionItems.length;
      return;
    }

    if (e.key === 'ArrowUp' && this.suggestionItems.length > 0) {
      e.preventDefault();
      this.selectedSuggestionIndex =
        (this.selectedSuggestionIndex - 1 + this.suggestionItems.length) %
        this.suggestionItems.length;
      return;
    }

    if ((e.key === 'Tab' || e.key === 'Enter') && this.selectedSuggestion) {
      e.preventDefault();
      this.applySuggestion(this.selectedSuggestion, {
        dismissSuggestions: e.key === 'Enter',
      });
    }
  };

  private commitSuggestionOwner(
    suggestion: SearchSuggestion,
    lockedSegment?: string,
  ) {
    this.selectedPathOwnerKey = suggestion.owner.key;
    this.selectedPathSegment =
      lockedSegment ?? suggestion.value.toLowerCase().trim();
  }

  private handlePathOwnerSelectionFromInput(
    previousSearchText: string,
    nextSearchText: string,
    previousSelectedSuggestion: SearchSuggestion | null,
  ) {
    const addedDot =
      nextSearchText.endsWith('.') &&
      nextSearchText === `${previousSearchText}.`;
    const enteredPathSyntax =
      hasSearchPathSyntax(nextSearchText) &&
      !hasSearchPathSyntax(previousSearchText);

    if (addedDot || enteredPathSyntax) {
      const pathSegment = this.getFirstPathSegment(
        addedDot ? previousSearchText : nextSearchText,
      );

      if (
        this.selectedPathOwnerKey &&
        this.selectedPathSegment === pathSegment
      ) {
        this.searchTextToSearch = nextSearchText;
        this.clearSearchDebounce();
        return;
      }

      const suggestion =
        addedDot &&
        previousSelectedSuggestion &&
        previousSelectedSuggestion.value.toLowerCase() === pathSegment
          ? previousSelectedSuggestion
          : this.resolvePathOwnerSuggestion(
              pathSegment,
              this.selectedSuggestionIndex,
            );

      if (suggestion) {
        this.commitSuggestionOwner(suggestion, pathSegment);
      }

      this.searchTextToSearch = nextSearchText;
      this.clearSearchDebounce();
      return;
    }

    const firstSegment = this.getFirstPathSegment(nextSearchText);
    if (
      !hasSearchPathSyntax(nextSearchText) ||
      !firstSegment ||
      firstSegment !== this.selectedPathSegment
    ) {
      this.selectedPathOwnerKey = null;
      this.selectedPathSegment = null;
    }
  }

  private getFirstPathSegment(text: string): string {
    return parseSearchPath(text).segments[0] ?? '';
  }

  private resolvePathOwnerSuggestion(
    pathSegment: string,
    selectedIndex: number,
  ): SearchSuggestion | null {
    if (!pathSegment) return null;

    const items = this.buildSuggestionItemsForText(pathSegment);
    if (items.length === 0) return null;

    const exactMatches = items.filter(
      (item) => item.value.toLowerCase() === pathSegment,
    );

    if (exactMatches.length > 0) {
      return (
        exactMatches[Math.min(selectedIndex, exactMatches.length - 1)] ??
        exactMatches[0]
      );
    }

    return items[Math.min(selectedIndex, items.length - 1)] ?? items[0];
  }

  private clearSearchDebounce() {
    if (this.searchTextToSearchTimeout) {
      clearTimeout(this.searchTextToSearchTimeout);
      this.searchTextToSearchTimeout = null;
    }
  }

  private scheduleSearchTextDebounce() {
    this.clearSearchDebounce();

    if (!this.searchText.trim()) {
      this.searchTextToSearch = '';
      return;
    }

    this.searchTextToSearchTimeout = setTimeout(() => {
      runInAction(() => {
        this.searchTextToSearchTimeout = null;
        this.searchTextToSearch = this.searchText;
        this.scheduleScrollToFirstSearchMatch();
      });
    }, SearchEngine.searchDebounceMs);
  }

  private scheduleScrollToFirstSearchMatch() {
    if (this.scrollToSearchMatchTimeout) {
      clearTimeout(this.scrollToSearchMatchTimeout);
    }

    this.scrollToSearchMatchTimeout = setTimeout(() => {
      this.scrollToSearchMatchTimeout = null;
      this.scrollToFirstSearchMatch();
    }, 0);
  }

  private scrollToFirstSearchMatch() {
    if (!this.isActive) return;

    const ctx = this.searchContext;
    const listItems = this.getListItems(this.config.getRootItems());
    const index = listItems.findIndex((item) =>
      filterIsSearchTargetMatched(ctx, item),
    );

    if (index < 0) return;

    const virtualizerOffset = this.config.getItemOffset(index);
    const baseOffset =
      virtualizerOffset > 0
        ? virtualizerOffset
        : index * SearchEngine.itemHeight;
    const stickyPadding = getStickyHeaderScrollPadding(listItems, index);
    const offset = Math.max(0, baseOffset - stickyPadding);

    this.config.scrollToOffset(offset);
    this.scrollSimpleBarToOffset(offset);
  }

  private scrollSimpleBarToOffset(offset: number) {
    if (typeof document === 'undefined') return;

    const container = document.getElementById(this.config.getContainerId());
    const scrollElement = container?.querySelector<HTMLElement>(
      '.simplebar-content-wrapper',
    );

    scrollElement?.scrollTo({ top: offset });
  }

  getListItems(rootItems: ListItem<any>[]): ListItem<any>[] {
    return filterGetListItems(
      this.searchContext,
      rootItems,
      this.config.getPresentationMode(),
    );
  }

  isPropertyItemExpanded(item: PropertyListItem) {
    if (item.cache.get(item.expandKey) === true) {
      return true;
    }

    return filterIsPropertySearchAutoExpanded(this.searchContext, item);
  }

  isPropertyItemExpandable(item: PropertyListItem) {
    return item.children.length > 0;
  }

  isVmItemExpanded(item: VMListItem) {
    return item.isExpanded;
  }

  isItemFitted(item: ListItem<any>): boolean {
    return filterIsItemFitted(this.searchContext, item);
  }

  resetSearch = () => {
    this.clearSearchDebounce();
    if (this.scrollToSearchMatchTimeout) {
      clearTimeout(this.scrollToSearchMatchTimeout);
      this.scrollToSearchMatchTimeout = null;
    }
    this.searchText = '';
    this.searchTextToSearch = '';
    this.selectedSuggestionIndex = 0;
    this.isSuggestionsDismissed = false;
    this.selectedPathOwnerKey = null;
    this.selectedPathSegment = null;
    this.focusInput();
  };

  focusInput = () => {
    this.searchInputRef.current?.focus();
  };

  constructor(private config: SearchEngineConfig) {
    this.searchInputRef = createFocusableRef<HTMLInputElement>();

    if (config.initialSearchText) {
      this.searchText = config.initialSearchText;
      this.searchTextToSearch = config.initialSearchText;
    }

    makeObservable(this, {
      searchText: observable.ref,
      searchTextToSearch: observable.ref,
      selectedSuggestionIndex: observable.ref,
      isSearchInputFocused: observable.ref,
      isSuggestionsDismissed: observable.ref,
      selectedPathOwnerKey: observable.ref,
      selectedPathSegment: observable.ref,
      formattedSearchText: computed,
      segments: computed.struct,
      endsWithDot: computed,
      isNestedSearch: computed,
      isActive: computed,
      isSearchTextDebouncing: computed,
      shouldShowSuggestions: computed,
      suggestionItems: computed.struct,
      selectedSuggestion: computed,
      suggestionSuffix: computed,
      selectSuggestionAtIndex: action,
      applySuggestion: action,
      applySuggestionFromClick: action,
      handleSearchInput: action,
      handleSearchInputFocus: action,
      handleSearchInputBlur: action,
      handleKeyDown: action,
      resetSearch: action,
    });
  }
}

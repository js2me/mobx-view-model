import {
  action,
  computed,
  makeObservable,
  observable,
} from 'mobx';
import type { ChangeEvent } from 'react';
import type { AnyObject } from 'yummies/types';
import { ExtraListItem } from './list-item/extra-list-item';
import type { ListItem } from './list-item/list-item';
import { PropertyListItem } from './list-item/property-list-item';
import { VMListItem } from './list-item/vm-list-item';
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

  searchText = '';

  searchCacheKey = '';
  isSearching = false;

  get formattedSearchText(): string {
    return this.searchText.toLowerCase().trim();
  }

  /**
   * Сегменты поиска, разбитые по точке.
   * Trailing-пустой сегмент (от trailing dot) убирается — для этого есть endsWithDot.
   */
  get segments(): string[] {
    if (!this.formattedSearchText) return [];
    const all = this.formattedSearchText.split('.');
    return all[all.length - 1] === '' ? all.slice(0, -1) : all;
  }

  get endsWithDot(): boolean {
    return this.searchText.trim().endsWith('.');
  }

  get isActive(): boolean {
    return this.formattedSearchText.length > 0;
  }

  handleSearchInput = (e: ChangeEvent<HTMLInputElement>) => {
    this.searchText = e.target.value;
  };

  getListItems(rootItems: ListItem<any>[]): ListItem<any>[] {
    if (!this.isActive) {
      return rootItems.flatMap((item) => item.expandedChildrenWithSelf);
    }
    return rootItems.flatMap((item) => this.getFilteredItemsForSearch(item));
  }

  private getFilteredItemsForSearch(item: ListItem<any>): ListItem<any>[] {
    if (item instanceof VMListItem) {
      return this.getVMSearchItems(item);
    }
    if (item instanceof ExtraListItem) {
      return item.isExpanded ? [item, ...item.children] : [item];
    }
    return [item];
  }

  private getVMSearchItems(vmItem: VMListItem): ListItem<any>[] {
    const result: ListItem<any>[] = [];

    if (!this.vmMatchesSearch(vmItem)) {
      for (const child of vmItem.children) {
        if (child instanceof VMListItem) {
          result.push(...this.getVMSearchItems(child));
        }
      }
      return result;
    }

    result.push(vmItem);

    const { segments } = this;
    const firstSeg = segments[0] ?? '';
    const vmMatchesByName =
      vmItem.searchData.name.includes(firstSeg) ||
      vmItem.searchData.id.includes(firstSeg);

    // Если VM совпал по имени/id — первый сегмент «израсходован» на VM,
    // остальные сегменты фильтруют свойства.
    // Если VM совпал через свойство — все сегменты фильтруют свойства.
    const propSegments = vmMatchesByName ? segments.slice(1) : segments;

    const directProps = vmItem.children.filter(
      (c): c is PropertyListItem => c instanceof PropertyListItem,
    );
    const nestedVMs = vmItem.children.filter(
      (c): c is VMListItem => c instanceof VMListItem,
    );

    result.push(...this.getPropertySearchItems(directProps, propSegments));

    for (const nestedVM of nestedVMs) {
      result.push(...this.getVMSearchItems(nestedVM));
    }

    return result;
  }

  /**
   * Рекурсивно строит плоский список PropertyListItem для отображения.
   *
   * propSegments[0] — фильтр текущего уровня.
   * Совпадающие свойства с propSegments[0] и у которых есть ещё сегменты
   * (т.е. не последний) — автоматически раскрываются (рекурсия вглубь).
   * Последний сегмент только окрашивает (серый/нормальный), не раскрывает.
   */
  private getPropertySearchItems(
    properties: PropertyListItem[],
    propSegments: string[],
  ): ListItem<any>[] {
    const result: ListItem<any>[] = [];

    if (propSegments.length === 0) {
      // Фильтры закончились — показываем всё, сохраняя ручное раскрытие
      for (const prop of properties) {
        result.push(prop);
        if (prop.isExpanded) {
          result.push(...prop.expandedChildren);
        }
      }
      return result;
    }

    const currentSeg = propSegments[0];
    // Не последний сегмент → автораскрытие совпадающих свойств.
    // endsWithDot означает, что даже последний сегмент раскрывает потомков.
    const isNotLastSeg = propSegments.length > 1 || this.endsWithDot;

    for (const prop of properties) {
      result.push(prop);

      const matches =
        !currentSeg || prop.searchData.property.includes(currentSeg);

      if (matches && isNotLastSeg) {
        // Автораскрытие: рекурсивно включаем дочерние свойства
        const childProps = prop.children.filter(
          (c): c is PropertyListItem => c instanceof PropertyListItem,
        );
        result.push(
          ...this.getPropertySearchItems(childProps, propSegments.slice(1)),
        );
      }
    }

    return result;
  }

  private vmMatchesSearch(item: VMListItem): boolean {
    const { segments } = this;
    if (segments.length === 0) return true;

    const firstSegment = segments[0];

    // Совпадение по имени класса или id
    if (
      item.searchData.name.includes(firstSegment) ||
      item.searchData.id.includes(firstSegment)
    ) {
      return true;
    }

    // Совпадение по имени любого прямого свойства
    return item.children.some(
      (child) =>
        child instanceof PropertyListItem &&
        child.searchData.property.includes(firstSegment),
    );
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

  /**
   * Определяет, должен ли элемент отображаться «нормально» (true)
   * или «затемнённо» (false — серым).
   *
   * Для PropertyListItem: проходим вверх по цепочке parentListItem,
   * чтобы определить уровень вложенности и соответствующий сегмент фильтра.
   */
  isItemFitted(item: ListItem<any>): boolean {
    if (!this.isActive) return true;

    if (item instanceof PropertyListItem) {
      const { segments } = this;
      if (segments.length === 0) return true;

      // Считаем глубину вложенности свойства внутри цепочки PropertyListItem
      let parent: ListItem<any> = item.parentListItem;
      let propLevel = 0;

      while (parent instanceof PropertyListItem) {
        propLevel++;
        parent = parent.parentListItem;
      }

      // Предок не VMListItem (например, ExtraListItem) — не фильтруем
      if (!(parent instanceof VMListItem)) return true;

      const firstSeg = segments[0];
      const vmMatchesByName =
        parent.searchData.name.includes(firstSeg) ||
        parent.searchData.id.includes(firstSeg);

      // Определяем какие сегменты относятся к свойствам
      const propSegments = vmMatchesByName ? segments.slice(1) : segments;

      // Глубже последнего сегмента — всё отображается нормально
      if (propLevel >= propSegments.length) return true;

      const seg = propSegments[propLevel];
      return !seg || item.searchData.property.includes(seg);
    }

    return true;
  }

  resetSearch = () => {
    this.searchText = '';
    this.searchInputRef.current?.focus();
  };

  constructor(_config: SearchEngineConfig) {
    this.searchInputRef = createFocusableRef<HTMLInputElement>();

    makeObservable(this, {
      searchText: observable.ref,
      formattedSearchText: computed,
      segments: computed.struct,
      endsWithDot: computed,
      isActive: computed,
      handleSearchInput: action,
      resetSearch: action,
    });
  }
}

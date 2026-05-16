import {
  action,
  computed,
  makeObservable,
  observable,
} from 'mobx';
import type { ChangeEvent, KeyboardEvent } from 'react';
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
  getRootItems: () => ListItem<any>[];
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

  /**
   * Суффикс первого найденного свойства, которое начинается с последнего сегмента.
   * Отображается как серая подсказка в инпуте.
   * Например: ввод "_pay" → suggestionSuffix = "load" (от "_payload")
   */
  get suggestionSuffix(): string {
    if (!this.isActive) return '';
    const { segments } = this;
    if (segments.length === 0) return '';

    const lastSeg = segments[segments.length - 1];
    if (!lastSeg) return '';

    const rootItems = this.config.getRootItems();
    const candidates = this.getCandidatePropsAtDepth(rootItems, segments.slice(0, -1));

    for (const prop of candidates) {
      const nameLower = prop.searchData.property;
      const nameOriginal = prop.property ?? '';

      if (nameLower.startsWith(lastSeg) && nameLower.length > lastSeg.length) {
        return nameOriginal.slice(lastSeg.length);
      }
    }

    return '';
  }

  handleSearchInput = (e: ChangeEvent<HTMLInputElement>) => {
    this.searchText = e.target.value;
  };

  handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && this.suggestionSuffix) {
      e.preventDefault();
      this.searchText += this.suggestionSuffix;
    }
  };

  /**
   * Возвращает PropertyListItem на целевой глубине для получения подсказки.
   * pathSegments — все сегменты кроме последнего (путь навигации).
   */
  private getCandidatePropsAtDepth(
    rootItems: ListItem<any>[],
    pathSegments: string[],
  ): PropertyListItem[] {
    const vms = rootItems.filter(
      (item): item is VMListItem => item instanceof VMListItem,
    );

    if (pathSegments.length === 0) {
      // Нет навигации — прямые свойства всех VM
      const props: PropertyListItem[] = [];
      for (const vm of vms) {
        props.push(
          ...vm.children.filter(
            (c): c is PropertyListItem => c instanceof PropertyListItem,
          ),
        );
      }
      return props;
    }

    const firstSeg = pathSegments[0];
    const result: PropertyListItem[] = [];

    for (const vm of vms) {
      const directProps = vm.children.filter(
        (c): c is PropertyListItem => c instanceof PropertyListItem,
      );
      const vmNameMatch =
        vm.searchData.name.includes(firstSeg) ||
        vm.searchData.id.includes(firstSeg);

      if (vmNameMatch) {
        // VM совпал по имени — следующий уровень это прямые свойства VM
        if (pathSegments.length === 1) {
          result.push(...directProps);
        } else {
          result.push(
            ...this.navigatePropertyPath(directProps, pathSegments.slice(1)),
          );
        }
      } else {
        // Совпадение через свойство — заходим в совпадающие свойства
        const matchingProps = directProps.filter((p) =>
          p.searchData.property.includes(firstSeg),
        );

        if (pathSegments.length === 1) {
          // Нужны дети совпадающих свойств
          for (const prop of matchingProps) {
            result.push(...prop.children);
          }
        } else {
          for (const prop of matchingProps) {
            result.push(
              ...this.navigatePropertyPath(prop.children, pathSegments.slice(1)),
            );
          }
        }
      }
    }

    return result;
  }

  /**
   * Навигация вглубь по цепочке свойств.
   * Возвращает свойства на нужной глубине.
   */
  private navigatePropertyPath(
    props: PropertyListItem[],
    segments: string[],
  ): PropertyListItem[] {
    if (segments.length === 0) return props;

    const [seg, ...rest] = segments;
    const matchingProps = props.filter((p) =>
      p.searchData.property.includes(seg),
    );

    if (rest.length === 0) {
      const result: PropertyListItem[] = [];
      for (const prop of matchingProps) {
        result.push(...prop.children);
      }
      return result;
    }

    const result: PropertyListItem[] = [];
    for (const prop of matchingProps) {
      result.push(...this.navigatePropertyPath(prop.children, rest));
    }
    return result;
  }

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
   * Совпадающие свойства с propSegments[0], у которых есть ещё сегменты
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
        result.push(
          ...this.getPropertySearchItems(prop.children, propSegments.slice(1)),
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

  constructor(private config: SearchEngineConfig) {
    this.searchInputRef = createFocusableRef<HTMLInputElement>();

    makeObservable(this, {
      searchText: observable.ref,
      formattedSearchText: computed,
      segments: computed.struct,
      endsWithDot: computed,
      isActive: computed,
      suggestionSuffix: computed,
      handleSearchInput: action,
      handleKeyDown: action,
      resetSearch: action,
    });
  }
}

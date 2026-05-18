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
  getPresentationMode: () => 'tree' | 'list';
}

export class SearchEngine {
  searchInputRef: FocusableRef<HTMLInputElement>;

  searchText = '';

  searchCacheKey = '';
  isSearching = false;
  private scrollToSearchMatchTimeout: ReturnType<typeof setTimeout> | null =
    null;

  private static readonly itemHeight = 22;

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

    const completingSegment = this.endsWithDot
      ? ''
      : segments[segments.length - 1];
    if (!this.endsWithDot && !completingSegment) return '';

    const rootItems = this.config.getRootItems();
    const pathSegments = this.endsWithDot ? segments : segments.slice(0, -1);
    const candidates = this.getCandidatePropsAtDepth(rootItems, pathSegments);

    for (const prop of candidates) {
      const nameLower = prop.searchData.property;
      const nameOriginal = prop.property ?? '';

      if (
        nameLower.startsWith(completingSegment) &&
        nameLower.length > completingSegment.length
      ) {
        return nameOriginal.slice(completingSegment.length);
      }
    }

    return '';
  }

  handleSearchInput = (e: ChangeEvent<HTMLInputElement>) => {
    this.searchText = e.target.value;
    this.scheduleScrollToFirstSearchMatch();
  };

  handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && this.suggestionSuffix) {
      e.preventDefault();
      this.searchText += this.suggestionSuffix;
      this.scheduleScrollToFirstSearchMatch();
    }
  };

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

    const listItems = this.getListItems(this.config.getRootItems());
    const index = listItems.findIndex((item) => this.isSearchTargetMatched(item));

    if (index < 0) return;

    const virtualizerOffset = this.config.getItemOffset(index);
    const offset =
      virtualizerOffset > 0
        ? virtualizerOffset
        : index * SearchEngine.itemHeight;

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

  /**
   * Рекурсивно собирает все VMListItem из дерева (включая вложенные).
   */
  private collectAllVMs(rootItems: ListItem<any>[]): VMListItem[] {
    const result: VMListItem[] = [];
    const traverse = (item: ListItem<any>) => {
      if (item instanceof VMListItem) {
        result.push(item);
        for (const child of item.children) {
          traverse(child);
        }
      }
    };
    for (const item of rootItems) {
      traverse(item);
    }
    return result;
  }

  /**
   * Возвращает PropertyListItem на целевой глубине для получения подсказки.
   * pathSegments — все сегменты кроме последнего (путь навигации).
   */
  private getCandidatePropsAtDepth(
    rootItems: ListItem<any>[],
    pathSegments: string[],
  ): PropertyListItem[] {
    // Собираем ВСЕ VM рекурсивно (включая вложенные)
    const allVMs = this.collectAllVMs(rootItems);

    if (pathSegments.length === 0) {
      // Нет навигации — прямые свойства ВСЕХ VM на любой глубине
      const props: PropertyListItem[] = [];
      for (const vm of allVMs) {
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

    for (const vm of allVMs) {
      const directProps = vm.children.filter(
        (c): c is PropertyListItem => c instanceof PropertyListItem,
      );
      const firstSegmentIsExactProperty = directProps.some(
        (prop) => prop.searchData.property === firstSeg,
      );
      const vmNameMatch =
        !firstSegmentIsExactProperty &&
        (vm.searchData.name.includes(firstSeg) ||
          vm.searchData.id.includes(firstSeg));

      if (vmNameMatch) {
        // VM совпал по имени — следующий уровень это прямые свойства VM
        if (pathSegments.length === 1) {
          result.push(...directProps);
        } else {
          result.push(
            ...this.navigatePropertyPath(directProps, pathSegments.slice(1)),
          );
        }
      } else if (firstSegmentIsExactProperty) {
        // Совпадение через свойство — заходим в совпадающие свойства
        const matchingProps = this.getPathMatchingProps(directProps, firstSeg);

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
   * Уже введённый path-сегмент должен совпадать строго:
   * `product.` заходит только в `product`, а не в `productAsyncTasks`
   * или `serviceAndProductSearch`.
   */
  private getPathMatchingProps(
    props: PropertyListItem[],
    segment: string,
  ): PropertyListItem[] {
    return props.filter((p) => p.searchData.property === segment);
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
    const matchingProps = this.getPathMatchingProps(props, seg);

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

  /**
   * Плоский список для режима 'list': все VM показываются независимо,
   * сворачивание VM скрывает только его свойства, но не дочерние VM.
   */
  private getFlatListItems(rootItems: ListItem<any>[]): ListItem<any>[] {
    const result: ListItem<any>[] = [];

    const collectItem = (item: ListItem<any>) => {
      if (item instanceof VMListItem) {
        result.push(item);
        if (item.isExpanded) {
          for (const child of item.children) {
            if (!(child instanceof VMListItem)) {
              result.push(...child.expandedChildrenWithSelf);
            }
          }
        }
        for (const child of item.children) {
          if (child instanceof VMListItem) {
            collectItem(child);
          }
        }
      } else {
        result.push(item);
        if (item.isExpanded) {
          result.push(...item.expandedChildren);
        }
      }
    };

    for (const item of rootItems) {
      collectItem(item);
    }

    return result;
  }

  getListItems(rootItems: ListItem<any>[]): ListItem<any>[] {
    if (!this.isActive) {
      if (this.config.getPresentationMode() === 'list') {
        return this.getFlatListItems(rootItems);
      }
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
    const directProps = vmItem.children.filter(
      (c): c is PropertyListItem => c instanceof PropertyListItem,
    );
    const nestedVMs = vmItem.children.filter(
      (c): c is VMListItem => c instanceof VMListItem,
    );
    const hasPathSyntax = this.endsWithDot || segments.length > 1;
    const firstSegmentIsExactProperty =
      hasPathSyntax &&
      directProps.some((prop) => prop.searchData.property === firstSeg);
    const vmMatchesByName =
      !firstSegmentIsExactProperty &&
      (vmItem.searchData.name.includes(firstSeg) ||
        vmItem.searchData.id.includes(firstSeg));

    // Если VM совпал по имени/id — первый сегмент «израсходован» на VM,
    // остальные сегменты фильтруют свойства.
    // Если в path-синтаксисе есть exact-свойство с таким именем, сегмент
    // относится к свойству, даже когда VM name тоже содержит этот текст.
    const propSegments = vmMatchesByName ? segments.slice(1) : segments;

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
    const autoExpandProps = isNotLastSeg
      ? this.getPathMatchingProps(properties, currentSeg)
      : [];

    for (const prop of properties) {
      result.push(prop);

      const matches = autoExpandProps.includes(prop);

      if (matches && isNotLastSeg) {
        // Автораскрытие по пути поиска: рекурсивно включаем дочерние свойства
        result.push(
          ...this.getPropertySearchItems(prop.children, propSegments.slice(1)),
        );
      } else if (prop.isExpanded) {
        // Ручное раскрытие пользователем (клик) — уважаем кеш раскрытия
        result.push(...prop.expandedChildren);
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

  private isSearchTargetMatched(item: ListItem<any>): boolean {
    if (!this.isActive) return false;

    if (item instanceof VMListItem) {
      return this.isVMSearchTargetMatched(item);
    }

    if (item instanceof PropertyListItem) {
      return this.isPropertySearchTargetMatched(item);
    }

    return false;
  }

  private isVMSearchTargetMatched(item: VMListItem): boolean {
    const { segments } = this;
    if (segments.length === 0) return false;

    const firstSeg = segments[0];
    const hasPathSyntax = this.endsWithDot || segments.length > 1;
    const firstSegmentIsExactProperty =
      hasPathSyntax &&
      item.children.some(
        (child) =>
          child instanceof PropertyListItem &&
          child.searchData.property === firstSeg,
      );

    return (
      !firstSegmentIsExactProperty &&
      (item.searchData.name.includes(firstSeg) ||
        item.searchData.id.includes(firstSeg))
    );
  }

  private isPropertySearchTargetMatched(item: PropertyListItem): boolean {
    const { segments } = this;
    if (segments.length === 0) return false;

    let parent: ListItem<any> = item.parentListItem;
    let propLevel = 0;
    const ancestors: PropertyListItem[] = [];

    while (parent instanceof PropertyListItem) {
      ancestors.push(parent);
      propLevel++;
      parent = parent.parentListItem;
    }

    if (!(parent instanceof VMListItem)) return false;

    const firstSeg = segments[0];
    const hasPathSyntax = this.endsWithDot || segments.length > 1;
    const parentDirectProps = parent.children.filter(
      (child): child is PropertyListItem => child instanceof PropertyListItem,
    );
    const firstSegmentIsExactProperty =
      hasPathSyntax &&
      parentDirectProps.some((prop) => prop.searchData.property === firstSeg);
    const vmMatchesByName =
      !firstSegmentIsExactProperty &&
      (parent.searchData.name.includes(firstSeg) ||
        parent.searchData.id.includes(firstSeg));

    const propSegments = vmMatchesByName ? segments.slice(1) : segments;
    if (propSegments.length === 0) return false;

    const targetLevel = propSegments.length - 1;

    // Сначала проверяем path-предков до целевого сегмента.
    const depthToCheck = Math.min(propLevel, targetLevel);
    for (let i = 0; i < depthToCheck; i++) {
      const ancestor = ancestors[propLevel - 1 - i];
      if (!this.isPropertyFittedToSegment(ancestor, propSegments[i], true)) {
        return false;
      }
    }

    if (propLevel !== targetLevel) return false;

    const isPathSegment = this.endsWithDot || propLevel < propSegments.length - 1;
    return this.isPropertyFittedToSegment(
      item,
      propSegments[targetLevel],
      isPathSegment,
    );
  }

  /**
   * Определяет, должен ли элемент отображаться «нормально» (true)
   * или «затемнённо» (false — серым).
   *
   * Для PropertyListItem: проходим вверх по цепочке parentListItem,
   * собирая предков и вычисляя уровень вложенности.
   * Затем проверяем, что вся цепочка предков соответствует сегментам поиска:
   * если хотя бы один предок не совпадает с нужным сегментом —
   * элемент находится в «несовпадающей ветке» и тоже должен быть серым.
   */
  isItemFitted(item: ListItem<any>): boolean {
    if (!this.isActive) return true;

    if (item instanceof PropertyListItem) {
      const { segments } = this;
      if (segments.length === 0) return true;

      // Собираем цепочку PropertyListItem-предков (от ближайшего к VM)
      let parent: ListItem<any> = item.parentListItem;
      let propLevel = 0;
      const ancestors: PropertyListItem[] = [];

      while (parent instanceof PropertyListItem) {
        ancestors.push(parent);
        propLevel++;
        parent = parent.parentListItem;
      }

      // Предок не VMListItem (например, ExtraListItem) — не фильтруем
      if (!(parent instanceof VMListItem)) return true;

      const firstSeg = segments[0];
      const hasPathSyntax = this.endsWithDot || segments.length > 1;
      const parentDirectProps = parent.children.filter(
        (child): child is PropertyListItem => child instanceof PropertyListItem,
      );
      const firstSegmentIsExactProperty =
        hasPathSyntax &&
        parentDirectProps.some((prop) => prop.searchData.property === firstSeg);
      const vmMatchesByName =
        !firstSegmentIsExactProperty &&
        (parent.searchData.name.includes(firstSeg) ||
          parent.searchData.id.includes(firstSeg));

      const propSegments = vmMatchesByName ? segments.slice(1) : segments;

      // Проверяем цепочку предков: каждый должен совпадать с нужным сегментом.
      // ancestors хранятся в обратном порядке: [ближайший к item, ..., ближайший к VM].
      // Предок на глубине i от VM → ancestors[propLevel - 1 - i].
      const depthToCheck = Math.min(propLevel, propSegments.length);
      for (let i = 0; i < depthToCheck; i++) {
        const ancestor = ancestors[propLevel - 1 - i]; // предок на глубине i от VM
        const seg = propSegments[i];
        if (!this.isPropertyFittedToSegment(ancestor, seg, true)) {
          // Предок не совпадает — весь дочерний узел в «несовпадающей ветке»
          return false;
        }
      }

      // Предки все совпали. Теперь проверяем сам элемент.
      if (propLevel >= propSegments.length) {
        // Мы глубже последнего сегмента — все предки совпали, показываем нормально
        return true;
      }

      const seg = propSegments[propLevel];
      const isPathSegment =
        this.endsWithDot || propLevel < propSegments.length - 1;
      return this.isPropertyFittedToSegment(item, seg, isPathSegment);
    }

    return true;
  }

  /**
   * Для path-сегмента exact-match важнее includes.
   * Если среди соседей есть `product`, то `product.` должен подсветить только
   * `product`, а не `serviceAndProductSearch`.
   */
  private isPropertyFittedToSegment(
    item: PropertyListItem,
    segment: string | undefined,
    preferExact: boolean,
  ): boolean {
    if (!segment) return true;
    if (!preferExact) return item.searchData.property.includes(segment);

    return item.searchData.property === segment;
  }

  resetSearch = () => {
    if (this.scrollToSearchMatchTimeout) {
      clearTimeout(this.scrollToSearchMatchTimeout);
      this.scrollToSearchMatchTimeout = null;
    }
    this.searchText = '';
    this.focusInput();
  };

  focusInput = () => {
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

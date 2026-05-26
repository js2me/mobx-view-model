import {
  computed,
  makeObservable,
  observable,
  reaction,
  runInAction,
} from 'mobx';
import { createElement, type ReactNode } from 'react';
import SimpleBar from 'simplebar';
import { createRef, type Ref } from 'yummies/mobx';
import type { Maybe } from 'yummies/types';
import { type ViewModelDevtools, ViewModelImpl } from '@/model';
import { ExtraListItem } from '@/model/list-item/extra-list-item';
import { MetaListItem } from '@/model/list-item/meta-list-item';
import { PropertyListItem } from '@/model/list-item/property-list-item';
import { PropertyWatchHistoryHeaderListItem } from '@/model/list-item/property-watch-history-header-item';
import { PropertyWatchHistoryListItem } from '@/model/list-item/property-watch-history-item';
import { VMListItem } from '@/model/list-item/vm-list-item';
import { ExtraListItemRender } from './list-items/extra-list-item-render';
import { MetaListItemRender } from './list-items/meta-list-item-render';
import { PropertyListItemRender } from './list-items/property-list-item-render';
import { PropertyWatchHistoryHeaderRender } from './list-items/property-watch-history-header-render';
import { PropertyWatchHistoryItemRender } from './list-items/property-watch-history-item-render';
import { VmListItemRender } from './list-items/vm-list-item-render';

const listItemRenderersMap = new Map<any, any>([
  [VMListItem, VmListItemRender],
  [ExtraListItem, ExtraListItemRender],
  [PropertyListItem, PropertyListItemRender],
  [PropertyWatchHistoryHeaderListItem, PropertyWatchHistoryHeaderRender],
  [PropertyWatchHistoryListItem, PropertyWatchHistoryItemRender],
  [MetaListItem, MetaListItemRender],
]);

const ITEM_HEIGHT = 22;
const BUFFER_SIZE = 10; // Количество дополнительных элементов сверху и снизу для более плавного скролла

export class DevtoolsContentVM extends ViewModelImpl<{
  devtools: ViewModelDevtools;
  ref?: Ref<HTMLDivElement>;
}> {
  private startIndex = 0;
  private endIndex = 0;

  itemsCount = 0;

  contentRef = createRef<HTMLDivElement, { scrollbar: Maybe<SimpleBar> }>({
    meta: { scrollbar: null },
    onChange: this.payload.ref,
    onSet: (node) => {
      const scrollbar = new SimpleBar(node);
      this.contentRef.meta = { scrollbar };
      const scrollElement = scrollbar.getScrollElement();


      if (!scrollElement) return;

      runInAction(() => {
        // Увеличиваем количество отображаемых элементов с учетом буфера
        const visibleItemsCount = Math.ceil(
          scrollElement.clientHeight / ITEM_HEIGHT,
        );
        this.itemsCount = visibleItemsCount + BUFFER_SIZE * 2;
      });

      // Подписываемся на изменения длины списка элементов
      reaction(
        () => this.payload.devtools.listItems.length,
        () => this.handleRefreshItems(),
        {
          fireImmediately: true,
        },
      );

      // Подписываемся на изменения startIndex и endIndex для принудительной перерисовки
      reaction(
        () => [this.startIndex, this.endIndex],
        () => {
          // Просто триггерим перерасчет itemNodes
        },
        {
          fireImmediately: false,
        },
      );

      scrollElement.addEventListener('scroll', this.handleRefreshItems);

      requestAnimationFrame(() => {
        this.payload.devtools.searchEngine.focusInput();
      });
    },
  });

  @computed
  get virtualHeight() {
    return this.payload.devtools.listItems.length * ITEM_HEIGHT;
  }

  get itemNodes(): ReactNode[] {
    const result: ReactNode[] = [];

    // Обновляем диапазон элементов при каждом рендере
    this.updateVisibleRange();

    // Добавляем пустой div в начале для смещения (оффсет сверху)
    if (this.startIndex > 0) {
      const topOffset = this.startIndex * ITEM_HEIGHT;
      result.push(
        createElement('div', {
          key: 'top-offset',
          style: { height: `${topOffset}px` },
        }),
      );
    }

    // Рендерим только видимые элементы в нужном диапазоне
    for (let i = this.startIndex; i < this.endIndex; i++) {
      const listItem = this.payload.devtools.listItems[i];
      const component = listItemRenderersMap.get(listItem?.constructor);

      if (component) {
        result.push(
          createElement(component, { key: `item-${i}`, item: listItem }),
        );
      }
    }

    // Добавляем пустой div в конце для смещения (оффсет снизу)
    const bottomItemCount =
      this.payload.devtools.listItems.length - this.endIndex;
    if (bottomItemCount > 0) {
      const bottomOffset = bottomItemCount * ITEM_HEIGHT;
      result.push(
        createElement('div', {
          key: 'bottom-offset',
          style: { height: `${bottomOffset}px` },
        }),
      );
    }

    return result;
  }

  private updateVisibleRange = () => {
    const scrollElement = this.contentRef.meta.scrollbar?.getScrollElement();
    if (!scrollElement) {
      // Если скролл элемент недоступен, показываем первые элементы
      this.startIndex = 0;
      this.endIndex = Math.min(
        this.itemsCount,
        this.payload.devtools.listItems.length,
      );
      return;
    }

    const scrollTop = scrollElement.scrollTop;
    const visibleStartIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    const visibleItemsCount = Math.ceil(
      scrollElement.clientHeight / ITEM_HEIGHT,
    );

    // Рассчитываем диапазон с учетом буфера
    const newStartIndex = Math.max(0, visibleStartIndex - BUFFER_SIZE);
    const newEndIndex = Math.min(
      this.payload.devtools.listItems.length,
      visibleStartIndex + visibleItemsCount + BUFFER_SIZE,
    );

    // Обновляем значения только если они изменились, чтобы вызвать перерисовку
    if (this.startIndex !== newStartIndex || this.endIndex !== newEndIndex) {
      runInAction(() => {
        this.startIndex = newStartIndex;
        this.endIndex = newEndIndex;
      });
    }
  };

  handleRefreshItems = () => {
    // Вызываем обновление диапазона, что должно привести к перерисовке
    this.updateVisibleRange();
  };

  willMount(): void {
    makeObservable<typeof this, 'startIndex' | 'endIndex'>(this, {
      startIndex: observable.ref,
      endIndex: observable.ref,
      itemsCount: observable.ref,
    });
  }
}

import {
  computed,
  makeObservable,
  observable,
  reaction,
  runInAction,
} from 'mobx';
import { createElement, type CSSProperties, type ReactNode } from 'react';
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
const BUFFER_SIZE = 10;

function isTreeItem(item: unknown): item is VMListItem | ExtraListItem {
  return item instanceof VMListItem || item instanceof ExtraListItem;
}

export class DevtoolsContentVM extends ViewModelImpl<{
  devtools: ViewModelDevtools;
  ref?: Ref<HTMLDivElement>;
}> {
  private startIndex = 0;
  private endIndex = 0;
  stickyVmItemIndex = -1;
  itemsCount = 0;

  private get listItems() {
    return this.payload.devtools.listItems;
  }

  contentRef = createRef<HTMLDivElement, { scrollbar: Maybe<SimpleBar> }>({
    meta: { scrollbar: null },
    onChange: this.payload.ref,
    onSet: (node) => {
      const scrollbar = new SimpleBar(node);
      this.contentRef.meta = { scrollbar };
      const scrollElement = scrollbar.getScrollElement();
      if (!scrollElement) return;

      runInAction(() => {
        const visibleItemsCount = Math.ceil(
          scrollElement.clientHeight / ITEM_HEIGHT,
        );
        this.itemsCount = visibleItemsCount + BUFFER_SIZE * 2;
      });

      reaction(
        () => this.listItems.length,
        () => this.updateVisibleRange(),
        { fireImmediately: true },
      );

      scrollElement.addEventListener('scroll', this.handleScroll);

      requestAnimationFrame(() => {
        this.payload.devtools.searchEngine.focusInput();
      });
    },
  });

  @computed
  get virtualHeight() {
    return this.listItems.length * ITEM_HEIGHT;
  }

  get stickyVmItem(): VMListItem | ExtraListItem | null {
    if (this.stickyVmItemIndex < 0) return null;
    const item = this.listItems[this.stickyVmItemIndex];
    return isTreeItem(item) ? item : null;
  }

  @computed
  get itemNodes(): ReactNode[] {
    this.updateVisibleRange();

    const { stickyScopeEndIndex, stickyDepth } = this.computeStickyScope();

    return [
      ...this.createOffsetNode('top', this.startIndex),
      ...this.createVisibleItemNodes(stickyScopeEndIndex, stickyDepth),
      ...this.createOffsetNode(
        'bottom',
        this.listItems.length - this.endIndex,
      ),
    ];
  }

  private computeStickyScope() {
    if (this.stickyVmItemIndex < 0) {
      return { stickyScopeEndIndex: -1, stickyDepth: -1 };
    }

    const stickyDepth = this.listItems[this.stickyVmItemIndex].depth;
    let stickyScopeEndIndex = this.endIndex;

    for (let i = this.stickyVmItemIndex + 1; i < this.endIndex; i++) {
      if (isTreeItem(this.listItems[i]) && this.listItems[i].depth <= stickyDepth) {
        stickyScopeEndIndex = i;
        break;
      }
    }

    return { stickyScopeEndIndex, stickyDepth };
  }

  private createOffsetNode(
    position: 'top' | 'bottom',
    count: number,
  ): ReactNode[] {
    if (count <= 0) return [];
    return [
      createElement('div', {
        key: `${position}-offset`,
        style: { height: `${count * ITEM_HEIGHT}px` },
      }),
    ];
  }

  private createVisibleItemNodes(
    stickyScopeEndIndex: number,
    stickyDepth: number,
  ): ReactNode[] {
    const result: ReactNode[] = [];

    for (let i = this.startIndex; i < this.endIndex; i++) {
      const listItem = this.listItems[i];
      const component = listItemRenderersMap.get(listItem?.constructor);
      if (!component) continue;

      const isInStickyScope =
        stickyScopeEndIndex >= 0 && i < stickyScopeEndIndex;

      result.push(
        createElement(
          'div',
          {
            key: listItem.key,
            style: {
              '--depth-offset': isInStickyScope ? stickyDepth : 0,
              display: 'contents',
            } as CSSProperties,
          },
          createElement(component, { item: listItem }),
        ),
      );
    }

    return result;
  }

  private updateVisibleRange = () => {
    const scrollElement = this.contentRef.meta.scrollbar?.getScrollElement();
    if (!scrollElement) {
      this.startIndex = 0;
      this.endIndex = Math.min(this.itemsCount, this.listItems.length);
      this.stickyVmItemIndex = -1;
      return;
    }

    const scrollTop = scrollElement.scrollTop;
    const visibleStartIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    const visibleItemsCount = Math.ceil(
      scrollElement.clientHeight / ITEM_HEIGHT,
    );

    const newStartIndex = Math.max(0, visibleStartIndex - BUFFER_SIZE);
    const newEndIndex = Math.min(
      this.listItems.length,
      visibleStartIndex + visibleItemsCount + BUFFER_SIZE,
    );

    const newStickyIndex = this.findStickyTreeItemIndex(visibleStartIndex);

    if (
      this.startIndex !== newStartIndex ||
      this.endIndex !== newEndIndex ||
      this.stickyVmItemIndex !== newStickyIndex
    ) {
      runInAction(() => {
        this.startIndex = newStartIndex;
        this.endIndex = newEndIndex;
        this.stickyVmItemIndex = newStickyIndex;
      });
    }
  };

  private findStickyTreeItemIndex(visibleStartIndex: number): number {
    const searchFrom = Math.min(visibleStartIndex, this.listItems.length - 1);
    for (let i = searchFrom; i >= 0; i--) {
      if (isTreeItem(this.listItems[i])) {
        return i >= visibleStartIndex ? -1 : i;
      }
    }
    return -1;
  }

  handleScroll = () => {
    this.updateVisibleRange();
  };

  willMount(): void {
    makeObservable<typeof this, 'startIndex' | 'endIndex'>(this, {
      startIndex: observable.ref,
      endIndex: observable.ref,
      itemsCount: observable.ref,
      stickyVmItemIndex: observable.ref,
    });
  }
}

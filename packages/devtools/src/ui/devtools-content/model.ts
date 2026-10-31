import { action, computed, makeObservable, observable, reaction } from 'mobx';
import SimpleBar from 'simplebar-core';
import { createRef } from 'yummies/mobx';
import type { InspectorViewport } from '@/model/devtools-inspector';
import { isStickyTreeItem, LIST_ITEM_HEIGHT } from '@/model/inspector-scroll';
import { ViewModelImpl } from '@/model/lib/view-model.impl';
import type { ViewModelDevtools } from '@/model/view-model-devtools';

const BUFFER_SIZE = 10;

export class DevtoolsContentVM
  extends ViewModelImpl<{ devtools: ViewModelDevtools }>
  implements InspectorViewport
{
  readonly devtools = this.payload.devtools;
  private scrollbar?: SimpleBar;
  private resizeObserver?: ResizeObserver;
  private focusFrame?: number;
  private disposeListReaction?: () => void;
  private scrollElement?: HTMLElement;
  scrollOffset = 0;
  viewportHeight = 0;
  readonly contentRef = createRef<HTMLDivElement>({
    onSet: this.attach.bind(this),
    onUnset: this.detach.bind(this),
  });

  get listItems() {
    return this.devtools.inspector.rows;
  }
  get startIndex() {
    return Math.max(
      0,
      Math.floor(this.scrollOffset / LIST_ITEM_HEIGHT) - BUFFER_SIZE,
    );
  }
  get endIndex() {
    return Math.min(
      this.listItems.length,
      Math.ceil((this.scrollOffset + this.viewportHeight) / LIST_ITEM_HEIGHT) +
        BUFFER_SIZE,
    );
  }
  get visibleItems() {
    return this.listItems.slice(this.startIndex, this.endIndex);
  }
  get topOffset() {
    return this.startIndex * LIST_ITEM_HEIGHT;
  }
  get bottomOffset() {
    return (
      Math.max(0, this.listItems.length - this.endIndex) * LIST_ITEM_HEIGHT
    );
  }
  get virtualHeight() {
    return this.listItems.length * LIST_ITEM_HEIGHT;
  }
  get stickyVmItemIndex() {
    return this.listItems.findStickyIndex(
      Math.floor(this.scrollOffset / LIST_ITEM_HEIGHT),
    );
  }
  get stickyVmItem() {
    const item = this.listItems.at(this.stickyVmItemIndex);
    return isStickyTreeItem(item) ? item : null;
  }

  willMount() {
    makeObservable<this, 'measure'>(this, {
      scrollOffset: observable.ref,
      viewportHeight: observable.ref,
      startIndex: computed,
      endIndex: computed,
      visibleItems: computed,
      topOffset: computed,
      bottomOffset: computed,
      virtualHeight: computed,
      stickyVmItemIndex: computed,
      stickyVmItem: computed,
      measure: action.bound,
    });
  }
  scrollTo(offset: number) {
    this.scrollElement?.scrollTo({ top: offset });
  }
  scrollBy(offset: number) {
    this.scrollTo((this.scrollElement?.scrollTop ?? 0) + offset);
  }
  private measure() {
    this.scrollOffset = this.scrollElement?.scrollTop ?? 0;
    this.viewportHeight = this.scrollElement?.clientHeight ?? 0;
  }
  private attach(node: HTMLDivElement) {
    this.detach();
    this.scrollbar = new SimpleBar(node);
    this.scrollElement = this.scrollbar.getScrollElement() ?? undefined;
    this.devtools.inspector.viewport = this;
    this.measure();
    this.scrollElement?.addEventListener('scroll', this.measure);
    this.resizeObserver = new ResizeObserver(this.measure);
    this.resizeObserver.observe(node);
    this.disposeListReaction = reaction(
      () => this.listItems.length,
      this.measure,
    );
    this.focusFrame = requestAnimationFrame(
      this.devtools.inspector.search.focusInput,
    );
  }
  private detach() {
    if (this.devtools.inspector.viewport === this) {
      this.devtools.inspector.viewport = undefined;
      this.devtools.inspector.search.handleSearchInputBlur();
    }
    this.scrollElement?.removeEventListener('scroll', this.measure);
    this.resizeObserver?.disconnect();
    this.disposeListReaction?.();
    if (this.focusFrame !== undefined) cancelAnimationFrame(this.focusFrame);
    this.scrollbar?.unMount();
    this.scrollbar = undefined;
    this.scrollElement = undefined;
  }
  willUnmount() {
    this.detach();
  }
}

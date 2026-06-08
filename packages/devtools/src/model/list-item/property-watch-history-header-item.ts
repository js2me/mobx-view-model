import { computed, makeObservable } from 'mobx';
import type { Maybe } from 'yummies/types';
import type { ViewModelDevtools } from '../view-model-devtools';
import { ListItem } from './list-item';
import type { PropertyListItem } from './property-list-item';

export class PropertyWatchHistoryHeaderListItem extends ListItem<any> {
  get depth() {
    return this.parent.depth + 1;
  }

  get label() {
    return `watch history (${this.parent.watchHistory.length})`;
  }

  constructor(
    devtools: ViewModelDevtools,
    public parent: PropertyListItem,
  ) {
    super(devtools, `${parent.key}-watch-header`, undefined);

    computed(this, 'label');
    makeObservable(this);
  }

  static create(parent: PropertyListItem) {
    const cache = parent.cache;
    const key = `${parent.key}-watch-header/list-item`;
    let item: Maybe<PropertyWatchHistoryHeaderListItem> = cache.get(key);

    if (!item) {
      item = new PropertyWatchHistoryHeaderListItem(parent.devtools, parent);
      cache.set(key, item);
    }

    return item;
  }
}

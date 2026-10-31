import { computed, makeObservable } from 'mobx';
import type { DevtoolsInspector } from '../devtools-inspector';
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
    inspector: DevtoolsInspector,
    public parent: PropertyListItem,
  ) {
    super(inspector, `${parent.key}-watch-header`, undefined);

    computed(this, 'label');
    makeObservable(this);
  }

  static create(parent: PropertyListItem) {
    const cache = parent.cache;
    const key = `${parent.key}-watch-header/list-item`;
    const cached = cache.get(key);
    let item =
      cached instanceof PropertyWatchHistoryHeaderListItem ? cached : undefined;

    if (!item) {
      item = new PropertyWatchHistoryHeaderListItem(parent.inspector, parent);
      cache.set(key, item);
    }

    return item;
  }
}

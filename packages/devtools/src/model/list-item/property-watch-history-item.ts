import { Copy } from '@gravity-ui/icons';
import { computed, makeObservable } from 'mobx';
import type { Maybe } from 'yummies/types';
import type { DevtoolsInspector } from '../devtools-inspector';
import {
  detectPropertyValueType,
  getPropertyInstanceClassName,
} from '../inspection/detect-property-value-type';
import { isInaccessible } from '../inspection/safe-access';
import { createPropertyChildren } from './create-property-children';
import { ListItem, type ListItemOperation } from './list-item';
import { MetaListItem } from './meta-list-item';
import type { PropertyListItem } from './property-list-item';
import type { PropertyWatchHistoryEntry } from './property-watch';
import { formatPropertyWatchValue } from './watch/format-property-watch-value';

export class PropertyWatchHistoryListItem extends ListItem<any> {
  get depth() {
    return this.parent.depth + 1;
  }

  get path() {
    return `${this.parent.path}@watch:${this.entry.id}`;
  }

  get data() {
    return this.entry.value;
  }

  get formattedTime() {
    return new Date(this.entry.timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  }

  get order() {
    return this._order;
  }

  get property(): Maybe<string> {
    return undefined;
  }

  get isEditMode() {
    return false;
  }

  get isInaccessibleDisplay() {
    return isInaccessible(this.data);
  }

  get type() {
    return detectPropertyValueType(this.data);
  }

  get dataType() {
    if (this.isInaccessibleDisplay) {
      return 'object';
    }

    return typeof this.data;
  }

  get instanceClassName() {
    return getPropertyInstanceClassName(this.data);
  }

  get stringifiedData() {
    return formatPropertyWatchValue(this.data);
  }

  get children(): PropertyListItem[] {
    return createPropertyChildren(
      this,
      `${this.key}/value`,
      this.inspector.settings.sortPropertiesBy,
      this.type,
    );
  }

  get closingItem(): ListItem<any> | null {
    switch (this.type) {
      case 'array':
        return new MetaListItem(
          this.inspector,
          `${this.key}/closing-tag`,
          ']',
          this.depth,
        );
      case 'instance':
      case 'object':
        return new MetaListItem(
          this.inspector,
          `${this.key}/closing-tag`,
          '}',
          this.depth,
        );
      default:
        return null;
    }
  }

  get operations(): ListItemOperation<any>[] {
    return [
      {
        title: 'Copy',
        icon: Copy,
        action: () => navigator.clipboard.writeText(this.entry.formattedValue),
      },
    ];
  }

  constructor(
    inspector: DevtoolsInspector,
    public parent: PropertyListItem,
    public entry: PropertyWatchHistoryEntry,
    private _order: number,
  ) {
    super(inspector, `${parent.key}-watch-${entry.id}`, undefined);

    computed(this, 'formattedTime');
    computed(this, 'type');
    computed(this, 'dataType');
    computed(this, 'instanceClassName');
    makeObservable(this);
  }

  static create(
    parent: PropertyListItem,
    entry: PropertyWatchHistoryEntry,
    order: number,
  ) {
    const cache = parent.cache;
    const key = `${parent.key}-watch-${entry.id}/list-item`;
    const cached = cache.get(key);
    let item =
      cached instanceof PropertyWatchHistoryListItem ? cached : undefined;

    if (!item) {
      item = new PropertyWatchHistoryListItem(
        parent.inspector,
        parent,
        entry,
        order,
      );
      cache.set(key, item);
    }

    return item;
  }
}

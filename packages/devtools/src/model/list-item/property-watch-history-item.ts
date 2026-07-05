import { Copy } from '@gravity-ui/icons';
import { computed, makeObservable } from 'mobx';
import type { Maybe } from 'yummies/types';
import { createSnapshotPropertyChildren } from '../utils/create-snapshot-property-children';
import {
  detectPropertyValueType,
  getPropertyInstanceClassName,
} from '../utils/detect-property-value-type';
import {
  formatCopyableValue,
  formatPropertyWatchValue,
} from '../utils/format-property-watch-value';
import { isInaccessible } from '../utils/safe-access';
import type { PropertyWatchHistoryEntry } from '../utils/property-watcher';
import type { ViewModelDevtools } from '../view-model-devtools';
import { ListItem, type ListItemOperation } from './list-item';
import { MetaListItem } from './meta-list-item';
import type { PropertyListItem } from './property-list-item';

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
    return createSnapshotPropertyChildren(
      this.devtools,
      this,
      `${this.key}/value`,
      this.devtools.sortPropertiesBy,
      this.type,
    );
  }

  get closingItem(): ListItem<any> | null {
    switch (this.type) {
      case 'array':
        return new MetaListItem(
          this.devtools,
          `${this.key}/closing-tag`,
          ']',
          this.depth,
        );
      case 'instance':
      case 'object':
        return new MetaListItem(
          this.devtools,
          `${this.key}/closing-tag`,
          '}',
          this.depth,
        );
      default:
        return null;
    }
  }

  get expandedChildren(): ListItem<any>[] {
    if (!this.isExpanded || !this.isExpandable) {
      return [];
    }

    const result: ListItem<any>[] = [];

    let stackIndex = 0;
    const stack: ListItem<any>[] = this.children;

    while (true) {
      const child = stack[stackIndex++];

      if (!child) {
        break;
      }

      result.push(child, ...child.expandedChildren);

      for (const trailing of child.trailingItems) {
        result.push(...trailing.expandedChildrenWithSelf);
      }
    }

    if (this.closingItem) {
      result.push(this.closingItem);
    }

    return result;
  }

  get operations(): ListItemOperation<any>[] {
    return [
      {
        title: 'Copy',
        icon: Copy,
        action: () =>
          navigator.clipboard.writeText(formatCopyableValue(this.data)),
      },
    ];
  }

  constructor(
    devtools: ViewModelDevtools,
    public parent: PropertyListItem,
    public entry: PropertyWatchHistoryEntry,
    private _order: number,
  ) {
    super(devtools, `${parent.key}-watch-${entry.id}`, undefined);

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
    let item: Maybe<PropertyWatchHistoryListItem> = cache.get(key);

    if (!item) {
      item = new PropertyWatchHistoryListItem(
        parent.devtools,
        parent,
        entry,
        order,
      );
      cache.set(key, item);
    }

    return item;
  }
}

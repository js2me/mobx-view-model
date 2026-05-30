import { Check, Copy, Eye, EyeSlash, Pencil, Play, ToggleOn, Xmark } from '@gravity-ui/icons';
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import type { Maybe } from 'yummies/types';
import {
  getCollectionKind,
  getMapEntryAt,
  getSetValueAt,
  type CollectionKind,
} from '../utils/collection-like';
import { createDatePreviewChildren } from '../utils/create-date-preview-children';
import { formatSearchSegmentKey } from '../utils/format-search-key';
import { getAllKeys } from '../utils/get-all-keys';
import {
  getConstructorName,
  isInaccessible,
  INACCESSIBLE,
} from '../utils/safe-access';
import { sortPropertyListItems } from '../utils/sort-property-keys';
import {
  PropertyWatcher,
  type PropertyWatchHistoryEntry,
} from '../utils/property-watcher';
import type { ViewModelDevtools } from '../view-model-devtools';
import { ListItem, type ListItemOperation } from './list-item';
import { MetaListItem } from './meta-list-item';
import { PropertyEditor } from './property-editor';
import { PropertyWatchHistoryHeaderListItem } from './property-watch-history-header-item';
import { PropertyWatchHistoryListItem } from './property-watch-history-item';
import { VMListItem } from './vm-list-item';

export class PropertyListItem extends ListItem<any> {
  editor = new PropertyEditor(this);

  isWatching = false;

  watchHistory: PropertyWatchHistoryEntry[] = [];

  private watcher = new PropertyWatcher();

  get isExpanded() {
    return this.devtools.searchEngine.isPropertyItemExpanded(this);
  }

  get isExpandable() {
    return this.devtools.searchEngine.isPropertyItemExpandable(this);
  }

  get data(): any {
    this.dataWatchAtom.reportObserved();

    if (this.getPreview) {
      return this.getPreview();
    }

    if (this.collectionEntryKind != null && this.collectionEntryIndex != null) {
      const parentData = this.parent.data;

      if (
        this.collectionEntryKind === 'map' &&
        getCollectionKind(parentData) === 'map'
      ) {
        return getMapEntryAt(parentData, this.collectionEntryIndex)?.[1];
      }

      if (
        this.collectionEntryKind === 'set' &&
        getCollectionKind(parentData) === 'set'
      ) {
        return getSetValueAt(parentData, this.collectionEntryIndex);
      }

      return undefined;
    }

    if (!this.property) {
      return undefined;
    }

    try {
      return Reflect.get(this.parent.data, this.property);
    } catch {
      return INACCESSIBLE;
    }
  }

  get mapEntryKey(): unknown {
    if (
      this.collectionEntryKind !== 'map' ||
      this.collectionEntryIndex == null
    ) {
      return undefined;
    }

    const parentData = this.parent.data;

    if (getCollectionKind(parentData) !== 'map') {
      return undefined;
    }

    return getMapEntryAt(parentData, this.collectionEntryIndex)?.[0];
  }

  get descriptor() {
    if (!this.property) {
      return null;
    }

    try {
      return Object.getOwnPropertyDescriptor(this.parent.data, this.property);
    } catch {
      return null;
    }
  }

  get dataType() {
    if (this.isInaccessible) {
      return 'object';
    }
    return typeof this.data;
  }

  get stringifiedDataType() {
    if (this.isInaccessible) {
      return '[object Inaccessible]'
    }
    return Object.prototype.toString.call(this.data);
  }

  get instanceClassName(): string {
    return this.getInstanceClassName(this.data);
  }

  private getInstanceClassName(data: any): string {
    if (this.isInaccessible || isInaccessible(data)) {
      return '<Inaccessible>';
    }

    const constructorName = getConstructorName(data);
    if (constructorName) {
      return constructorName;
    }

    const match = /^\[object (.+)\]$/.exec(
      data == null ? '[object Object]' : Object.prototype.toString.call(data),
    );
    if (match?.[1] && match[1] !== 'Object') {
      return match[1];
    }

    return 'Object';
  }

  get isInaccessibleDisplay() {
    return super.isInaccessible;
  }

  get type() {
    if (this.getPreview) {
      return 'primitive';
    }

    if (this.collectionEntryKind === 'map') {
      return 'map-entry';
    }

    if (this.collectionEntryKind === 'set') {
      return 'set-entry';
    }

    return this.detectValueType(this.data);
  }

  get nestedValueType() {
    return this.detectValueType(this.data);
  }

  private detectValueType(data: any) {
    if (this.isInaccessible) {
      return 'primitive';
    }

    if (Array.isArray(data)) {
      return 'array';
    }

    if (typeof data === 'function') {
      return 'function';
    }

    if (data && typeof data === 'object') {
      if (this.getInstanceClassName(data) !== 'Object') {
        return 'instance';
      }

      return 'object';
    }

    return 'primitive';
  }

  get children(): PropertyListItem[] {
    if (this.collectionEntryKind != null) {
      return sortPropertyListItems(
        this.getChildrenForNestedValue(this.data),
        this.devtools.sortPropertiesBy,
      );
    }

    let listItems: PropertyListItem[] = [];

    if (this.type === 'array') {
      listItems = this.getChildrenForNestedValue(this.data);
    } else if (this.type === 'function') {
      listItems = Object.keys(this.data).map((property, order) => {
        return PropertyListItem.create(
          this.devtools,
          property,
          `${this.path}.${property}`,
          order,
          this,
        );
      });
    } else if (this.type === 'instance' || this.type === 'object') {
      const datePreviewItems = createDatePreviewChildren(
        this.devtools,
        this,
        this.path,
        this.data,
      );
      const entryItems = this.getCollectionEntryChildren();
      const memberItems = sortPropertyListItems(
        getAllKeys(this.data).map((property, order) => {
          return PropertyListItem.create(
            this.devtools,
            property,
            `${this.path}.${property}`,
            order + datePreviewItems.length + entryItems.length,
            this,
          );
        }),
        this.devtools.sortPropertiesBy,
      );

      return [...datePreviewItems, ...entryItems, ...memberItems];
    }

    return sortPropertyListItems(listItems, this.devtools.sortPropertiesBy);
  }

  private getCollectionEntryChildren(): PropertyListItem[] {
    const data = this.data;
    const collectionKind = getCollectionKind(data);

    if (collectionKind === 'map') {
      const items: PropertyListItem[] = [];
      let index = 0;

      for (const _ of data.entries()) {
        items.push(
          PropertyListItem.create(
            this.devtools,
            String(index),
            `${this.path}[${index}]`,
            index,
            this,
            {
              collectionEntryKind: 'map',
              collectionEntryIndex: index,
            },
          ),
        );
        index++;
      }

      return items;
    }

    if (collectionKind === 'set') {
      const items: PropertyListItem[] = [];
      let index = 0;

      for (const _ of data.values()) {
        items.push(
          PropertyListItem.create(
            this.devtools,
            String(index),
            `${this.path}[${index}]`,
            index,
            this,
            {
              collectionEntryKind: 'set',
              collectionEntryIndex: index,
            },
          ),
        );
        index++;
      }

      return items;
    }

    return [];
  }

  private getChildrenForNestedValue(data: any): PropertyListItem[] {
    if (this.isInaccessible || isInaccessible(data)) {
      return [];
    }

    if (Array.isArray(data)) {
      const listItems = Object.keys(data).map((property, order) =>
        PropertyListItem.create(
          this.devtools,
          property,
          `${this.path}.${property}`,
          order,
          this,
        ),
      );

      listItems.push(
        PropertyListItem.create(
          this.devtools,
          'length',
          `${this.path}.length`,
          listItems.length,
          this,
        ),
      );

      return listItems;
    }

    if (typeof data === 'function') {
      return Object.keys(data).map((property, order) => {
        return PropertyListItem.create(
          this.devtools,
          property,
          `${this.path}.${property}`,
          order,
          this,
        );
      });
    }

    if (data && typeof data === 'object') {
      return getAllKeys(data).map((property, order) => {
        return PropertyListItem.create(
          this.devtools,
          property,
          `${this.path}.${property}`,
          order,
          this,
        );
      });
    }

    return [];
  }

  get extraContent() {
    if (this.isExpanded) {
      return null;
    }

    if (this.parent.isExpanded) {
      if (this.parent instanceof VMListItem) {
        return ',';
      }
      if (this.parent instanceof PropertyListItem)
        switch (this.parent.type) {
          case 'array':
          case 'instance':
          case 'object':
          case 'map-entry':
          case 'set-entry':
            return ',';
        }
    }

    return null;
  }

  private get propertyClosingTag(): ListItem<any> | null {
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
      case 'map-entry':
      case 'set-entry':
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

  get closingItem() {
    return this.propertyClosingTag;
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

  get depth() {
    return this.parent.depth + 1;
  }

  get searchData() {
    const property = this.property?.toLowerCase() || '';
    let mapKey = '';
    let mapKeyOriginal = '';

    if (this.collectionEntryKind === 'map' && this.mapEntryKey != null) {
      mapKeyOriginal = formatSearchSegmentKey(this.mapEntryKey);
      mapKey = mapKeyOriginal.toLowerCase();
    }

    return {
      property,
      mapKey,
      mapKeyOriginal,
    };
  }

  private failedStringify = false;

  get isCopiable() {
    return this.type !== 'instance' && !this.failedStringify;
  }

  get stringifiedData() {
    if (this.isInaccessible) {
      return '';
    }

    switch (this.type) {
      case 'object':
      case 'array': {
        try {
          return JSON.stringify(this.data, null, 2);
        } catch (_) {
          runInAction(() => {
            this.failedStringify = true;
          });
          return super.stringifiedData;
        }
      }
      default: {
        switch (this.dataType) {
          case 'symbol':
            return `Symbol(${Symbol.keyFor(this.data as symbol) || ''})`;
          case 'string':
            return `"${String(this.data)}"`;
        }

        return String(this.data);
      }
    }
  }

  get operations() {
    const operations: ListItemOperation<any>[] = [];

    if (this.editor.isEditMode) {
      operations.push(
        this.dataType === 'function'
          ? {
              title: 'Call function',
              icon: Play,
              action: () => {
                this.editor.callFunction();
              },
            }
          : {
              title: 'Apply',
              icon: Check,
              action: () => {
                this.editor.applyEdit();
              },
            },
        {
          title: 'Cancel',
          icon: Xmark,
          action: () => {
            this.editor.cancelEdit();
          },
        },
      );

      return operations;
    }

    if (this.dataType === 'function') {
      operations.push({
        title: 'Call',
        icon: Play,
        action: () => {
          this.editor.editContent = '';
          this.editor.isEditMode = true;
        },
      });
    } else {
      if (this.dataType === 'boolean' && this.editor.isEditable) {
        operations.push({
          title: 'Toggle',
          icon: ToggleOn,
          action: () => {
            this.editor.toggleBoolean();
          },
        });
      }

      if (this.editor.isEditable) {
        operations.push({
          title: 'Edit',
          icon: Pencil,
          action: () => {
            this.editor.startEdit();
          },
        });
      }
    }

    if (this.type !== 'instance' && !this.failedStringify) {
      operations.push({
        title: 'Copy',
        icon: Copy,
        action: () => navigator.clipboard.writeText(this.stringifiedData),
      });
    }

    if (this.dataType !== 'function') {
      operations.push({
        title: this.isWatching
          ? 'Stop watching property changes'
          : 'Watch property changes',
        icon: this.isWatching ? EyeSlash : Eye,
        active: this.isWatching,
        persistent: this.isWatching,
        action: () => {
          this.handleWatchClick();
        },
      });
    }

    return [...operations, ...super.operations];
  }

  handleWatchClick() {
    if (this.isWatching) {
      this.isWatching = false;
      this.watcher.stop();
      return;
    }

    this.isWatching = true;
    this.watcher.start(this);
  }

  clearWatchHistory() {
    this.watchHistory.length = 0;
  }

  get trailingItems(): ListItem<any>[] {
    if (this.watchHistory.length === 0 && !this.isWatching) {
      return [];
    }

    return [
      PropertyWatchHistoryHeaderListItem.create(this),
      ...this.watchHistory.map((entry, index) =>
        PropertyWatchHistoryListItem.create(this, entry, index),
      ),
    ];
  }

  getSavedTempVarNotification(tempVarName: string) {
    return `Property value "${this.property}" saved into ${tempVarName}`;
  }

  get parentListItem(): ListItem<any> {
    return this.parent;
  }

  protected constructor(
    devtools: ViewModelDevtools,
    public property: Maybe<string>,
    public path: string,
    public order: number,
    private parent: ListItem<any>,
    public collectionEntryKind?: CollectionKind,
    public collectionEntryIndex?: number,
    public getPreview?: () => unknown,
  ) {
    super(devtools, PropertyListItem.createKey(parent, property), undefined);

    computed(this, 'type');
    computed(this, 'searchData');
    computed(this, 'propertyClosingTag');
    computed(this, 'dataType');
    computed(this, 'stringifiedDataType');
    computed(this, 'instanceClassName');
    computed(this, 'nestedValueType');
    computed(this, 'mapEntryKey');
    computed(this, 'isInaccessibleDisplay');
    computed(this, 'extraContent');
    observable.ref(this, 'failedStringify');
    observable(this, 'isWatching');
    observable.shallow(this, 'watchHistory');
    action(this, 'handleWatchClick');
    action(this, 'clearWatchHistory');
    makeObservable(this);
  }

  static createKey(parent: ListItem<any>, property: Maybe<string>) {
    return `${parent.key}-${property}`;
  }

  static create(
    devtools: ViewModelDevtools,
    property: Maybe<string>,
    path: string,
    order: number,
    parent: ListItem<any>,
    options?: {
      collectionEntryKind?: CollectionKind;
      collectionEntryIndex?: number;
      getPreview?: () => unknown;
    },
  ) {
    const cache = parent.cache ?? devtools.anyCache;
    const key = `${PropertyListItem.createKey(parent, property)}/list-item`;

    let item: Maybe<PropertyListItem> = cache.get(key);

    if (!item) {
      item = new PropertyListItem(
        devtools,
        property,
        path,
        order,
        parent,
        options?.collectionEntryKind,
        options?.collectionEntryIndex,
        options?.getPreview,
      );
      cache.set(key, item);
    }

    return item;
  }
}

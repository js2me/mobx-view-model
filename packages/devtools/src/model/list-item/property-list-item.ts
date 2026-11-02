import {
  Check,
  Copy,
  Eye,
  EyeSlash,
  Pencil,
  Play,
  ToggleOn,
  Xmark,
} from '@gravity-ui/icons';
import { action, computed, makeObservable } from 'mobx';
import type { MouseEvent } from 'react';
import type { Maybe } from 'yummies/types';
import type { DevtoolsInspector } from '../devtools-inspector';
import { PropertyEditor } from '../editing/property-editor';
import type { SetEntryIdentity } from '../editing/set-entry-identity';
import {
  type CollectionKind,
  getCollectionKind,
  getMapEntryAt,
  getSetValueAt,
} from '../inspection/collection-like';
import {
  detectPropertyValueType,
  getPropertyInstanceClassName,
} from '../inspection/detect-property-value-type';
import { getViewModelBaseKeys } from '../inspection/get-view-model-base-keys';
import { INACCESSIBLE } from '../inspection/safe-access';
import { formatSearchSegmentKey } from '../search/format-search-key';
import { createPropertyChildren } from './create-property-children';
import { ListItem, type ListItemOperation } from './list-item';
import { MetaListItem } from './meta-list-item';
import { PropertyWatch } from './property-watch';
import { PropertyWatchHistoryHeaderListItem } from './property-watch-history-header-item';
import { PropertyWatchHistoryListItem } from './property-watch-history-item';
import { VMListItem } from './vm-list-item';

export class PropertyListItem extends ListItem<any> {
  editor = new PropertyEditor(this);

  readonly watch = new PropertyWatch(this);
  get isWatching() {
    return this.watch.isWatching;
  }
  get watchHistory() {
    return this.watch.history;
  }

  get isExpanded() {
    return this.inspector.search.isPropertyItemExpanded(this);
  }

  get isExpandable() {
    return this.inspector.search.isPropertyItemExpandable(this);
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
        return this.setEntryIdentity
          ? this.setEntryIdentity.value
          : getSetValueAt(parentData, this.collectionEntryIndex);
      }

      return undefined;
    }

    if (this.property == null) {
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

  get collectionEntryIndex(): number | undefined {
    if (!this.setEntryIdentity) return this.entryIndex;
    return this.setEntryIdentity.index;
  }

  get property() {
    if (!this.setEntryIdentity) return this.propertyKey;
    const index = this.collectionEntryIndex;
    return index == null ? undefined : String(index);
  }

  get path(): string {
    if (this.parent instanceof PropertyListItem) {
      return this.collectionEntryKind
        ? `${this.parent.path}[${this.collectionEntryIndex}]`
        : `${this.parent.path}.${this.property}`;
    }
    return this.propertyPath;
  }

  get order() {
    return this.setEntryIdentity
      ? (this.collectionEntryIndex ?? this.itemOrder)
      : this.itemOrder;
  }

  get descriptor() {
    if (this.property == null) {
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
      return '[object Inaccessible]';
    }
    return Object.prototype.toString.call(this.data);
  }

  get instanceClassName(): string {
    return getPropertyInstanceClassName(this.data);
  }
  get isInaccessibleDisplay() {
    return super.isInaccessible;
  }
  get type() {
    if (this.getPreview) return 'primitive';
    if (this.collectionEntryKind)
      return `${this.collectionEntryKind}-entry` as const;
    return detectPropertyValueType(this.data);
  }
  get nestedValueType() {
    return detectPropertyValueType(this.data);
  }
  get children(): PropertyListItem[] {
    return createPropertyChildren(
      this,
      this.path,
      this.inspector.settings.sortPropertiesBy,
      this.nestedValueType,
    );
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
          this.inspector,
          `${this.key}/closing-tag`,
          ']',
          this.depth,
        );
      case 'instance':
      case 'object':
      case 'map-entry':
      case 'set-entry':
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

  get closingItem() {
    return this.propertyClosingTag;
  }

  get depth() {
    const grouped =
      this.parent instanceof VMListItem &&
      this.parent.groupsBaseProperties &&
      this.property != null &&
      getViewModelBaseKeys(this.parent.data).has(this.property);
    return this.parent.depth + (grouped ? 2 : 1);
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

  get isCopiable() {
    if (this.type === 'instance') return false;
    try {
      JSON.stringify(this.data);
      return true;
    } catch {
      return false;
    }
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
        this.editor.isFunctionCall
          ? {
              title: 'Call function',
              icon: Play,
              action: this.editor.callFunction,
            }
          : {
              title: 'Apply',
              icon: Check,
              action: this.editor.applyEdit,
            },
        {
          title: 'Cancel',
          icon: Xmark,
          action: this.editor.cancelEdit,
        },
      );

      return operations;
    }

    if (this.dataType === 'function') {
      operations.push({
        title: 'Call',
        icon: Play,
        action: this.editor.startFunctionCall,
      });
    } else {
      if (this.dataType === 'boolean' && this.editor.isEditable) {
        operations.push({
          title: 'Toggle',
          icon: ToggleOn,
          action: this.editor.toggleBoolean,
        });
      }

      if (this.editor.isEditable) {
        operations.push({
          title: 'Edit',
          icon: Pencil,
          action: this.editor.startEdit,
        });
      }
    }

    if (this.isCopiable) {
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

  handleClick = (event: MouseEvent<HTMLElement>) => {
    if (
      (event.target as HTMLElement).closest(
        '[data-list-item-operations-wrapper]',
      )
    )
      return;
    this.toggleExpand();
  };

  destroy() {
    this.watch.destroy();
  }
  handleWatchClick() {
    this.watch.toggle();
  }
  clearWatchHistory() {
    this.watch.clear();
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
    inspector: DevtoolsInspector,
    private propertyKey: Maybe<string>,
    private propertyPath: string,
    private itemOrder: number,
    private parent: ListItem<any>,
    public collectionEntryKind?: CollectionKind,
    private entryIndex?: number,
    public getPreview?: () => unknown,
    public readonly setEntryIdentity?: SetEntryIdentity,
  ) {
    super(
      inspector,
      PropertyListItem.createKey(parent, propertyKey, setEntryIdentity),
      undefined,
    );

    computed(this, 'order');
    computed(this, 'property');
    computed(this, 'path');
    computed(this, 'collectionEntryIndex');
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
    computed(this, 'isWatching');
    computed(this, 'watchHistory');
    action(this, 'handleWatchClick');
    action(this, 'clearWatchHistory');
    makeObservable(this);
  }

  static createKey(
    parent: ListItem<any>,
    property: Maybe<string>,
    identity?: SetEntryIdentity,
  ) {
    if (identity) return `${parent.key}/set-entry/${identity.id}`;
    return `${parent.key}-${property}`;
  }

  static create(
    inspector: DevtoolsInspector,
    property: Maybe<string>,
    path: string,
    order: number,
    parent: ListItem<any>,
    options?: {
      collectionEntryKind?: CollectionKind;
      collectionEntryIndex?: number;
      getPreview?: () => unknown;
      setEntryIdentity?: SetEntryIdentity;
    },
  ) {
    const cache = parent.cache;
    const key = `${PropertyListItem.createKey(parent, property, options?.setEntryIdentity)}/list-item`;

    const cached = cache.get(key);
    if (
      cached instanceof PropertyListItem &&
      cached.parentListItem.data === parent.data
    )
      return cached;
    if (cached instanceof PropertyListItem) cached.destroy();
    const item = new PropertyListItem(
      inspector,
      property,
      path,
      order,
      parent,
      options?.collectionEntryKind,
      options?.collectionEntryIndex,
      options?.getPreview,
      options?.setEntryIdentity,
    );
    cache.set(key, item);
    item.watch.restore();
    return item;
  }
}

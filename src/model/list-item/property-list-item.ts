import { Check, Copy, Pencil, Play, Xmark } from '@gravity-ui/icons';
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import type { ChangeEventHandler } from 'react';
import type { Maybe } from 'yummies/types';
import { getAllKeys } from '../utils/get-all-keys';
import {
  INACCESSIBLE,
} from '../utils/safe-access';
import type { ViewModelDevtools } from '../view-model-devtools';
import { ListItem, type ListItemOperation } from './list-item';
import { MetaListItem } from './meta-list-item';
import { VMListItem } from './vm-list-item';

export class PropertyListItem extends ListItem<any> {
  editContent = '';

  isEditMode = false;

  get isExpanded() {
    return this.devtools.searchEngine.isPropertyItemExpanded(this);
  }

  get isExpandable() {
    return this.devtools.searchEngine.isPropertyItemExpandable(this);
  }

  get data(): any {
    this.dataWatchAtom.reportObserved();

    if (!this.property) {
      return undefined;
    }

    try {
      return Reflect.get(this.parent.data, this.property);
    } catch {
      return INACCESSIBLE;
    }
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
    if (this.isInaccessible) {
      return '<Inaccessible>';
    }

    if (this.data && this.data.constructor?.name) {
      return this.data.constructor.name;
    }

    const match = /^\[object (.+)\]$/.exec(this.stringifiedDataType);
    if (match?.[1] && match[1] !== 'Object') {
      return match[1];
    }

    return 'Object';
  }

  get isInaccessibleDisplay() {
    return super.isInaccessible;
  }

  get type() {
    const data = this.data;

    if (this.isInaccessible) {
      return 'primitive';
    }

    if (Array.isArray(data)) {
      return 'array';
    }

    if (this.dataType === 'function') {
      return 'function';
    }

    if (this.data && this.dataType === 'object') {
      if (this.instanceClassName !== 'Object') {
        return 'instance';
      }

      return 'object';
    }

    return 'primitive';
  }

  get children(): PropertyListItem[] {
    let listItems: PropertyListItem[] = [];

    if (this.type === 'array') {
      listItems = Object.keys(this.data).map((property, order) =>
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
      return getAllKeys(this.data).map((property, order) => {
        return PropertyListItem.create(
          this.devtools,
          property,
          `${this.path}.${property}`,
          order,
          this,
        );
      });
    }

    if (this.devtools.sortPropertiesBy !== 'none') {
      listItems = listItems.sort((a, b) => {
        const aProperty = String(a.property);
        const bProperty = String(b.property);

        if (this.devtools.sortPropertiesBy === 'asc') {
          return aProperty.localeCompare(bProperty);
        }
        return bProperty.localeCompare(aProperty);
      });
    }

    return listItems;
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
    return {
      property: this.property?.toLowerCase() || '',
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

    if (this.isEditMode) {
      operations.push(
        this.dataType === 'function'
          ? {
              title: 'Call function',
              icon: Play,
              action: () => {
                // biome-ignore lint/security/noGlobalEval: no way...
                const args = eval(`[${this.editContent.trim()}]`);
                this.data.apply(this.parent.data, args);
                this.editContent = '';
                this.isEditMode = false;
              },
            }
          : {
              title: 'Apply',
              icon: Check,
              action: () => {
                this.isEditMode = false;
              },
            },
        {
          title: 'Cancel',
          icon: Xmark,
          action: () => {
            this.isEditMode = false;
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
          this.isEditMode = true;
        },
      });
    } else {
      operations.push({
        title: 'Edit',
        icon: Pencil,
        action: () => {
          this.isEditMode = true;
        },
      });
    }

    if (this.type !== 'instance' && !this.failedStringify) {
      operations.push({
        title: 'Copy',
        icon: Copy,
        action: () => navigator.clipboard.writeText(this.stringifiedData),
      });
    }

    return [...operations, ...super.operations];
  }

  handleChangeEditContent: ChangeEventHandler<HTMLInputElement> = (e) => {
    this.editContent = e.target.value;
  };

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
  ) {
    super(devtools, PropertyListItem.createKey(parent, property), undefined);

    computed(this, 'type');
    computed(this, 'searchData');
    computed(this, 'propertyClosingTag');
    computed(this, 'dataType');
    computed(this, 'stringifiedDataType');
    computed(this, 'instanceClassName');
    computed(this, 'isInaccessibleDisplay');
    computed(this, 'extraContent');
    observable.ref(this, 'failedStringify');
    observable.ref(this, 'editContent');
    observable(this, 'isEditMode');
    action(this, 'handleChangeEditContent');
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
  ) {
    const cache = parent.cache ?? devtools.anyCache;
    const key = `${PropertyListItem.createKey(parent, property)}/list-item`;

    let item: Maybe<PropertyListItem> = cache.get(key);

    if (!item) {
      item = new PropertyListItem(devtools, property, path, order, parent);
      cache.set(key, item);
    }

    return item;
  }
}

import { Check, Copy, Pencil, Play, Xmark } from '@gravity-ui/icons';
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import type { ChangeEventHandler, KeyboardEventHandler } from 'react';
import type { Maybe } from 'yummies/types';
import {
  getCollectionKind,
  getMapEntryAt,
  getSetValueAt,
  type CollectionKind,
} from '../utils/collection-like';
import { formatSearchSegmentKey } from '../utils/format-search-key';
import { getAllKeys } from '../utils/get-all-keys';
import { isInaccessible, INACCESSIBLE } from '../utils/safe-access';
import { notifyMobxEditPropagation } from '../utils/notify-mobx-change';
import {
  invalidateMobxObject,
  invalidateMobxProperty,
  invalidateViewModelsAfterEdit,
} from '../utils/invalidate-view-models-after-edit';
import {
  ensureMobxPropertyAtomLoaded,
  findMobxAdministration,
} from '../utils/mobx-administration';
import { resolveComputedProducerForEdit } from '../utils/resolve-computed-producer';
import {
  setMapEntryValue,
  setSetEntryValue,
} from '../utils/set-collection-entry-value';
import { setPropertyValue } from '../utils/set-property-value';
import type { AnyVM } from '../types';
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
    if (this.isInaccessible) {
      return '<Inaccessible>';
    }

    if (data && data.constructor?.name) {
      return data.constructor.name;
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
      return this.getChildrenForNestedValue(this.data);
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
      const entryItems = this.getCollectionEntryChildren();
      let memberItems = getAllKeys(this.data).map((property, order) => {
        return PropertyListItem.create(
          this.devtools,
          property,
          `${this.path}.${property}`,
          order + entryItems.length,
          this,
        );
      });

      if (this.devtools.sortPropertiesBy !== 'none') {
        memberItems = memberItems.sort((a, b) => {
          const aProperty = String(a.property);
          const bProperty = String(b.property);

          if (this.devtools.sortPropertiesBy === 'asc') {
            return aProperty.localeCompare(bProperty);
          }
          return bProperty.localeCompare(aProperty);
        });
      }

      return [...entryItems, ...memberItems];
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

  get isEditable() {
    if (this.isInaccessible || isInaccessible(this.parent.data)) {
      return false;
    }

    if (
      this.collectionEntryKind === 'map' ||
      this.collectionEntryKind === 'set'
    ) {
      return (
        this.property !== undefined &&
        this.nestedValueType !== 'instance' &&
        this.nestedValueType !== 'function'
      );
    }

    return (
      this.property !== undefined &&
      this.collectionEntryKind == null &&
      this.type !== 'instance' &&
      !this.isInaccessible &&
      !isInaccessible(this.parent.data)
    );
  }

  get isCopiable() {
    return this.type !== 'instance' && !this.failedStringify;
  }

  get editableContent() {
    if (this.isInaccessible) {
      return '';
    }

    if (this.collectionEntryKind != null) {
      return this.formatEditableNestedValue();
    }

    switch (this.type) {
      case 'object':
      case 'array': {
        try {
          return JSON.stringify(this.data, null, 2);
        } catch {
          return this.stringifiedData;
        }
      }
      default: {
        switch (this.dataType) {
          case 'bigint':
            return `${String(this.data)}n`;
          case 'symbol':
            return `Symbol(${Symbol.keyFor(this.data as symbol) || ''})`;
          case 'string':
            return `"${String(this.data)}"`;
        }

        return String(this.data);
      }
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
                this.callFunction();
              },
            }
          : {
              title: 'Apply',
              icon: Check,
              action: () => {
                this.applyEdit();
              },
            },
        {
          title: 'Cancel',
          icon: Xmark,
          action: () => {
            this.cancelEdit();
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
          this.editContent = '';
          this.isEditMode = true;
        },
      });
    } else if (this.isEditable) {
      operations.push({
        title: 'Edit',
        icon: Pencil,
        action: () => {
          this.startEdit();
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

  handleEditKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.confirmEdit();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.cancelEdit();
    }
  };

  confirmEdit() {
    if (this.dataType === 'function') {
      this.callFunction();
      return;
    }

    this.applyEdit();
  }

  callFunction() {
    // biome-ignore lint/security/noGlobalEval: no way...
    const args = eval(`[${this.editContent.trim()}]`);
    this.data.apply(this.parent.data, args);
    this.cancelEdit();
  }

  startEdit() {
    this.editContent = this.editableContent;
    this.isEditMode = true;
  }

  cancelEdit() {
    this.editContent = '';
    this.isEditMode = false;
  }

  applyEdit() {
    if (!this.isEditable || this.property === undefined) {
      return;
    }

    let parsed: unknown;

    try {
      parsed = this.parseEditContent();
    } catch (error) {
      this.devtools.notifications.push({
        title: `Failed to parse value for "${this.getEditTargetLabel()}": ${formatEditError(error)}`,
      });
      return;
    }

    const result = this.applyParsedEdit(parsed);

    if (!result.ok) {
      this.devtools.notifications.push({
        title: `Failed to update "${this.getEditTargetLabel()}": ${result.error}`,
      });
      return;
    }

    this.reportDataChangedUpwards();
    this.notifyHostAppAfterEdit(result.producerTarget);
    this.cancelEdit();
  }

  private getEditTargetLabel() {
    if (this.collectionEntryKind === 'map' && this.mapEntryKey != null) {
      return formatSearchSegmentKey(this.mapEntryKey);
    }

    return String(this.property);
  }

  private applyParsedEdit(parsed: unknown): {
    ok: boolean;
    error?: string;
    producerTarget?: { host: object; key: string };
  } {
    if (this.collectionEntryKind === 'map') {
      const key = this.mapEntryKey;

      if (key === undefined) {
        return { ok: false, error: 'Map key is missing' };
      }

      return setMapEntryValue(this.parent.data, key, parsed);
    }

    if (this.collectionEntryKind === 'set') {
      return setSetEntryValue(this.parent.data, this.data, parsed);
    }

    const producerTarget = resolveComputedProducerForEdit(this, parsed);

    if (producerTarget) {
      const result = setPropertyValue(
        producerTarget.host,
        producerTarget.key,
        producerTarget.value,
      );

      return result.ok
        ? { ok: true, producerTarget }
        : { ok: false, error: result.error };
    }

    if (this.property == null) {
      return { ok: false, error: 'Property key is missing' };
    }

    const result = setPropertyValue(this.parent.data, this.property, parsed);

    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  private formatEditableNestedValue() {
    switch (this.nestedValueType) {
      case 'object':
      case 'array': {
        try {
          return JSON.stringify(this.data, null, 2);
        } catch {
          return this.stringifiedData;
        }
      }
      default: {
        switch (this.dataType) {
          case 'bigint':
            return `${String(this.data)}n`;
          case 'symbol':
            return `Symbol(${Symbol.keyFor(this.data as symbol) || ''})`;
          case 'string':
            return `"${String(this.data)}"`;
        }

        return String(this.data);
      }
    }
  }

  private notifyHostAppAfterEdit(producerTarget?: {
    host: object;
    key: string;
  }) {
    if (this.property === undefined) {
      return;
    }

    const editedHosts: object[] = [];
    const pathFromVm = this.buildMobxPathFromVm(producerTarget);

    if (this.collectionEntryKind != null) {
      registerEditedHost(editedHosts, this.parent.data);
      invalidateMobxObject(this.parent.data);
    } else if (producerTarget) {
      registerEditedHost(editedHosts, producerTarget.host);
      invalidateMobxProperty(producerTarget.host, producerTarget.key);

      const nestedInfo = (producerTarget.host as { info?: object }).info;

      if (nestedInfo && typeof nestedInfo === 'object') {
        registerEditedHost(editedHosts, nestedInfo);
        invalidateMobxProperty(nestedInfo, producerTarget.key);
      }
    } else if (this.property != null) {
      registerEditedHost(editedHosts, this.parent.data);
      invalidateMobxProperty(this.parent.data, this.property);
    }

    let ancestor: ListItem<any> | undefined = this.parentListItem;

    while (ancestor instanceof PropertyListItem) {
      if (ancestor.property != null) {
        invalidateMobxProperty(ancestor.parent.data, ancestor.property);
      }

      if (ancestor.parent.data && typeof ancestor.parent.data === 'object') {
        registerEditedHost(editedHosts, ancestor.parent.data);
      }

      ancestor = ancestor.parentListItem;
    }

    if (ancestor instanceof VMListItem) {
      registerEditedHost(editedHosts, ancestor.data);
      invalidateMobxObject(ancestor.data);

      try {
        this.refreshViewModelPayload(ancestor.data);
      } catch {
        // App ViewModel may use a separate mobx-view-model bundle.
      }
    }

    this.bootstrapViewModelAdministrations();

    const editedHost =
      producerTarget?.host ??
      (this.property != null ? this.parent.data : undefined);

    let relatedVms: object[] = [];

    if (editedHost && typeof editedHost === 'object') {
      relatedVms = invalidateViewModelsAfterEdit({
        editedHost,
        editedPropertyKey: producerTarget?.key,
        pathFromAncestorVm: pathFromVm,
        viewModels: this.devtools.allVms,
      });
    }

    notifyMobxEditPropagation({
      editedHosts,
      relatedViewModels: relatedVms,
    });

    for (const vm of relatedVms) {
      try {
        this.refreshViewModelPayload(vm);
      } catch {
        // App ViewModel may use a separate mobx-view-model bundle.
      }
    }
  }

  private bootstrapViewModelAdministrations() {
    for (const vm of this.devtools.allVms) {
      ensureMobxPropertyAtomLoaded(vm, '_payload');
      ensureMobxPropertyAtomLoaded(vm, 'payload');
      findMobxAdministration(vm);
    }
  }

  private buildMobxPathFromVm(producerTarget?: { key: string }) {
    const segments: string[] = [];
    let current: ListItem<any> | undefined = this;

    while (current instanceof PropertyListItem) {
      if (current.property != null) {
        segments.unshift(current.property);
      }

      current = current.parentListItem;
    }

    if (segments.length === 0) {
      return segments;
    }

    if (producerTarget) {
      return segments.slice(0, -1);
    }

    return segments.slice(0, -1);
  }

  private refreshViewModelPayload(vm: AnyVM) {
    if (!('setPayload' in vm) || typeof vm.setPayload !== 'function') {
      return;
    }

    if (!('payload' in vm)) {
      return;
    }

    const payload = (vm as { payload: unknown }).payload;

    if (payload === null || typeof payload !== 'object') {
      return;
    }

    vm.setPayload(
      Array.isArray(payload) ? [...payload] : { ...payload },
    );
  }

  private parseEditContent(): unknown {
    const content = this.editContent.trim();

    if (
      this.type === 'object' ||
      this.type === 'array' ||
      (this.collectionEntryKind != null &&
        (this.nestedValueType === 'object' ||
          this.nestedValueType === 'array'))
    ) {
      return JSON.parse(content);
    }

    // biome-ignore lint/security/noGlobalEval: devtools edit field, same as function call args
    return eval(`(${content})`);
  }

  private reportDataChangedUpwards() {
    let current: ListItem<any> | undefined = this;

    while (current) {
      current.reportDataChanged();
      current =
        current instanceof PropertyListItem
          ? current.parentListItem
          : undefined;
    }
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
    observable.ref(this, 'editContent');
    observable(this, 'isEditMode');
    action(this, 'handleChangeEditContent');
    action(this, 'handleEditKeyDown');
    action(this, 'startEdit');
    action(this, 'cancelEdit');
    action(this, 'applyEdit');
    action(this, 'confirmEdit');
    action(this, 'callFunction');
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
      );
      cache.set(key, item);
    }

    return item;
  }
}

function registerEditedHost(hosts: object[], host: object) {
  if (!hosts.includes(host)) {
    hosts.push(host);
  }
}

function formatEditError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

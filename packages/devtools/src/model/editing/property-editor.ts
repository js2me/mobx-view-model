import { action, computed, makeObservable, observable } from 'mobx';
import type { ChangeEventHandler, KeyboardEventHandler } from 'react';
import type { Maybe } from 'yummies/types';
import type { DevtoolsInspector } from '../devtools-inspector';
import type { CollectionKind } from '../inspection/collection-like';
import { isInaccessible } from '../inspection/safe-access';
import type { PropertyListItem } from '../list-item/property-list-item';
import { formatSearchSegmentKey } from '../search/format-search-key';
import { PropertyEditPropagation } from './property-edit-propagation';
import { resolveComputedProducerForEdit } from './resolve-computed-producer';
import {
  setMapEntryValue,
  setSetEntryValue,
} from './set-collection-entry-value';
import { setPropertyValue } from './set-property-value';

export interface PropertyEditorHost {
  readonly property: Maybe<string>;
  readonly type: string;
  readonly dataType: string;
  readonly data: any;
  readonly isInaccessible: boolean;
  readonly nestedValueType: string;
  readonly collectionEntryKind?: CollectionKind;
  readonly collectionEntryIndex?: number;
  readonly getPreview?: () => unknown;
  readonly mapEntryKey: unknown;
  readonly stringifiedData: string;
  readonly parentListItem: any;
  readonly inspector: Pick<DevtoolsInspector, 'notifications' | 'allVms'>;
  reportDataChanged(): void;
}

function formatEditError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export class PropertyEditor {
  private readonly propagation: PropertyEditPropagation;
  editContent = '';
  isEditMode = false;

  constructor(private readonly host: PropertyEditorHost) {
    this.propagation = new PropertyEditPropagation(host);
    makeObservable(this, {
      editContent: observable.ref,
      isEditMode: observable,
      isEditable: computed,
      editableContent: computed,
      handleChangeEditContent: action,
      handleEditKeyDown: action,
      startEdit: action.bound,
      startFunctionCall: action.bound,
      cancelEdit: action.bound,
      applyEdit: action.bound,
      toggleBoolean: action.bound,
      confirmEdit: action,
      callFunction: action.bound,
    });
  }

  get isEditable() {
    const host = this.host;
    if (host.isInaccessible || isInaccessible(host.parentListItem.data)) {
      return false;
    }

    if (host.getPreview) {
      return false;
    }

    if (
      host.collectionEntryKind === 'map' ||
      host.collectionEntryKind === 'set'
    ) {
      return (
        host.property !== undefined &&
        host.nestedValueType !== 'instance' &&
        host.nestedValueType !== 'function'
      );
    }

    return (
      host.property !== undefined &&
      host.collectionEntryKind == null &&
      host.type !== 'instance' &&
      !host.isInaccessible &&
      !isInaccessible(host.parentListItem.data)
    );
  }

  get editableContent() {
    const host = this.host;
    if (host.isInaccessible) {
      return '';
    }

    switch (host.collectionEntryKind ? host.nestedValueType : host.type) {
      case 'object':
      case 'array': {
        try {
          return JSON.stringify(host.data, null, 2);
        } catch {
          return host.stringifiedData;
        }
      }
      default: {
        switch (host.dataType) {
          case 'bigint':
            return `${String(host.data)}n`;
          case 'symbol':
            return `Symbol(${Symbol.keyFor(host.data as symbol) || ''})`;
          case 'string':
            return `"${String(host.data)}"`;
        }

        return String(host.data);
      }
    }
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
    if (this.host.dataType === 'function') {
      this.callFunction();
      return;
    }

    this.applyEdit();
  }

  startFunctionCall = () => {
    this.editContent = '';
    this.isEditMode = true;
  };

  callFunction() {
    // biome-ignore lint/security/noGlobalEval: no way...
    const args = eval(`[${this.editContent.trim()}]`);
    this.host.data.apply(this.host.parentListItem.data, args);
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
    if (!this.isEditable || this.host.property === undefined) {
      return;
    }

    let parsed: unknown;

    try {
      parsed = this.parseEditContent();
    } catch (error) {
      this.host.inspector.notifications.push({
        title: `Failed to parse value for "${this.getEditTargetLabel()}": ${formatEditError(error)}`,
      });
      return;
    }

    if (!this.commitParsedEdit(parsed)) {
      return;
    }

    this.cancelEdit();
  }

  toggleBoolean() {
    if (
      !this.isEditable ||
      this.host.dataType !== 'boolean' ||
      this.host.property === undefined
    ) {
      return;
    }

    const nextValue = !this.host.data;
    this.commitParsedEdit(nextValue);
  }

  private commitParsedEdit(parsed: unknown): boolean {
    const result = this.applyParsedEdit(parsed);

    if (!result.ok) {
      this.host.inspector.notifications.push({
        title: `Failed to update "${this.getEditTargetLabel()}": ${result.error}`,
      });
      return false;
    }

    this.propagation.notify(result.producerTarget);
    this.propagation.reportDataChanged();
    return true;
  }

  private getEditTargetLabel() {
    const host = this.host;
    if (host.collectionEntryKind === 'map' && host.mapEntryKey != null) {
      return formatSearchSegmentKey(host.mapEntryKey);
    }

    return String(host.property);
  }

  private applyParsedEdit(parsed: unknown): {
    ok: boolean;
    error?: string;
    producerTarget?: { host: object; key: string };
  } {
    const host = this.host;

    if (host.collectionEntryKind === 'map') {
      const key = host.mapEntryKey;

      if (key === undefined) {
        return { ok: false, error: 'Map key is missing' };
      }

      return setMapEntryValue(host.parentListItem.data, key, parsed);
    }

    if (host.collectionEntryKind === 'set') {
      return setSetEntryValue(host.parentListItem.data, host.data, parsed);
    }

    const producerTarget = resolveComputedProducerForEdit(
      host as PropertyListItem,
      parsed,
    );

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

    if (host.property == null) {
      return { ok: false, error: 'Property key is missing' };
    }

    const result = setPropertyValue(
      host.parentListItem.data,
      host.property,
      parsed,
    );

    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  private parseEditContent(): unknown {
    const host = this.host;
    const content = this.editContent.trim();

    if (
      host.type === 'object' ||
      host.type === 'array' ||
      (host.collectionEntryKind != null &&
        (host.nestedValueType === 'object' || host.nestedValueType === 'array'))
    ) {
      return JSON.parse(content);
    }

    // biome-ignore lint/security/noGlobalEval: inspector edit field, same as function call args
    return eval(`(${content})`);
  }
}

import { runInAction } from 'mobx';
import {
  isMobxComputedProperty,
  overrideComputedValue,
  propertyWriteNotifies,
} from './mobx-edit-adapter';

export type SetPropertyValueResult =
  | { ok: true; notifies: boolean }
  | { ok: false; error: string };

export function setPropertyValue(
  object: object,
  key: PropertyKey,
  value: unknown,
): SetPropertyValueResult {
  try {
    if (typeof key === 'string' && isMobxComputedProperty(object, key)) {
      overrideComputedValue(object, key, value);
      return { ok: true, notifies: true };
    }

    const notifies = propertyWriteNotifies(object, key);
    runInAction(() => {
      if (!Reflect.set(object, key, value)) {
        throw new Error(`Cannot update property "${String(key)}"`);
      }
    });
    return { ok: true, notifies };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

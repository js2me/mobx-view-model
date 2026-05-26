import { runInAction } from 'mobx';
import {
  forceMobxAtomInvalidation,
  rememberSwappedComputedAtom,
} from './force-mobx-invalidation';
import {
  ensureMobxPropertyAtomLoaded,
  findMobxAdministration,
  isMobxComputedProperty,
  registerMobxAdministration,
  type MobxAtom,
  type MobxObjectAdministration,
} from './mobx-administration';

export { findMobxAdministration, isMobxComputedProperty };

export type SetPropertyValueResult =
  | { ok: true }
  | { ok: false; error: string };

export function getPropertyDescriptor(
  object: object,
  key: PropertyKey,
): PropertyDescriptor | undefined {
  let proto: object | null = object;

  while (proto) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, key);
    if (descriptor) {
      return descriptor;
    }

    proto = Object.getPrototypeOf(proto);
  }

  return undefined;
}

function isComputedAtom(atom: MobxAtom | undefined): atom is MobxAtom {
  return !!atom && typeof atom.derivation === 'function';
}

function isStringKey(key: PropertyKey): key is string {
  return typeof key === 'string';
}

function hasOwnProperty(object: object, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isReadOnlyAccessor(descriptor: PropertyDescriptor | undefined) {
  return !!descriptor?.get && !descriptor.set && descriptor.writable !== true;
}

function isMobxAccessor(object: object, key: string, descriptor: PropertyDescriptor | undefined) {
  if (!descriptor?.get || typeof descriptor.set !== 'function') {
    return false;
  }

  const adm = findMobxAdministration(object);

  if (!adm) {
    return false;
  }

  ensureMobxPropertyAtomLoaded(object, key, adm);
  return adm.values_.has(key);
}

function shouldOverrideProperty(object: object, key: PropertyKey) {
  if (!isStringKey(key)) {
    return isReadOnlyAccessor(getPropertyDescriptor(object, key));
  }

  const descriptor = getPropertyDescriptor(object, key);

  if (isReadOnlyAccessor(descriptor)) {
    return true;
  }

  if (!findMobxAdministration(object)) {
    return false;
  }

  if (isMobxComputedKey(object, key)) {
    return true;
  }

  if (isMobxAccessor(object, key, descriptor)) {
    return true;
  }

  return false;
}

function isMobxComputedKey(object: object, key: string) {
  const adm = findMobxAdministration(object);
  if (!adm) {
    return false;
  }

  ensureMobxPropertyAtomLoaded(object, key, adm);
  return isComputedAtom(adm.values_.get(key));
}

function isMobxComputedAssignmentError(error: unknown) {
  return error instanceof Error && /computed value/i.test(error.message);
}

function isCannotRedefinePropertyError(error: unknown) {
  return error instanceof Error && /cannot redefine property/i.test(error.message);
}

function getObservableValueConstructor(adm: MobxObjectAdministration) {
  for (const atom of adm.values_.values()) {
    if (atom && typeof atom.derivation !== 'function' && atom.constructor) {
      return atom.constructor;
    }
  }

  return undefined;
}

function createMatchingObservableValue(
  adm: MobxObjectAdministration,
  key: string,
  value: unknown,
) {
  const ObservableValueCtor = getObservableValueConstructor(adm);
  if (!ObservableValueCtor) {
    return undefined;
  }

  return new ObservableValueCtor(
    value,
    (nextValue: unknown) => nextValue,
    `${adm.name_}.${key}`,
  );
}

function swapComputedAtomInPlace(
  adm: MobxObjectAdministration,
  object: object,
  key: string,
  value: unknown,
) {
  const previousAtom = adm.values_.get(key);
  if (!isComputedAtom(previousAtom)) {
    return false;
  }

  const swappedAtom = previousAtom;

  const replacement = createMatchingObservableValue(adm, key, value);
  if (!replacement) {
    return false;
  }

  adm.values_.set(key, replacement);

  try {
    adm.setObservablePropValue_(key, value);
  } catch {
    if (typeof replacement.set === 'function') {
      replacement.set(value);
    }
  }

  rememberSwappedComputedAtom(object, key, swappedAtom);
  forceMobxAtomInvalidation(swappedAtom);
  forceMobxAtomInvalidation(replacement);
  notifyMobxObjectKeysAtom(adm);

  return true;
}

function notifyMobxObjectKeysAtom(adm: MobxObjectAdministration) {
  const admWithKeys = adm as MobxObjectAdministration & {
    keysAtom_?: { reportChanged?: () => void };
  };

  admWithKeys.keysAtom_?.reportChanged?.();
}

function replaceViaMobxAdministration(
  object: object,
  key: string,
  value: unknown,
): boolean {
  const adm = ensureMobxPropertyAtomLoaded(object, key);
  if (!adm) {
    return false;
  }

  registerMobxAdministration(object, adm);

  if (adm.values_.has(key)) {
    if (isComputedAtom(adm.values_.get(key))) {
      return swapComputedAtomInPlace(adm, object, key, value);
    }

    try {
      adm.setObservablePropValue_(key, value);
      notifyMobxObjectKeysAtom(adm);
      return true;
    } catch (error) {
      if (isMobxComputedAssignmentError(error)) {
        return swapComputedAtomInPlace(adm, object, key, value);
      }

      throw error;
    }
  }

  if (!hasOwnProperty(object, key)) {
    (object as Record<string, unknown>)[key] = value;
    return true;
  }

  if (swapComputedAtomInPlace(adm, object, key, value)) {
    return true;
  }

  const deleted = adm.delete_(key);
  if (deleted) {
    const defined = adm.defineObservableProperty_(key, value, (nextValue) => nextValue);
    return defined !== false && defined !== null;
  }

  return false;
}

function shadowPropertyValue(object: object, key: string, value: unknown) {
  if (!hasOwnProperty(object, key)) {
    (object as Record<string, unknown>)[key] = value;
    return true;
  }

  return false;
}

export function setPropertyValue(
  object: object,
  key: PropertyKey,
  value: unknown,
): SetPropertyValueResult {
  if (typeof key !== 'string' && typeof key !== 'symbol') {
    return { ok: false, error: 'Invalid property key' };
  }

  if (!isStringKey(key)) {
    return setPlainProperty(object, key, value);
  }

  if (shouldOverrideProperty(object, key)) {
    return overrideProperty(object, key, value);
  }

  const descriptor = getPropertyDescriptor(object, key);

  if (descriptor?.set) {
    try {
      runInAction(() => {
        descriptor.set!.call(object, value);
      });
      return { ok: true };
    } catch (error) {
      if (isMobxComputedAssignmentError(error)) {
        return overrideProperty(object, key, value);
      }

      return { ok: false, error: formatSetError(error) };
    }
  }

  if (findMobxAdministration(object)) {
    return setMobxProperty(object, key, value);
  }

  if (shadowPropertyValue(object, key, value)) {
    return { ok: true };
  }

  return setPlainProperty(object, key, value);
}

function setMobxProperty(
  object: object,
  key: string,
  value: unknown,
): SetPropertyValueResult {
  try {
    let replaced = false;

    runInAction(() => {
      replaced = replaceViaMobxAdministration(object, key, value);
    });

    if (replaced) {
      return { ok: true };
    }

    if (shadowPropertyValue(object, key, value)) {
      return { ok: true };
    }

    return {
      ok: false,
      error: formatMobxUpdateFailure(key),
    };
  } catch (error) {
    if (isMobxComputedAssignmentError(error) || isCannotRedefinePropertyError(error)) {
      return overrideProperty(object, key, value);
    }

    return { ok: false, error: formatSetError(error) };
  }
}

function overrideProperty(
  object: object,
  key: string,
  value: unknown,
): SetPropertyValueResult {
  try {
    runInAction(() => {
      overrideMobxProperty(object, key, value);
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: formatSetError(error) };
  }
}

function overrideMobxProperty(object: object, key: string, value: unknown) {
  if (replaceViaMobxAdministration(object, key, value)) {
    return;
  }

  if (shadowPropertyValue(object, key, value)) {
    return;
  }

  const descriptor = getPropertyDescriptor(object, key);

  if (descriptor?.set) {
    descriptor.set.call(object, value);
    return;
  }

  if (descriptor && !descriptor.writable && !descriptor.configurable) {
    throw new Error(formatMobxUpdateFailure(key));
  }

  (object as Record<string, unknown>)[key] = value;
}

function setPlainProperty(
  object: object,
  key: PropertyKey,
  value: unknown,
): SetPropertyValueResult {
  try {
    runInAction(() => {
      (object as Record<PropertyKey, unknown>)[key] = value;
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: formatSetError(error) };
  }
}

function formatMobxUpdateFailure(key: string) {
  return `Cannot update "${key}": MobX administration was not found or the property cannot be overridden. If devtools and the app use different mobx bundles, ensure a single mobx instance is shared.`;
}

function formatSetError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

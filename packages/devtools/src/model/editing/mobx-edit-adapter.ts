import { getAtom, isObservableArray, observable, runInAction } from 'mobx';
import { isMobxObservableMap } from '../inspection/collection-like';

// Read-only shape discovery shared with separately bundled MobX instances.
// This module is the compatibility boundary for MobX internals.
type MobxAtom = {
  reportChanged?: () => void;
  derivation?: unknown;
};

type MobxObjectAdministration = {
  target_?: object;
  proxy_?: object;
  values_: ReadonlyMap<string, MobxAtom>;
  setObservablePropValue_(key: string, value: unknown): boolean | null;
};

const administrationByObject = new WeakMap<object, MobxObjectAdministration>();
const hostMobxSymbols = new Set<symbol>();

function isMobxAdministration(
  value: unknown,
): value is MobxObjectAdministration {
  return (
    !!value &&
    typeof value === 'object' &&
    'values_' in value &&
    (value as MobxObjectAdministration).values_ instanceof Map &&
    typeof (value as MobxObjectAdministration).setObservablePropValue_ ===
      'function'
  );
}

function rememberHostMobxSymbol(target: object, adm: MobxObjectAdministration) {
  for (const symbol of Object.getOwnPropertySymbols(target)) {
    if (target[symbol as keyof object] === adm) {
      hostMobxSymbols.add(symbol);
      return;
    }
  }
}

function registerMobxAdministration(
  object: object,
  adm: MobxObjectAdministration,
) {
  administrationByObject.set(object, adm);

  if (adm.target_) {
    administrationByObject.set(adm.target_, adm);
    rememberHostMobxSymbol(adm.target_, adm);
  }

  if (adm.proxy_) {
    administrationByObject.set(adm.proxy_, adm);
  }
}

function findMobxAdministration(
  object: object,
): MobxObjectAdministration | undefined {
  const cached = administrationByObject.get(object);

  if (cached) {
    return cached;
  }

  for (const symbol of Object.getOwnPropertySymbols(object)) {
    const candidate = (object as Record<symbol, unknown>)[symbol];

    if (isMobxAdministration(candidate)) {
      registerMobxAdministration(object, candidate);
      return candidate;
    }
  }

  for (const symbol of hostMobxSymbols) {
    const candidate = (object as Record<symbol, unknown>)[symbol];

    if (isMobxAdministration(candidate)) {
      registerMobxAdministration(object, candidate);
      return candidate;
    }
  }

  return undefined;
}

/** Metadata checks must not execute user accessors. The inspector reads a
 * property before editing it, which also initializes lazy MobX annotations. */
function getMobxPropertyAtom(
  object: object,
  key: string,
): MobxAtom | undefined {
  return findMobxAdministration(object)?.values_.get(key);
}

export function getMobxPropertyKeys(object: object): string[] {
  return [...(findMobxAdministration(object)?.values_.keys() ?? [])];
}

export function isMobxComputedProperty(object: object, key: string) {
  const atom = getMobxPropertyAtom(object, key);
  return !!atom && typeof atom.derivation === 'function';
}

export function hasMobxObject(value: object) {
  return findMobxAdministration(value) != null;
}

// MobX has no public API for overriding a read-only computed. Keep that
// version-sensitive operation here; ordinary writes never use it.
type ComputedAtom = MobxAtom & {
  derivation: () => unknown;
  dependenciesState_: number;
  onBecomeStale_: () => void;
  get: () => unknown;
  equals_: (left: unknown, right: unknown) => boolean;
};

const overrides = new WeakMap<
  object,
  ReturnType<typeof observable.box<unknown>>
>();
const STALE = 2; // MobX 6 IDerivationState.STALE

export function overrideComputedValue(
  host: object,
  key: string,
  value: unknown,
) {
  const atom = getMobxPropertyAtom(host, key) as ComputedAtom | undefined;
  if (
    !atom ||
    typeof atom.derivation !== 'function' ||
    typeof atom.onBecomeStale_ !== 'function' ||
    typeof atom.dependenciesState_ !== 'number'
  ) {
    throw new Error(
      `Cannot override computed property "${key}": unsupported MobX administration`,
    );
  }

  runInAction(() => {
    let box = overrides.get(atom);
    if (box) {
      box.set(value);
      // Isolated host runtimes cannot subscribe to this bundle's box.
      invalidateComputed(atom);
      return;
    }
    box = observable.box(value, { deep: false });
    overrides.set(atom, box);
    atom.derivation = () => box.get();
    invalidateComputed(atom);
  });
}

function invalidateComputed(atom: ComputedAtom) {
  atom.dependenciesState_ = STALE;
  // Let MobX schedule downstream work, respect equality comparers and update
  // dependencies during the next normal read. Never execute reactions here.
  atom.onBecomeStale_();
}

/** Explicit in-place refresh must pass the identity comparison on the owner.
 * Recompute only this computed through MobX's normal get(), never run reactions. */
function refreshComputedOwner(atom: ComputedAtom) {
  const equals = atom.equals_;
  atom.equals_ = () => false;
  try {
    invalidateComputed(atom);
    try {
      atom.get();
    } catch {
      /* The computed retains its normal cached getter error. */
    }
  } finally {
    atom.equals_ = equals;
  }
}

const foreignArrayAtoms = new WeakMap<object, { reportChanged(): void }>();

function foreignArrayAtom(value: object) {
  if (!Array.isArray(value)) return undefined;
  const cached = foreignArrayAtoms.get(value);
  if (cached) return cached;
  // Each MobX bundle owns a different administration symbol. The public
  // isObservableArray/getAtom helpers only recognize their own symbol.
  for (const symbol of Object.getOwnPropertySymbols(value)) {
    const admin = Reflect.get(value, symbol) as
      | {
          isMobXObservableArrayAdministration?: boolean;
          atom_?: { reportChanged?: () => void };
        }
      | undefined;
    if (
      admin?.isMobXObservableArrayAdministration &&
      typeof admin.atom_?.reportChanged === 'function'
    ) {
      const atom = admin.atom_ as { reportChanged(): void };
      foreignArrayAtoms.set(value, atom);
      return atom;
    }
  }
  return undefined;
}

export function isObservableArrayOwner(value: object) {
  return isObservableArray(value) || foreignArrayAtom(value) != null;
}

export function propertyWriteNotifies(host: object, key: PropertyKey) {
  return (
    isObservableArrayOwner(host) ||
    (typeof key === 'string' && getMobxPropertyAtom(host, key) != null)
  );
}

/** Notify the nearest observable owner after an in-place edit of plain data. */
export function notifyPropertyOwner(host: object, key?: string): boolean {
  const atom = key == null ? undefined : getMobxPropertyAtom(host, key);
  if (atom) {
    if (typeof atom.derivation === 'function')
      refreshComputedOwner(atom as ComputedAtom);
    else atom.reportChanged?.();
    return true;
  }
  const arrayAtom = foreignArrayAtom(host);
  if (arrayAtom) {
    arrayAtom.reportChanged();
    return true;
  }
  try {
    // Public getAtom supports arrays and sets; map values require their key.
    const collectionAtom = getAtom(host);
    if (
      'reportChanged' in collectionAtom &&
      typeof collectionAtom.reportChanged === 'function'
    ) {
      collectionAtom.reportChanged();
      return true;
    }
  } catch {
    // A plain object has no atom. Its ancestor may be an observable.ref field.
  }
  return false;
}

/** A shallow ObservableMap value can contain plain, directly edited data. */
export function notifyMapEntryOwner(map: object, key: unknown): boolean {
  if (isMobxObservableMap(map)) {
    // Public getAtom(map, undefined) selects the keys atom, not the undefined
    // entry. Read the existing value atom; this also supports foreign symbols.
    const data = Object.getOwnPropertyDescriptor(map, 'data_')?.value;
    const valueAtom =
      data instanceof Map ? (data.get(key) as MobxAtom | undefined) : undefined;
    if (typeof valueAtom?.reportChanged === 'function') {
      valueAtom.reportChanged();
      return true;
    }
  }
  try {
    const atom = getAtom(map, key as string);
    if ('reportChanged' in atom && typeof atom.reportChanged === 'function') {
      atom.reportChanged();
      return true;
    }
  } catch {
    // A native Map may instead be held by an observable.ref ancestor.
  }
  return false;
}

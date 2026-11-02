import { ViewModelBase } from 'mobx-view-model';
import { getAllKeys } from './get-all-keys';

class ViewModelBaseKeysProbe extends ViewModelBase {
  constructor() {
    super({
      id: '__mobx-view-model-devtools-probe__',
      payload: {},
      viewModels: { get: () => null, has: () => false } as never,
    });
  }
}

const legacyInstanceKeys = [
  'vmParams',
  'abortController',
  'unmountSignal',
  'id',
  'vmConfig',
  'isPayloadEqual',
  'props',
  '_isMounted',
  '_isUnmounting',
  '_payload',
];
let currentKeys: ReadonlySet<string> | undefined;
let currentInstanceKeys: string[];
const baseMarkers = ['mount', 'unmount', 'payload', 'parentViewModel'];
const keysByBase = new WeakMap<object, ReadonlySet<string>>();
const keysByPrototype = new WeakMap<object, ReadonlySet<string>>();

/** Use the inspected base prototype, never a union of names from all versions.
 * Public lifecycle descriptors survive bundling; no user getter is evaluated. */
export function getViewModelBaseKeys(vm?: object): ReadonlySet<string> {
  if (!currentKeys) {
    const probe = new ViewModelBaseKeysProbe();
    currentKeys = new Set(getAllKeys(probe));
    currentInstanceKeys = Object.getOwnPropertyNames(probe);
  }
  if (!vm) return currentKeys;
  const prototype = Object.getPrototypeOf(vm);
  if (!prototype) return currentKeys;
  const cached = keysByPrototype.get(prototype);
  if (cached) return cached;

  let proto = prototype;
  let base: object | undefined;
  while (proto && proto !== Object.prototype) {
    if (baseMarkers.every((key) => Object.hasOwn(proto, key))) base = proto;
    proto = Object.getPrototypeOf(proto);
  }
  if (!base) {
    keysByPrototype.set(prototype, currentKeys);
    return currentKeys;
  }
  let keys = keysByBase.get(base);
  if (!keys) {
    const fields = Object.hasOwn(base, 'isUnmounting')
      ? legacyInstanceKeys
      : currentInstanceKeys;
    keys = new Set([
      ...fields,
      ...Object.getOwnPropertyNames(base).filter(
        (key) => key !== 'constructor',
      ),
    ]);
    keysByBase.set(base, keys);
  }
  keysByPrototype.set(prototype, keys);
  return keys;
}

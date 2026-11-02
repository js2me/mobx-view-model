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
const keysByBase = new WeakMap<object, ReadonlySet<string>>();

/** Use the inspected base prototype, never a union of names from all versions.
 * Public lifecycle descriptors survive bundling; no user getter is evaluated. */
export function getViewModelBaseKeys(vm?: object): ReadonlySet<string> {
  if (!currentKeys) {
    const probe = new ViewModelBaseKeysProbe();
    currentKeys = new Set(getAllKeys(probe));
    currentInstanceKeys = Object.getOwnPropertyNames(probe);
  }
  if (!vm) return currentKeys;
  let proto = Object.getPrototypeOf(vm);
  let base: object | undefined;
  while (proto && proto !== Object.prototype) {
    if (
      ['mount', 'unmount', 'payload', 'parentViewModel'].every((key) =>
        Object.hasOwn(proto, key),
      )
    )
      base = proto;
    proto = Object.getPrototypeOf(proto);
  }
  if (!base) return currentKeys;
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
  return keys;
}

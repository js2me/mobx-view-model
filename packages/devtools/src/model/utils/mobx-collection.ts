export type MapLike = {
  entries(): IterableIterator<[unknown, unknown]>;
};

export type SetLike = {
  values(): IterableIterator<unknown>;
};

type MobxCollectionMarker = {
  isMobXObservableMap?: boolean;
  isMobXObservableSet?: boolean;
};

export function isMobxObservableMap(value: unknown): value is MapLike {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as MobxCollectionMarker).isMobXObservableMap === true &&
    typeof (value as MapLike).entries === 'function'
  );
}

export function isMobxObservableSet(value: unknown): value is SetLike {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as MobxCollectionMarker).isMobXObservableSet === true &&
    typeof (value as SetLike).values === 'function'
  );
}

export function isNativeMap(value: unknown): value is MapLike {
  return hasPrototypeInChain(value, globalThis.Map.prototype);
}

export function isNativeSet(value: unknown): value is SetLike {
  return hasPrototypeInChain(value, globalThis.Set.prototype);
}

function hasPrototypeInChain(value: unknown, prototype: object): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  let current: object | null = value;

  while (current) {
    if (Object.getPrototypeOf(current) === prototype) {
      return true;
    }

    current = Object.getPrototypeOf(current);
  }

  return false;
}

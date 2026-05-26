export type CollectionKind = 'map' | 'set';

export function isMapLike(value: unknown): value is Map<unknown, unknown> {
  return hasPrototypeInChain(value, globalThis.Map.prototype);
}

export function isSetLike(value: unknown): value is Set<unknown> {
  return hasPrototypeInChain(value, globalThis.Set.prototype);
}

export function getCollectionKind(value: unknown): CollectionKind | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if (isMapLike(value)) {
    return 'map';
  }

  if (isSetLike(value)) {
    return 'set';
  }

  return null;
}

export function getMapEntryAt(
  map: Map<unknown, unknown>,
  index: number,
): [unknown, unknown] | undefined {
  let currentIndex = 0;

  for (const entry of map.entries()) {
    if (currentIndex === index) {
      return entry;
    }

    currentIndex++;
  }

  return undefined;
}

export function getSetValueAt(set: Set<unknown>, index: number): unknown {
  let currentIndex = 0;

  for (const value of set.values()) {
    if (currentIndex === index) {
      return value;
    }

    currentIndex++;
  }

  return undefined;
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

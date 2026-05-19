const ignoredKeys = new Set(['constructor']);

const ignoredPrototypes = new Set([
  globalThis.Object.prototype,
  globalThis.Function.prototype,
  globalThis.Array.prototype,
  globalThis.String.prototype,
  globalThis.Number.prototype,
  globalThis.Boolean.prototype,
  globalThis.Symbol.prototype,
  globalThis.Date.prototype,
  globalThis.RegExp.prototype,
  globalThis.Error.prototype,
  globalThis.Map.prototype,
  globalThis.Set.prototype,
  globalThis.WeakMap.prototype,
  globalThis.WeakSet.prototype,
  globalThis.ArrayBuffer.prototype,
  globalThis.DataView.prototype,
  globalThis.Float32Array.prototype,
  globalThis.Float64Array.prototype,
  globalThis.Int8Array.prototype,
  globalThis.Int16Array.prototype,
  globalThis.Int32Array.prototype,
  globalThis.Uint8Array.prototype,
  globalThis.Uint8ClampedArray.prototype,
  globalThis.Uint16Array.prototype,
  globalThis.Uint32Array.prototype,
  globalThis.BigInt64Array.prototype,
  globalThis.BigUint64Array.prototype,
  globalThis.Promise.prototype,
  globalThis.Iterator.prototype,
]);

export function getAllKeys(instance: any): string[] {
  try {
    return collectKeys(instance);
  } catch {
    return [];
  }
}

function collectKeys(instance: any): string[] {
  const keysSet = new Set<string>(Object.keys(instance));
  let currentPrototype = Object.getPrototypeOf(instance);

  while (currentPrototype) {
    if (currentPrototype === globalThis.Object.prototype) {
      break;
    }

    try {
      const descriptors = Object.getOwnPropertyDescriptors(currentPrototype);
      for (const key in descriptors) {
        if (!ignoredKeys.has(key)) {
          keysSet.add(key);
        }
      }
    } catch {
      break;
    }

    let nextPrototype: object | null;
    try {
      nextPrototype = Object.getPrototypeOf(currentPrototype);
    } catch {
      break;
    }

    if (ignoredPrototypes.has(nextPrototype)) {
      break;
    }

    currentPrototype = nextPrototype;
  }
  // Spread instead of Array.from: some sites (e.g. MooTools) patch Array.from so
  // Array.from(set) returns [set] instead of set values.
  return [...keysSet];
}


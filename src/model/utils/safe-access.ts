/** Value returned when a property read is blocked (e.g. cross-origin Window). */
export const INACCESSIBLE = Symbol('mobx-view-model-devtools/inaccessible');

export const INACCESSIBLE_DISPLAY_LABEL = '< Inaccessible >';

export function isInaccessible(value: unknown): value is typeof INACCESSIBLE {
  return value === INACCESSIBLE;
}

export function runSafely<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function safeGet(obj: unknown, key: PropertyKey): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  try {
    return Reflect.get(obj as object, key);
  } catch {
    return INACCESSIBLE;
  }
}

export function safeTypeof(value: unknown): string {
  if (isInaccessible(value)) {
    return 'object';
  }

  try {
    return typeof value;
  } catch {
    return 'object';
  }
}

export function safeObjectTag(value: unknown): string {
  if (isInaccessible(value)) {
    return '[object Inaccessible]';
  }

  try {
    return Object.prototype.toString.call(value);
  } catch {
    return '[object Inaccessible]';
  }
}

export function safeConstructorName(value: unknown): string {
  const name = runSafely(() => {
    return (value as { constructor?: { name?: string } })?.constructor?.name;
  }, null);

  if (name) {
    return name;
  }

  const tag = safeObjectTag(value);
  const match = /^\[object (.+)\]$/.exec(tag);
  if (match?.[1] && match[1] !== 'Object') {
    return match[1];
  }

  return 'Object';
}

/**
 * Cross-origin Window/DOM: `Object.prototype.toString` works, but
 * `constructor` and `String(value)` throw SecurityError.
 */
export function isRestrictedObject(value: unknown): boolean {
  if (isInaccessible(value)) {
    return true;
  }

  if (!safeIsObjectLike(value)) {
    return false;
  }

  const constructorName = runSafely(() => {
    return (value as { constructor?: { name?: string } })?.constructor?.name;
  }, null);

  if (constructorName) {
    return false;
  }

  const canStringify = runSafely(() => {
    String(value);
    return true;
  }, false);

  return !canStringify;
}

export function safeIsFunction(value: unknown): boolean {
  return safeTypeof(value) === 'function';
}

export function safeIsObjectLike(value: unknown): boolean {
  if (value === null || isInaccessible(value)) {
    return false;
  }

  const type = safeTypeof(value);
  return type === 'object' || type === 'function';
}

export function safeObjectKeys(value: unknown): string[] {
  if (isInaccessible(value)) {
    return [];
  }

  return runSafely(() => Object.keys(value as object), []);
}

export function safeHasOwn(value: unknown, key: PropertyKey): boolean {
  if (isInaccessible(value)) {
    return false;
  }

  return runSafely(() => Object.hasOwn(value as object, key), false);
}

export function safeString(value: unknown): string {
  if (isInaccessible(value)) {
    return '[Inaccessible]';
  }

  return runSafely(() => String(value), '[Inaccessible]');
}

export function safeFunctionLength(fn: unknown): number {
  return runSafely(() => (fn as Function).length, 0);
}

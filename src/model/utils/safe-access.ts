/** Value returned when a property read is blocked (e.g. cross-origin Window). */
export const INACCESSIBLE = Symbol('mobx-view-model-devtools/inaccessible');

export const INACCESSIBLE_DISPLAY_LABEL = '< Inaccessible >';

export function isInaccessible(value: unknown): value is typeof INACCESSIBLE {
  return runSafely(() => {
    Object.prototype.toString.call(value);
    if (typeof value === 'object' && value) {
      ('key' in value);
    }
  }, INACCESSIBLE) === INACCESSIBLE;
}

function runSafely<T>(fn: () => any, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

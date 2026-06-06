/** Value returned when a property read is blocked (e.g. cross-origin Window). */
export const INACCESSIBLE = Symbol('mobx-view-model-devtools/inaccessible');

export const INACCESSIBLE_DISPLAY_LABEL = '< Inaccessible >';

export function isInaccessible(value: unknown): value is typeof INACCESSIBLE {
  if (value === INACCESSIBLE) {
    return true;
  }

  return runSafely(() => {
    Object.prototype.toString.call(value);
    if (typeof value === 'object' && value) {
      ('key' in value);
      // Cross-origin Window/Document throw SecurityError on constructor access.
      void (value as object).constructor;
    }
  }, INACCESSIBLE) === INACCESSIBLE;
}

export function getConstructorName(value: unknown): string | undefined {
  return runSafely(() => {
    if (value == null || typeof value !== 'object') {
      return undefined;
    }

    return (value as object).constructor?.name || undefined;
  }, undefined);
}

function runSafely<T>(fn: () => any, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

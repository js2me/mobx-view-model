import { toJS } from 'mobx';
import { isInaccessible } from './safe-access';

export const capturePropertyWatchValue = (value: unknown): unknown => {
  if (isInaccessible(value)) {
    return value;
  }

  try {
    return toJS(value);
  } catch {
    // Avoid leaking the raw observable — return a safe fallback
    // since we can't produce a proper deep snapshot
    return `[Capture failed: ${typeof value}]`;
  }
};

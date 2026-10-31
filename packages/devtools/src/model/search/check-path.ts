import type { AnyObject } from 'yummies/types';

export const checkPath = (obj: AnyObject, path: string) => {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (part in current) {
      current = current[part];
    } else {
      return false;
    }
  }

  return true;
};

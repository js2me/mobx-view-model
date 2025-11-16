import { useMemo, useRef } from 'react';
import type { AnyObject } from 'yummies/types';

type UseValueHook = <TValue extends AnyObject>(
  getValue: () => TValue,
) => TValue;

let useValueImpl = null as unknown as UseValueHook;

if (process.env.NODE_ENV === 'production') {
  /**
   * This implementation is not working with HMR
   */
  useValueImpl = (getValue) => {
    const valueRef = useRef<any | null>(null);

    if (!valueRef.current) {
      valueRef.current = getValue();
    }

    return valueRef.current;
  };
} else {
  /**
   * This is might be helpful for better HMR Vite
   */
  useValueImpl = (getValue) => {
    return useMemo(getValue, []);
  };
}

/**
 * This hook accept `getValue` function and returns it result.
 *
 * `getValue` _should_ executes **ONLY ONCE**.
 * But in HMR it can executes more than 1 time
 *
 * @example
 * ```
 * const num = useValue(() => 1); // 1
 * ```
 */
export const useValue = useValueImpl;

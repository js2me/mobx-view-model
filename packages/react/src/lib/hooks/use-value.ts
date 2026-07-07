import { useRef } from 'react';
import type { AnyObject } from 'yummies/types';

type UseValueHook = <TValue extends AnyObject>(
  getValue: () => TValue,
) => TValue;

/**
 * This hook accept `getValue` function and returns it result.
 *
 * `getValue` _should_ executes **ONLY ONCE**.
 * But in HMR it can executes more than 1 time
 *
 * Previously, the dev mode used `useMemo(getValue, [])` for better HMR support,
 * but React 19 may "forget" memoized values and recompute `useMemo` on re-render.
 * This caused an infinite loop: new VM instance → `attach()` modifies MobX
 * observables → `observer` re-renders → `useMemo` recomputes → new VM → repeat.
 * Using `useRef` is guaranteed to be stable across re-renders, breaking the cycle.
 *
 * @example
 * ```
 * const num = useValue(() => 1); // 1
 * ```
 */
export const useValue: UseValueHook = (getValue) => {
  const valueRef = useRef<AnyObject | null>(null);

  if (!valueRef.current) {
    valueRef.current = getValue();
  }

  return valueRef.current as ReturnType<typeof getValue>;
};

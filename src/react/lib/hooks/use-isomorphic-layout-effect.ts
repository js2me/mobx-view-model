import { useEffect, useLayoutEffect } from 'react';

/**
 * On the **client**, this is `useLayoutEffect` (runs before paint). That is not
 * redundant: attach/detach still run here after the synchronous first-pass attach
 * so clean-up and async `attach()` stay correct. On the **server**, React maps
 * this to `useEffect` only to avoid `useLayoutEffect` warnings; neither hook runs
 * during SSR.
 */
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

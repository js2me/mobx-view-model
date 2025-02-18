import { useEffect, useLayoutEffect } from 'react';

export const useIsomorphicLayoutEffect =
  // eslint-disable-next-line unicorn/prefer-global-this
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

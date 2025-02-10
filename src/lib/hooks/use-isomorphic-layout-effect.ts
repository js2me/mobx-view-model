import { useEffect, useLayoutEffect } from 'react';

export const useIsomorphicLayoutEffect =
  typeof globalThis === 'undefined' ? useEffect : useLayoutEffect;

'use client';

import { useContext } from 'react';
import { RootStoreContext } from '../context';
import type { RootStore } from '..';
import { assert } from 'yummies/assert';

export function useRootStore(): RootStore {
  const store = useContext(RootStoreContext);
  assert.defined(
    store,
    'useRootStore must be used within RootStoreProvider',
  );
  return store;
}

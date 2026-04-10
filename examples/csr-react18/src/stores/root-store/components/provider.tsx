import { ViewModelsProvider } from 'mobx-view-model';
import type { ReactNode } from 'react';
import type { RootStore } from '../index.js';
import { RootStoreContext } from '../context.js';

export function RootStoreProvider({
  store,
  children,
}: {
  store: RootStore;
  children: ReactNode;
}) {
  return (
    <RootStoreContext.Provider value={store}>
      <ViewModelsProvider value={store.viewModels}>{children}</ViewModelsProvider>
    </RootStoreContext.Provider>
  );
}

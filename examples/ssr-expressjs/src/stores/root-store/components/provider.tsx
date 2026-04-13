import { ViewModelsProvider } from 'mobx-view-model';
import type { ReactNode } from 'react';
import { RootStoreContext } from '../context.js';
import type { RootStore } from '../index.js';

export type RootStoreProviderProps = {
  store: RootStore;
  children: ReactNode;
};

export function RootStoreProvider({ store, children }: RootStoreProviderProps) {
  return (
    <RootStoreContext.Provider value={store}>
      <ViewModelsProvider value={store.viewModels}>
        {children}
      </ViewModelsProvider>
    </RootStoreContext.Provider>
  );
}

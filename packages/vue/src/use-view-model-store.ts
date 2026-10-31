import type { ViewModelStore } from 'mobx-view-model';
import { inject, provide } from 'vue';
import { ViewModelsKey } from './injection-keys.js';

export const provideViewModelsStore = (store: ViewModelStore) => {
  provide(ViewModelsKey, store);
  return store;
};

export const useViewModelsStore = () => inject(ViewModelsKey, null);

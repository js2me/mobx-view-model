import { inject, provide } from 'vue';
import type { ViewModelStore } from '../view-model/index.js';
import { ViewModelsKey } from './injection-keys.js';

export const provideViewModelsStore = (store: ViewModelStore) => {
  provide(ViewModelsKey, store);
  return store;
};

export const useViewModelsStore = () =>
  inject(ViewModelsKey, null as unknown as ViewModelStore);

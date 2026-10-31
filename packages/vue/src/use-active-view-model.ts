import type { AnyViewModel, AnyViewModelSimple } from 'mobx-view-model';
import { inject, provide } from 'vue';
import { ActiveViewModelKey } from './injection-keys.js';

export const provideActiveViewModel = (
  model: AnyViewModel | AnyViewModelSimple | null,
) => {
  provide(ActiveViewModelKey, model);
  return model;
};

export const useActiveViewModel = () =>
  inject(ActiveViewModelKey, null as AnyViewModel | AnyViewModelSimple | null);

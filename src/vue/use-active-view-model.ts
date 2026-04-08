import { inject, provide } from 'vue';
import type { AnyViewModel, AnyViewModelSimple } from '../view-model/index.js';
import { ActiveViewModelKey } from './injection-keys.js';

export const provideActiveViewModel = (
  model: AnyViewModel | AnyViewModelSimple | null,
) => {
  if (model) {
    provide(ActiveViewModelKey, model);
  }
  return model;
};

export const useActiveViewModel = () =>
  inject(ActiveViewModelKey, null as AnyViewModel | AnyViewModelSimple | null);

import type { InjectionKey } from 'vue';
import type { AnyViewModel, AnyViewModelSimple } from '../view-model/index.js';
import type { ViewModelStore } from '../view-model/view-model.store.js';

export const ViewModelsKey: InjectionKey<ViewModelStore> =
  Symbol('ViewModelsStore');
export const ActiveViewModelKey: InjectionKey<
  AnyViewModel | AnyViewModelSimple | null
> = Symbol('ActiveViewModel');

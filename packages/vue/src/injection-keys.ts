import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';
import type { InjectionKey } from 'vue';

export const ViewModelsKey: InjectionKey<ViewModelStore | null> =
  Symbol('ViewModelsStore');
export const ActiveViewModelKey: InjectionKey<
  AnyViewModel | AnyViewModelSimple | null
> = Symbol('ActiveViewModel');

export const ViewModelsContext = ViewModelsKey;
export const ActiveViewModelContext = ActiveViewModelKey;

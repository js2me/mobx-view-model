import type { AnyViewModel, AnyViewModelSimple } from 'mobx-view-model';
import { createContext } from 'solid-js';

/** Contains the active (parent) view model for nested VMs. */
export const ActiveViewModelContext = createContext<
  AnyViewModel | AnyViewModelSimple
>(null as any);

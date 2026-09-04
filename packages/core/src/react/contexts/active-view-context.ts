import type { AnyViewModel, AnyViewModelSimple } from '../../core.js';
import { createContext } from 'react';

declare const globalThis: any

globalThis[Symbol.for('mobx-view-model/active-vm')] ??= createContext<
  AnyViewModel | AnyViewModelSimple
>(null as any); 

// will contains the view model
export const ActiveViewModelContext: React.Context<AnyViewModelSimple | AnyViewModel> =
  globalThis[Symbol.for('mobx-view-model/active-vm')]

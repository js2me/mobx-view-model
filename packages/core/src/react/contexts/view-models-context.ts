import type { ViewModelStore } from '../../core.js';
import { createContext } from 'react';


declare const globalThis: any

globalThis[Symbol.for('mobx-view-model/vms')] ??= createContext<ViewModelStore>(null as any); 

/**
 * Context which contains the view models store instance.
 * This context is used to access the view models store inside the React components.
 * @see {@link ViewModelStore}
 */
export const ViewModelsContext: React.Context<ViewModelStore> =
  globalThis[Symbol.for('mobx-view-model/vms')]

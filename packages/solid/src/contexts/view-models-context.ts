import type { ViewModelStore } from 'mobx-view-model';
import { createContext } from 'solid-js';

/**
 * Context which contains the view models store instance.
 * This context is used to access the view models store inside Solid components.
 * @see {@link ViewModelStore}
 */
export const ViewModelsContext = createContext<ViewModelStore>(
  null as unknown as ViewModelStore,
);

import { createContext } from 'react';

import { ViewModelStore } from '../view-model/index.js';

/**
 * Context which contains the view models store instance.
 * This context is used to access the view models store inside the React components.
 * @see {@link ViewModelStore}
 */
export const ViewModelsContext = createContext<ViewModelStore>(
  null as unknown as ViewModelStore,
);

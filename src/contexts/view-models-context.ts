import { createContext } from 'react';

import { ViewModelStore } from '../view-model/index.js';

export const ViewModelsContext = createContext<ViewModelStore>(
  null as unknown as ViewModelStore,
);

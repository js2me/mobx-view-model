import { createContext } from 'react';

import { AnyViewModel } from '../view-model/index.js';

// will contains the view model
export const ActiveViewModelContext = createContext<AnyViewModel>(null as any);

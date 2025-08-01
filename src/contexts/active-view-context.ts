import { createContext } from 'react';

import { AnyViewModel, AnyViewModelSimple } from '../view-model/index.js';

// will contains the view model
export const ActiveViewModelContext = createContext<
  AnyViewModel | AnyViewModelSimple
>(null as any);

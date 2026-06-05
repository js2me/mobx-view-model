import type { AnyViewModel, AnyViewModelSimple } from 'mobx-view-model';
import { createContext } from 'react';

// will contains the view model
export const ActiveViewModelContext = createContext<
  AnyViewModel | AnyViewModelSimple
>(null as any);

if (process.env.NODE_ENV !== 'production') {
  ActiveViewModelContext.displayName = 'ActiveViewModelContext';
}

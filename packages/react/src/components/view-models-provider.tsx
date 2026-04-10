import type { ViewModelStore } from 'mobx-view-model';
import { ViewModelsContext } from '../contexts/index.js';

export const ViewModelsProvider =
  ViewModelsContext.Provider as unknown as React.ComponentType<{
    value: ViewModelStore;
    children?: React.ReactNode;
  }>;

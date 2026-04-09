import type { ViewModelStore } from 'mobx-view-model';
import type { ReactNode } from 'react';
import { ViewModelsContext } from '../contexts/index.js';

export const ViewModelsProvider =
  ViewModelsContext.Provider as unknown as React.ComponentType<{
    value: ViewModelStore;
    children?: ReactNode;
  }>;

import type { ReactNode } from 'react';
import { ViewModelsContext } from '../contexts/index.js';
import type { ViewModelStore } from '../view-model/index.js';

export const ViewModelsProvider =
  ViewModelsContext.Provider as unknown as React.ComponentType<{
    value: ViewModelStore;
    children?: ReactNode;
  }>;

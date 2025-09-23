import type { ComponentType, ReactNode } from 'react';
import { ViewModelsContext } from '../contexts/index.js';
import type { ViewModelStore } from '../view-model/index.js';

export const ViewModelsProvider =
  ViewModelsContext.Provider as unknown as ComponentType<{
    value: ViewModelStore;
    children?: ReactNode;
  }>;

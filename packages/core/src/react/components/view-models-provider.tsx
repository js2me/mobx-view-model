import type { ViewModelStore } from 'mobx-view-model/core';
import { ViewModelsContext } from 'mobx-view-model/react';

export const ViewModelsProvider =
  ViewModelsContext.Provider as unknown as React.ComponentType<{
    value: ViewModelStore;
    children?: React.ReactNode;
  }>;

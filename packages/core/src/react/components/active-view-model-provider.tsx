import type { AnyViewModel, AnyViewModelSimple } from 'mobx-view-model/core';
import { ActiveViewModelContext } from 'mobx-view-model/react';

/**
 * This is a provider for the `ActiveViewModelContext`.
 * This HOC is not recommended for public usage.
 * Better to use `withViewModel` HOC.
 */
export const ActiveViewModelProvider =
  ActiveViewModelContext.Provider as unknown as React.ComponentType<{
    value: AnyViewModel | AnyViewModelSimple;
    children?: React.ReactNode;   
  }>;

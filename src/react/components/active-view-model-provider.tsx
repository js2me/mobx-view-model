import type { ReactNode } from 'react';
import type {
  AnyViewModel,
  AnyViewModelSimple,
} from '../../view-model/index.js';
import { ActiveViewModelContext } from '../contexts/index.js';

/**
 * This is a provider for the `ActiveViewModelContext`.
 * This HOC is not recommended for public usage.
 * Better to use `withViewModel` HOC.
 */
export const ActiveViewModelProvider =
  ActiveViewModelContext.Provider as unknown as React.ComponentType<{
    value: AnyViewModel | AnyViewModelSimple;
    children?: ReactNode;
  }>;

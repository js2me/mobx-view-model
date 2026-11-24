import type { ViewModelStore } from 'mobx-view-model';
import { sharedContext } from './shared-context.js';

/**
 * Context which contains the view models store instance.
 * This context is used to access the view models store inside the React components.
 * @see {@link ViewModelStore}
 */
export const ViewModelsContext = sharedContext<ViewModelStore>('vms-ctx');

if (process.env.NODE_ENV !== 'production') {
  ViewModelsContext.displayName = 'ViewModels';
}

import type { AnyViewModel, AnyViewModelSimple } from 'mobx-view-model';
import { sharedContext } from './shared-context.js';

export const ActiveViewModelContext = sharedContext<AnyViewModel | AnyViewModelSimple>('avm-ctx');

if (process.env.NODE_ENV !== 'production') {
  ActiveViewModelContext.displayName = 'ActiveViewModel';
}

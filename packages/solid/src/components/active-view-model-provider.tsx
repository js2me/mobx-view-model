import type { AnyViewModel, AnyViewModelSimple } from 'mobx-view-model';
import type { ParentComponent } from 'solid-js';
import { ActiveViewModelContext } from '../contexts/index.js';

/**
 * Provider for `ActiveViewModelContext`.
 * Not recommended for public usage — prefer `withViewModel`.
 */
export const ActiveViewModelProvider: ParentComponent<{
  value: AnyViewModel | AnyViewModelSimple;
}> = (props) => (
  <ActiveViewModelContext.Provider value={props.value}>
    {props.children}
  </ActiveViewModelContext.Provider>
);

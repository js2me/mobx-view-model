import type { ViewModelStore } from 'mobx-view-model';
import type { ParentComponent } from 'solid-js';
import { ViewModelsContext } from '../contexts/index.js';

export const ViewModelsProvider: ParentComponent<{
  value: ViewModelStore;
}> = (props) => (
  <ViewModelsContext.Provider value={props.value}>
    {props.children}
  </ViewModelsContext.Provider>
);

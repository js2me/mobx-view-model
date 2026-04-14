import type { ViewModelStore } from 'mobx-view-model';
import { ViewModelsContext } from '../contexts/index.js';
 
import { RComponentType, RReactNode } from "../lib/react-types.js";

export const ViewModelsProvider =
  ViewModelsContext.Provider as unknown as RComponentType<{
    value: ViewModelStore;
    children?: RReactNode;
  }>;

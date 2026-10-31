import type { ViewModelStoreBase } from 'mobx-view-model';
import type { AnyObject } from 'yummies/types';
import type { DevtoolsTheme } from './devtools-settings-storage';

export type ViewModelDevtoolsPresentationMode = 'tree' | 'list';
export type ViewModelDevtoolsSortPropertiesBy = 'asc' | 'desc' | 'none';
export type DevtoolsPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-left'
  | 'bottom-right';

export interface ViewModelDevtoolsDisplayConfig {
  presentationMode?: ViewModelDevtoolsPresentationMode;
  sortPropertiesBy?: ViewModelDevtoolsSortPropertiesBy;
  theme?: DevtoolsTheme;
  showInternals?: boolean;
  highlightUpdates?: boolean;
}

export interface ViewModelDevtoolsConfig {
  containerId?: string;
  defaultIsOpened?: boolean;
  viewModels?: ViewModelStoreBase;
  position?: DevtoolsPosition;
  buttonClassName?: string;
  extras?: AnyObject;
  display?: ViewModelDevtoolsDisplayConfig;
}

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

/** Version-neutral public API; VM enumeration reads the protected runtime map. */
export interface ViewModelStoreSource {
  getIds(lookup: string): string[];
  get(lookup: string): unknown;
}

export interface ViewModelDevtoolsConfig {
  containerId?: string;
  defaultIsOpened?: boolean;
  viewModels?: ViewModelStoreSource;
  position?: DevtoolsPosition;
  buttonClassName?: string;
  extras?: AnyObject;
  display?: ViewModelDevtoolsDisplayConfig;
}

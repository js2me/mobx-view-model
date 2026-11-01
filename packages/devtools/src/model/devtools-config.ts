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
  groupViewModelBaseMembers?: boolean;
  highlightUpdates?: boolean;
}

/**
 * Public lookup surface shared by core 8–11.
 * The instance must also retain its runtime `viewModels` collection, whose
 * `values()` returns an iterable. Core declares this member protected, so it
 * cannot appear here without rejecting legacy stores. Connections validate
 * this runtime requirement and reject unsupported objects with a TypeError.
 */
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

export interface MobxVmVitePluginOptions {
  /** Enable smart HMR for ViewModel classes (default: true) */
  hmr?: boolean;
  /** Auto-inject displayName for observer() components in dev (default: true) */
  autoDisplayName?: boolean;
  /** Auto-connect mobx-view-model-devtools (default: false) */
  devtools?: boolean | DevtoolsConfig;
  /**
   * Package sources to detect observer() calls from.
   * Defaults to ['mobx-react-lite', 'mobx-react'].
   */
  observerSources?: string[];
  /** Enable debug logging for detections (default: false) */
  debug?: boolean;
}

export interface DevtoolsConfig {
  /** Popup position (default: "top-right") */
  position?: 'top-right' | 'top-left' | 'bottom-left' | 'bottom-right';
  /** Whether the devtools panel starts open (default: false) */
  defaultIsOpened?: boolean;
}

export interface VMClassInfo {
  /** The class name, e.g. "CounterVM" */
  name: string;
  /** How the class is recognized */
  type: 'ViewModelBase' | 'ViewModel' | 'ViewModelSimple';
  /** How the class is exported: "named" | "default" */
  exportType: 'named' | 'default';
}

export interface VMUsageInfo {
  /** The class name being used, e.g. "CounterVM" */
  vmClassName: string;
  /** How it's being used */
  usageType: 'useViewModel' | 'withViewModel' | 'useCreateViewModel';
}

export interface ObserverCallInfo {
  /** Start index of the `const/var/let Name = observer(` match */
  start: number;
  /** End index of the full statement (after closing `)` and `;`) */
  statementEnd: number;
  /** The variable name assigned to the observer result */
  varName: string;
  /** Whether the variable is exported */
  isExported: boolean;
}

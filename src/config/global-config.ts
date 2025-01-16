import { ViewModelsConfig } from './types.js';

const accessSymbol = Symbol();

const defaultViewModelsConfig: ViewModelsConfig = {
  startViewTransitions: {
    mount: false,
    payloadChange: false,
    unmount: false,
  },
};

const _globalThis = globalThis as typeof globalThis & {
  [accessSymbol]?: ViewModelsConfig;
};

if (!_globalThis[accessSymbol]) {
  _globalThis[accessSymbol] = defaultViewModelsConfig;
}

/**
 * Global configuration options for view models
 */
export const viewModelsConfig: ViewModelsConfig = _globalThis[accessSymbol];

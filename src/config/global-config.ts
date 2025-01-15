import { ViewModelsConfig } from './types';

const accessSymbol = Symbol();

const _globalThis = globalThis as typeof globalThis & {
  [accessSymbol]?: ViewModelsConfig;
};

if (!_globalThis[accessSymbol]) {
  _globalThis[accessSymbol] = {
    startViewTransitions: {
      mount: false,
      payloadChange: false,
      unmount: false,
    },
  };
}

/**
 * Global configuration options for view models
 */
export const viewModelsConfig: ViewModelsConfig = _globalThis[accessSymbol];

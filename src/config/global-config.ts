import { ViewModelsConfig } from './types';

const accessSymbol = Symbol();

const _globalThis = globalThis as typeof globalThis & {
  [accessSymbol]?: ViewModelsConfig;
};

if (!_globalThis[accessSymbol]) {
  _globalThis[accessSymbol] = {
    enableStartViewTransitions: false,
  };
}

export const viewModelsConfig: ViewModelsConfig = _globalThis[accessSymbol];

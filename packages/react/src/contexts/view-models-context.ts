import { _internals, ViewModelStore } from 'mobx-view-model';
import { createContext } from 'react';

const symbol = Symbol.for(`${_internals.key}/react/vms-ctx`);

type Context = ReturnType<typeof createContext<ViewModelStore>>

declare const globalThis: { [symbol]?: Context }

globalThis[symbol] ??= createContext(null as any);

/**
 * Context which contains the view models store instance.
 * This context is used to access the view models store inside the React components.
 * @see {@link ViewModelStore}
 */
export const ViewModelsContext = globalThis[symbol]

if (process.env.NODE_ENV !== 'production') {
  ViewModelsContext.displayName = 'ViewModels';
}

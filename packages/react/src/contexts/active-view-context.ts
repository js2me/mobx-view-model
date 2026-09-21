import { _internals, type AnyViewModel, type AnyViewModelSimple } from 'mobx-view-model';
import { createContext } from 'react';

const symbol = Symbol.for(`${_internals.key}/avm-ctx`);

type Context = ReturnType<typeof createContext<AnyViewModel | AnyViewModelSimple>>

declare const globalThis: { [symbol]?: Context }

globalThis[symbol] ??= createContext(null as any);

// will contains the view model
export const ActiveViewModelContext = globalThis[symbol];

if (process.env.NODE_ENV !== 'production') {
  ActiveViewModelContext.displayName = 'ActiveViewModel';
}
import { _internals, type AnyViewModel, type AnyViewModelSimple } from 'mobx-view-model';
import { createContext } from 'solid-js';

const symbol = Symbol.for(`${_internals.key}/solid/avm-ctx`);

type Context = ReturnType<typeof createContext<AnyViewModel | AnyViewModelSimple>>;

declare const globalThis: { [symbol]?: Context }

/** Contains the active (parent) view model for nested VMs. */
globalThis[symbol] ??= createContext(null as any) as Context;

export const ActiveViewModelContext = globalThis[symbol];

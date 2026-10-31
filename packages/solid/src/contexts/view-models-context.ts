import { _internals, type ViewModelStore } from 'mobx-view-model';
import { createContext } from 'solid-js';

const symbol = Symbol.for(`${_internals.key}/solid/vms-ctx`);

type Context = ReturnType<
  typeof createContext<ViewModelStore>
>

declare const globalThis: { [symbol]?: Context }

globalThis[symbol] ??= createContext<ViewModelStore>(null as any) as Context;

/**
 * Context which contains the view models store instance.
 * This context is used to access the view models store inside Solid components.
 * @see {@link ViewModelStore}
 */
export const ViewModelsContext = globalThis[symbol];

import { _internals } from 'mobx-view-model';
import { createContext, type Context } from 'react';

export function sharedContext<T>(suffix: string): Context<T> {
  const key = Symbol.for(`${_internals.key}/react/${suffix}`);
  const contexts = globalThis as Record<symbol, Context<T>>;
  return contexts[key] ??= createContext<T>(null!);
}

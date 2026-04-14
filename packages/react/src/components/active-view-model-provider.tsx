import type { AnyViewModel, AnyViewModelSimple } from 'mobx-view-model';
import { ActiveViewModelContext } from '../contexts/index.js';
import { RComponentType, RReactNode } from "../lib/react-types.js";

/**
 * This is a provider for the `ActiveViewModelContext`.
 * This HOC is not recommended for public usage.
 * Better to use `withViewModel` HOC.
 */
export const ActiveViewModelProvider =
  ActiveViewModelContext.Provider as unknown as RComponentType<{
    value: AnyViewModel | AnyViewModelSimple;
    children?: RReactNode;
  }>;

import {
  type AnyViewModel,
  type AnyViewModelSimple,
  viewModelsConfig,
} from 'mobx-view-model';
import { getCurrentInstance } from 'vue';

/** Preserve SSR content until this component's client model finishes mounting. */
export const useRenderAllowed = (model: AnyViewModel | AnyViewModelSimple) => {
  // Vue assigns vnode.el before setup when hydrating an existing DOM node.
  let preservingHydration =
    viewModelsConfig.mode === 'ssr' && getCurrentInstance()?.vnode.el != null;
  return () => {
    const mounted = (model as AnyViewModel).isMounted !== false;
    if (mounted) preservingHydration = false;
    return mounted || preservingHydration;
  };
};

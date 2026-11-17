import type { ComponentInternalInstance, InjectionKey } from 'vue';
import { getCurrentInstance, inject, provide } from 'vue';

type ReadDependency = () => unknown;
const inheritedDependency: InjectionKey<ReadDependency> =
  Symbol('RenderDependency');
const dependencies = new WeakMap<
  ComponentInternalInstance,
  Set<ReadDependency>
>();

/** Register reactive reads used by this component's observed render. */
export const useRenderDependency = (read: ReadDependency) => {
  const instance = getCurrentInstance();
  if (!instance) return;
  let reads = dependencies.get(instance);
  if (!reads) {
    reads = new Set();
    dependencies.set(instance, reads);
  }
  reads.add(read);
};

/** Supply a reactive dependency to observed descendant views. */
export const provideRenderDependency = (read: ReadDependency) =>
  provide(inheritedDependency, read);

export const useRenderDependencies = () => {
  const instance = getCurrentInstance();
  const inherited = inject(inheritedDependency, null);
  return () => {
    inherited?.();
    if (instance) for (const read of dependencies.get(instance) ?? []) read();
  };
};

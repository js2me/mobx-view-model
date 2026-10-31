import type { ComponentInternalInstance, InjectionKey, Ref } from 'vue';
import { getCurrentInstance, shallowRef } from 'vue';

const revisions = new WeakMap<object, Ref<number>>();
const owners = new WeakMap<ComponentInternalInstance, Set<Ref<number>>>();
export const ModelRevisionKey: InjectionKey<Ref<number>> =
  Symbol('ModelRevision');

export const getModelRevision = (model: object) => {
  let revision = revisions.get(model);
  if (!revision) {
    revision = shallowRef(0);
    revisions.set(model, revision);
  }
  return revision;
};

export const registerModelRevision = (model: object) => {
  const revision = getModelRevision(model);
  const instance = getCurrentInstance();
  if (instance) {
    let refs = owners.get(instance);
    if (!refs) {
      refs = new Set();
      owners.set(instance, refs);
    }
    refs.add(revision);
  }
  return revision;
};

export const trackModelRevisions = (
  instance: ComponentInternalInstance | null,
) => {
  if (instance)
    for (const revision of owners.get(instance) ?? []) void revision.value;
};

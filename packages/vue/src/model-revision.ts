import type { Ref } from 'vue';
import { shallowRef } from 'vue';
import { useRenderDependency } from './render-dependencies.js';

// Plain simple models need a Vue signal when setPayload changes their fields.
const revisions = new WeakMap<object, Ref<number>>();
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
  useRenderDependency(() => revision.value);
  return revision;
};

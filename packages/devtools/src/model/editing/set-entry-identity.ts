import { action, makeObservable, observable } from 'mobx';
import type { SetLike } from '../inspection/mobx-collection';

let nextEntryId = 0;
const registries = new WeakMap<object, Map<unknown, SetEntryIdentity>>();

/** A Set row follows its value, independently of the value's insertion index. */
export class SetEntryIdentity {
  readonly id = nextEntryId++;

  constructor(
    public value: unknown,
    private readonly registry: Map<unknown, SetEntryIdentity>,
  ) {
    makeObservable(this, { value: observable.ref, rebind: action });
  }

  rebind(value: unknown) {
    if (this.registry.get(this.value) === this)
      this.registry.delete(this.value);
    this.value = value;
    // Editing to an existing member merges rows, just as Set merges values.
    if (!this.registry.has(value)) this.registry.set(value, this);
  }
}

export function getSetEntryIdentities(parent: object, set: SetLike) {
  let registry = registries.get(parent);
  if (!registry) {
    registry = new Map();
    registries.set(parent, registry);
  }
  const active = new Set(set.values());
  for (const value of registry.keys()) {
    if (!active.has(value)) registry.delete(value);
  }
  return [...active].map((value) => {
    let entry = registry.get(value);
    if (!entry) {
      entry = new SetEntryIdentity(value, registry);
      registry.set(value, entry);
    }
    return entry;
  });
}

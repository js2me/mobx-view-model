import { action, computed, makeObservable, observable } from 'mobx';
import { getCollectionKind } from '../inspection/collection-like';

let nextEntryId = 0;
const registries = new WeakMap<object, SetEntryRegistry>();
type SetOwner = { readonly data: unknown };

/** One reactive snapshot is shared by every row; it suspends with the UI. */
class SetEntryRegistry {
  readonly entries = new Map<unknown, SetEntryIdentity>();
  readonly snapshot = computed(() => {
    const data = this.parent.data;
    const values =
      getCollectionKind(data) === 'set'
        ? [...(data as Set<unknown>).values()]
        : [];
    return {
      values,
      indexes: new Map(values.map((value, index) => [value, index])),
    };
  });
  constructor(readonly parent: SetOwner) {}
}

/** A Set row follows its value, independently of the value's insertion index. */
export class SetEntryIdentity {
  readonly id = nextEntryId++;
  constructor(
    public value: unknown,
    private readonly registry: SetEntryRegistry,
  ) {
    makeObservable(this, { value: observable.ref, rebind: action });
  }
  get index() {
    return this.registry.snapshot.get().indexes.get(this.value);
  }
  rebind(value: unknown) {
    if (this.registry.entries.get(this.value) === this)
      this.registry.entries.delete(this.value);
    this.value = value;
    if (!this.registry.entries.has(value))
      this.registry.entries.set(value, this);
  }
}

export function getSetEntryIdentities(parent: SetOwner) {
  let registry = registries.get(parent);
  if (!registry) {
    registry = new SetEntryRegistry(parent);
    registries.set(parent, registry);
  }
  const { values, indexes } = registry.snapshot.get();
  for (const value of registry.entries.keys()) {
    if (!indexes.has(value)) registry.entries.delete(value);
  }
  return values.map((value) => {
    let entry = registry.entries.get(value);
    if (!entry) {
      entry = new SetEntryIdentity(value, registry);
      registry.entries.set(value, entry);
    }
    return entry;
  });
}

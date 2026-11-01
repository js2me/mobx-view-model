import { ListItem } from './list-item';
import { PropertyListItem } from './property-list-item';
import type { VMListItem } from './vm-list-item';

/** A visual group: properties keep their original owner, paths and watch keys. */
export class VMPropertiesListItem extends ListItem<undefined> {
  get parentListItem() {
    return this.owner;
  }

  get depth() {
    return this.owner.depth + 1;
  }

  get children() {
    return this.owner.basePropertyKeys.map((property, order) =>
      PropertyListItem.create(
        this.inspector,
        property,
        property,
        order,
        this.owner,
      ),
    );
  }

  private constructor(private readonly owner: VMListItem) {
    super(
      owner.inspector,
      VMPropertiesListItem.createKey(owner.key),
      undefined,
    );
  }

  static createKey(ownerKey: string) {
    return `${ownerKey}/vm-properties`;
  }

  static create(owner: VMListItem) {
    const key = VMPropertiesListItem.createKey(owner.key);
    const cached = owner.cache.get(key);
    if (cached instanceof VMPropertiesListItem && cached.owner === owner)
      return cached;
    const item = new VMPropertiesListItem(owner);
    owner.cache.set(key, item);
    return item;
  }
}
